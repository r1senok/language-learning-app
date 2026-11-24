import assert from 'node:assert/strict'
import test from 'node:test'
import { createPronunciationPlayer, pronunciationUrl } from '../src/domain/pronunciation.ts'
import { createTtsHandler } from '../supabase/functions/generate-tts/handler.mjs'

test('prepared audio keys are shared by equivalent text and independent from a TTS provider', () => {
  assert.equal(pronunciationUrl('  Ma olen o\u0303petaja. ', 'https://project.test/'),
    'https://project.test/storage/v1/object/public/takku-tts/prepared/v1/ma-olen-opetaja.mp3')
  assert.equal(pronunciationUrl('tere', 'https://project.test'), pronunciationUrl('Tere!', 'https://project.test'))
  assert.equal(pronunciationUrl('Tere?', 'https://project.test'), undefined)
  assert.equal(pronunciationUrl('Tere!'), undefined)
})

test('play is synchronous with the click and tracking stops on another phrase or media failure', () => {
  const audio = []
  const events = []
  const player = createPronunciationPlayer(() => {
    const mock = Object.assign(new EventTarget(), {
      plays: 0, paused: false, error: null,
      play() { this.plays += 1; return Promise.resolve() },
      pause() { this.paused = true },
    })
    audio.push(mock)
    return mock
  })
  player.play('audio.mp3', (state) => events.push(state))
  assert.equal(audio[0].plays, 1)
  audio[0].dispatchEvent(new Event('playing'))
  player.play('another.mp3', (state) => events.push(state))
  assert.equal(audio[0].paused, true)
  audio[1].error = { code: 4 }
  audio[1].dispatchEvent(new Event('error'))
  assert.deepEqual(events, ['loading', 'playing', 'idle', 'loading', 'missing'])
})

test('server rejects unauthenticated/arbitrary generation and reuses a distributed Storage claim', async () => {
  const adminToken = 'only-a-synthetic-example-token-1234'
  const objects = new Map()
  const speaks = []
  let release
  const waiting = new Promise((resolve) => { release = resolve })
  const config = {
    adminToken, url: 'https://project.test', serviceKey: 'mock-key', credentials: 'mock-secret',
    getToken: async () => 'mock-google-token',
    request: async (url, init = {}) => {
      if (url.startsWith('https://texttospeech')) {
        speaks.push(JSON.parse(init.body))
        await waiting
        return Response.json({ audioContent: 'SUQz' })
      }
      const key = url.split('/object/')[1]
      if (key.startsWith('info/')) return objects.has(key.slice(5)) ? Response.json({}) : Response.json({ statusCode: '404' }, { status: 400 })
      if (init.method === 'DELETE') {
        for (const lock of JSON.parse(init.body).prefixes) objects.delete(`takku-tts/${lock}`)
        return Response.json([])
      }
      if (objects.has(key)) return Response.json({ statusCode: '409', message: 'already exists' }, { status: 400 })
      assert.equal(init.headers['x-upsert'], 'false')
      objects.set(key, init.body)
      return Response.json({})
    },
  }
  const handler = createTtsHandler(config)
  const otherIsolate = createTtsHandler(config)
  const req = (id, token = adminToken) => new Request(`https://edge.test/?id=${id}`, { method: 'POST', headers: { 'x-takku-tts-token': token } })
  assert.equal((await handler(req('tere', 'bad'))).status, 401)
  assert.equal((await handler(req('constructor'))).status, 400)
  const first = handler(req('tere'))
  while (speaks.length === 0) await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal((await otherIsolate(req('tere'))).status, 409)
  release()
  assert.equal((await first).status, 201)
  assert.equal((await otherIsolate(req('tere'))).status, 200)
  assert.deepEqual(speaks, [{ input: { text: 'Tere!' }, voice: { languageCode: 'et-EE', name: 'et-EE-Standard-A' }, audioConfig: { audioEncoding: 'MP3' } }])
  assert.equal(objects.size, 1)
})
