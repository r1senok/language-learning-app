import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { applyAnswer } from '../src/domain/learning.ts'
import { loadGuestProgress, saveGuestProgress } from '../src/services/localProgress.ts'
import { loadPublishedCatalog, mergePublishedCatalog, wordsInDictionary } from '../src/services/publishedCatalog.ts'
import { createCatalogClient } from '../src/services/supabase.ts'

const bundledIds = new Set([1, 2])
const uuid = (n) => `01010101-0101-4101-8101-${String(n).padStart(12, '0')}`
const row = (n, legacy_id = null) => ({
  id: uuid(n), legacy_id, lemma: 'päike', part_of_speech: 'сущ.',
  grammatical_forms: { genitive: 'päikese', variants: ['päikest'], ignored: false },
  hint_emojis: ['☀️'],
  vocabulary_translations: [{ glosses: ['солнце', 'солнышко'] }],
  vocabulary_categories: [{ categories: { name: 'Природа' } }, { categories: { name: 'Небо' } }, { categories: null }],
})
const words = [
  { id: 1, estonian: 'päike', russian: 'солнце', category: 'Природа', emojis: [], progress: 2 },
  { id: 2, estonian: 'tere', russian: 'привет', category: 'Общение', emojis: [], progress: 0 },
  { id: 1700000000000, estonian: 'oma', russian: 'свой', category: 'Общение', emojis: [], progress: 1 },
]
const guest = { words, queue: [words[2].id, 1] }
const response = (rows) => Response.json(rows)
const makeClient = (fetch) => createClient('https://takku.test', 'sb_publishable_example', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch },
})

test('loads only the published ET–RU catalog and maps glossary data and word IDs', async () => {
  const client = makeClient(async (request, init) => {
    const url = new URL(request)
    assert.equal(init.method, 'GET')
    assert.equal(url.pathname, '/rest/v1/vocabulary_entries')
    assert.equal(url.searchParams.get('is_published'), 'eq.true')
    assert.equal(url.searchParams.get('language_code'), 'eq.et')
    assert.equal(url.searchParams.get('vocabulary_translations.language_code'), 'eq.ru')
    assert.equal(url.searchParams.get('vocabulary_categories.categories.is_published'), 'eq.true')
    assert.match(url.searchParams.get('select'), /vocabulary_translations!inner\(glosses\).*vocabulary_categories\(categories\(name\)\)/)
    return response([row(1, 1), row(2), row(3, 1700000000000), { ...row(4), vocabulary_translations: [{ glosses: [' '] }] }])
  })

  const result = await loadPublishedCatalog(client, bundledIds)
  assert.deepEqual(result.map(({ id }) => id), [1, uuid(2), uuid(3)])
  assert.deepEqual(result[0], {
    id: 1, catalogId: uuid(1), estonian: 'päike', russian: 'солнце, солнышко',
    emojis: ['☀️'], category: 'Небо', categories: ['Небо', 'Природа'],
    partOfSpeech: 'сущ.', forms: 'päikese, päikest', progress: 0,
  })
})

test('paginates in ID order', async () => {
  const offsets = []
  const client = makeClient(async (request) => {
    const url = new URL(request)
    assert.equal(url.searchParams.get('order'), 'id.asc')
    const offset = Number(url.searchParams.get('offset'))
    offsets.push(offset)
    return response(offset ? [row(101)] : Array.from({ length: 100 }, (_, i) => row(i)))
  })
  assert.equal((await loadPublishedCatalog(client, bundledIds)).length, 101)
  assert.deepEqual(offsets, [0, 100])
})

test('keeps the guest dictionary available for missing config, empty catalog and failed requests', async () => {
  assert.equal(await createCatalogClient(), null)
  assert.equal(await createCatalogClient('invalid-url', 'sb_publishable_example'), null)
  const clients = [
    null,
    makeClient(async () => response([])),
    makeClient(async () => new Response('forbidden', { status: 403 })),
    makeClient(async () => { throw new Error('offline') }),
  ]
  for (const client of clients) {
    const catalog = await loadPublishedCatalog(client, bundledIds)
    assert.deepEqual(catalog, [])
    assert.equal(mergePublishedCatalog(guest, catalog), guest)
    assert.deepEqual(wordsInDictionary(guest.words, bundledIds, null), words)
  }
})

test('retains numeric stages and personal words, restores UUID progress and queue after reload', async () => {
  const saved = new Map([['takku-estonian-v1', JSON.stringify(guest)]])
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value) },
  })

  try {
    const catalog = await loadPublishedCatalog(makeClient(async () => response([row(1, 1), row(5)])), bundledIds)
    const merged = mergePublishedCatalog(loadGuestProgress(words.slice(0, 2)), catalog)
    assert.deepEqual(merged.queue, guest.queue)
    assert.equal(merged.words.find(({ id }) => id === 1).progress, 2)
    assert.equal(merged.words.find(({ id }) => id === 1).russian, 'солнце, солнышко')
    assert.equal(merged.words.find(({ id }) => id === words[2].id).progress, 1)
    assert.deepEqual(wordsInDictionary(merged.words, bundledIds, new Set([1, uuid(5)])).map(({ id }) => id),
      [1, words[2].id, uuid(5)])

    const queued = {
      words: merged.words.map((word) => word.id === uuid(5) ? { ...word, progress: 1 } : word),
      queue: [uuid(5), ...merged.queue],
    }
    const answered = applyAnswer(queued, uuid(5), true)
    saveGuestProgress(answered)
    const restored = loadGuestProgress(words.slice(0, 2))
    assert.deepEqual(restored, answered)
    assert.equal(restored.words.find(({ id }) => id === uuid(5)).progress, 2)
    assert.deepEqual(mergePublishedCatalog(restored, catalog), restored)
    assert.ok(wordsInDictionary(restored.words, bundledIds, null).some(({ id }) => id === uuid(5)))
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})
