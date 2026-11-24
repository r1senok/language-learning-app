import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { importPreparedAudio } from '../scripts/import-prepared-audio.mjs'
import { phrases } from '../supabase/functions/_shared/audio-catalog.ts'

test('dry run reports missing files, does not write, and upload skips existing protected paths', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'takku-audio-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const existing = new Set(['takku-tts/prepared/v1/tere.mp3'])
  const writes = []
  const logs = []
  const config = {
    directory, url: 'https://project.test', key: 'sb_secret_example', report: (line) => logs.push(line),
    request: async (url, options) => {
      const path = new URL(url).pathname.split('/object/')[1]
      assert.equal(options.headers.apikey, 'sb_secret_example')
      assert.equal(options.headers.Authorization, undefined)
      if (!options.method) return existing.has(path.slice(5)) ? Response.json({}) : new Response(null, { status: 404 })
      assert.equal(options.headers['x-upsert'], 'false')
      assert.equal(options.headers['content-type'], 'audio/mpeg')
      assert.ok(!existing.has(path))
      existing.add(path)
      writes.push(path)
      return Response.json({})
    },
  }
  assert.deepEqual(await importPreparedAudio({ ...config, upload: true }), { errors: 5, uploaded: 0 })
  assert.ok(logs.some((line) => line.includes('файл отсутствует')))
  for (const id of Object.keys(phrases)) await writeFile(join(directory, `${id}.mp3`), Buffer.from('ID3fixture'))
  assert.deepEqual(await importPreparedAudio(config), { errors: 0, uploaded: 0 })
  assert.deepEqual(writes, [])
  assert.deepEqual(await importPreparedAudio({ ...config, upload: true }), { errors: 0, uploaded: 4 })
  assert.deepEqual(await importPreparedAudio({ ...config, upload: true }), { errors: 0, uploaded: 0 })
  await writeFile(join(directory, 'tere.mp3'), Buffer.from('this is not audio'))
  assert.deepEqual(await importPreparedAudio(config), { errors: 1, uploaded: 0 })
})
