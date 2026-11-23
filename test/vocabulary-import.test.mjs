import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createHandler, normalizeWords } from '../supabase/functions/import-vocabulary/handler.mjs'

const token = 'fixture-token-for-tests-only-32-bytes'
const fingerprint = 'a'.repeat(64)
const source = 'TERE! sõnastik, page 20'
const words = [{ estonian: 'koer', russian: 'собака', emoji: '🐕', source, status: 'draft' }]

function fixture() {
  const calls = []
  let time = 1_000_000
  let stale = false
  const handler = createHandler({
    token, url: 'https://supabase.test', serviceKey: 'fixture-service-role',
    now: () => time,
    fetcher: async (url, init) => {
      assert.equal(url, 'https://supabase.test/rest/v1/rpc/import_vocabulary_batch')
      assert.equal(init.headers.apikey, 'fixture-service-role')
      const body = JSON.parse(init.body)
      calls.push(body)
      if (stale) return Response.json({ status: 'stale' })
      return Response.json({
        status: body.p_expected ? 'committed' : 'preview', fingerprint, new_words: 1,
        existing_words: 0, conflicting_words: 0,
      })
    },
  })
  const send = (data, auth = token) => handler(new Request('https://fixture.test', {
    method: 'POST', headers: { 'x-takku-import-token': auth },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  }))
  return { calls, send, expire: () => { time += 901000 }, stale: () => { stale = true } }
}

test('validates all 102 entries from the supplied page 20 SQL example', async () => {
  const sql = await readFile(new URL('../supabase/imports/tere_page20.sql', import.meta.url), 'utf8')
  const sample = JSON.parse(await readFile(new URL('./fixtures/tere_page20_words.json', import.meta.url), 'utf8'))
  assert.deepEqual(JSON.parse(sql.split('$words$')[1]),
    sample.map(({ estonian, russian, emoji }) => ({ estonian, russian, emoji })))
  const normalized = normalizeWords(sample)
  assert.equal(normalized.length, 102)
  assert.ok(normalized.every((word) => word.page === '20' && word.emojis.length === 1))
  assert.deepEqual(normalized.map((word) => word.russian), sample.map((word) => word.russian))
  const { send, calls } = fixture()
  assert.equal((await send({ mode: 'preview', words: sample })).status, 200)
  assert.equal(calls[0].p_words.length, 102)
  assert.equal(calls[0].p_expected, null)
})

test('rejects unauthorized and invalid requests before contacting the database', async () => {
  const { send, calls } = fixture()
  assert.equal((await send({}, 'incorrect')).status, 401)
  assert.equal((await send('invalid JSON')).status, 400)
  for (const bad of [
    [{ ...words[0], russian: '  ' }],
    [{ ...words[0], emoji: '🐕', emojis: ['🐱'] }],
    [words[0], { ...words[0], estonian: 'KOER' }],
    [{ ...words[0], owner: 'fake' }],
  ]) {
    const result = await send({ mode: 'preview', words: bad })
    assert.equal(result.status, 400)
    assert.match((await result.json()).error, /Запись/)
  }
  assert.equal((await send(' '.repeat(512 * 1024 + 1))).status, 413)
  assert.deepEqual(calls, [])
})

test('requires a fresh preview bound to the same normalized payload', async () => {
  const { send, calls, expire } = fixture()
  assert.equal((await send({ mode: 'commit', words })).status, 409)
  const preview = await (await send({ mode: 'preview', words })).json()
  assert.equal(preview.status, 'preview')
  assert.equal(calls[0].p_expected, null)
  assert.equal((await send({ mode: 'commit', words, confirmation: preview.confirmation + '0' })).status, 409)
  assert.equal((await send({ mode: 'commit', words: [{ ...words[0], russian: 'изменено' }],
    confirmation: preview.confirmation })).status, 409)
  assert.equal(calls.length, 1)

  const committed = await send({ mode: 'commit', words, confirmation: preview.confirmation })
  assert.equal(committed.status, 200)
  assert.equal((await committed.json()).status, 'committed')
  assert.equal(calls[1].p_expected, fingerprint)
  expire()
  assert.equal((await send({ mode: 'commit', words, confirmation: preview.confirmation })).status, 409)
  assert.equal(calls.length, 2)
})

test('asks for a fresh preview when the database snapshot has changed', async () => {
  const { send, stale } = fixture()
  const { confirmation } = await (await send({ mode: 'preview', words })).json()
  stale()
  const result = await send({ mode: 'commit', words, confirmation })
  assert.equal(result.status, 409)
  assert.match((await result.json()).error, /Данные в базе изменились/)
})
