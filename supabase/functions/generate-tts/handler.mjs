import { audioBucket, audioPath, defaultVoice, isVoice, phrases } from './catalog.ts'
import { googleAccessToken } from './google.mjs'

const reply = (status, body) => Response.json(body, { status })

async function missingObject(response) {
  if (response.status === 404) return true
  if (response.status !== 400) return false
  const error = await response.json().catch(() => ({}))
  return String(error.statusCode) === '404'
}

async function sameSecret(value, secret) {
  const hash = (text) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  const [left, right] = await Promise.all([hash(value), hash(secret)])
  let difference = 0
  new Uint8Array(left).forEach((byte, index) => { difference |= byte ^ new Uint8Array(right)[index] })
  return difference === 0
}

export function createTtsHandler({ adminToken, url, serviceKey, credentials, voice = defaultVoice,
  request = fetch, getToken = googleAccessToken }) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  const storage = `${url?.replace(/\/+$/, '')}/storage/v1/object`

  return async (req) => {
    if (req.method !== 'POST') return reply(405, { error: 'POST required' })
    if (!adminToken || adminToken.length < 32 || !url || !serviceKey || !credentials || !isVoice(voice)) {
      return reply(503, { error: 'TTS server configuration is incomplete or invalid' })
    }
    if (!await sameSecret(req.headers.get('x-takku-tts-token') ?? '', adminToken)) {
      return reply(401, { error: 'Invalid generation token' })
    }
    const id = new URL(req.url).searchParams.get('id')
    if (!id || !Object.prototype.hasOwnProperty.call(phrases, id)) {
      return reply(400, { error: 'Unknown pilot phrase', allowed: Object.keys(phrases) })
    }
    const path = audioPath(voice, id)
    const object = `${audioBucket}/${path}`
    const lock = `locks/${voice}/${id}.lock`
    const info = () => request(`${storage}/info/${object}`, { headers })
    const upload = (target, bytes, type) => request(`${storage}/${target}`, {
      method: 'POST', headers: { ...headers, 'content-type': type, 'x-upsert': 'false', 'cache-control': 'max-age=31536000' },
      body: bytes,
    })
    let locked = false
    try {
      const existing = await info()
      if (existing.ok) return reply(200, { path, state: 'cached' })
      if (!await missingObject(existing)) return reply(502, { error: 'Storage lookup failed' })

      // Storage enforces uniqueness across Edge isolates; only the lock holder calls Google.
      const claim = await upload(`${audioBucket}/${lock}`, 'generation in progress', 'text/plain')
      if (!claim.ok) {
        if ([400, 409].includes(claim.status)) {
          const body = await claim.json().catch(() => ({}))
          if (claim.status === 409 || body.statusCode === '409' || /already exists|duplicate/i.test(body.message ?? '')) {
            return reply(409, { error: 'Generation is already claimed; retry after it completes' })
          }
        }
        return reply(502, { error: 'Storage lock could not be created' })
      }
      locked = true
      const recheck = await info()
      if (recheck.ok) return reply(200, { path, state: 'cached' })
      if (!await missingObject(recheck)) return reply(502, { error: 'Storage lookup failed' })

      const token = await getToken(credentials, request)
      const synth = await request('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          input: { text: phrases[id] }, voice: { languageCode: 'et-EE', name: voice },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      })
      if (!synth.ok) return reply(502, { error: 'Google TTS rejected synthesis', googleStatus: synth.status, voice })
      const { audioContent } = await synth.json()
      if (typeof audioContent !== 'string' || !audioContent.length || audioContent.length > 1_400_000) {
        return reply(502, { error: 'Google returned invalid audio' })
      }
      const bytes = Uint8Array.from(atob(audioContent), (character) => character.charCodeAt(0))
      const uploaded = await upload(object, bytes, 'audio/mpeg')
      if (!uploaded.ok) return reply(502, { error: 'Audio could not be saved to Storage' })
      return reply(201, { path, state: 'generated' })
    } catch {
      return reply(502, { error: 'Generation failed; check the server account and connectivity' })
    } finally {
      if (locked) await request(`${storage}/${audioBucket}`, {
        method: 'DELETE', headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ prefixes: [lock] }),
      }).catch(() => {})
    }
  }
}
