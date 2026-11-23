import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { applyAnswer } from '../src/domain/learning.ts'
import { loadGuestProgress, saveGuestProgress } from '../src/services/localProgress.ts'
import { availableLearningProgress, isPersonalWord, loadPublishedCatalog, mergePublishedCatalog, preserveDormantGuestProgress, sharedCatalogWithProgress } from '../src/services/publishedCatalog.ts'
import { createSupabaseClient } from '../src/services/supabase.ts'

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

test('returns an empty published catalog and propagates load failures separately', async () => {
  assert.equal(await createSupabaseClient(), null)
  assert.equal(await createSupabaseClient('invalid-url', 'sb_publishable_example'), null)
  assert.deepEqual(await loadPublishedCatalog(makeClient(async () => response([])), bundledIds), [])
  for (const client of [
    null,
    makeClient(async () => new Response('forbidden', { status: 403 })),
    makeClient(async () => { throw new Error('offline') }),
  ]) {
    await assert.rejects(loadPublishedCatalog(client, bundledIds))
  }

  assert.deepEqual(sharedCatalogWithProgress([], guest.words), [])
  assert.deepEqual(availableLearningProgress(guest, []).queue, [words[2].id])
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
    assert.deepEqual(sharedCatalogWithProgress(catalog, merged.words).map(({ id }) => id), [1, uuid(5)])
    assert.deepEqual(merged.words.filter(isPersonalWord).map(({ id }) => id), [words[2].id])

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
    assert.ok(availableLearningProgress(restored, undefined).queue.includes(uuid(5)))
  } finally {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('guest and account see the same koer and newly published words with independent stages', async () => {
  const koer = { ...row(1), lemma: 'koer', vocabulary_translations: [{ glosses: ['собака'] }] }
  let published = [koer]
  const client = makeClient(async () => response(published))
  const personal = { ...words[2], id: uuid(30), personalId: uuid(31) }
  const guestProgress = [...guest.words, { id: uuid(1), catalogId: uuid(1), progress: 2 }]
  const accountProgress = [personal, { id: uuid(1), catalogId: uuid(1), progress: 3 }]
  const content = (entry) => [entry.id, entry.estonian, entry.russian, entry.categories]

  const initial = await loadPublishedCatalog(client, bundledIds)
  assert.deepEqual(sharedCatalogWithProgress(initial, guestProgress).map(content),
    sharedCatalogWithProgress(initial, accountProgress).map(content))
  assert.deepEqual(sharedCatalogWithProgress(initial, guestProgress).map((word) => [word.estonian, word.progress]), [['koer', 2]])
  assert.deepEqual(sharedCatalogWithProgress(initial, accountProgress).map((word) => [word.estonian, word.progress]), [['koer', 3]])

  published = [koer, { ...row(2), lemma: 'kass' }]
  const refreshed = await loadPublishedCatalog(client, bundledIds)
  for (const progress of [guestProgress, accountProgress]) {
    assert.deepEqual(sharedCatalogWithProgress(refreshed, progress).map(({ estonian }) => estonian), ['koer', 'kass'])
  }
  assert.deepEqual(guestProgress.filter(isPersonalWord), [words[2]])
  assert.deepEqual(accountProgress.filter(isPersonalWord), [personal])
})

test('dormant numeric and UUID progress stays stored after a visible answer and returns when republished', () => {
  const retired = { ...words[0], id: uuid(10), catalogId: uuid(10), progress: 1 }
  const shown = { ...words[0], id: uuid(11), catalogId: uuid(11), progress: 1 }
  const before = { words: [words[0], retired, shown], queue: [1, retired.id, shown.id] }
  const visible = availableLearningProgress(before, [shown])
  assert.deepEqual(visible.queue, [shown.id])

  const acted = applyAnswer(visible, shown.id, true)
  const saved = preserveDormantGuestProgress(before, visible, acted)
  assert.deepEqual(saved.queue, before.queue)
  assert.deepEqual(saved.words.map(({ progress }) => progress), [2, 1, 2])
  assert.deepEqual(availableLearningProgress(saved, [retired, shown]).queue, [retired.id, shown.id])
})
