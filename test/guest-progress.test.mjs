import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { applyAnswer } from '../src/domain/learning.ts'
import { loadGuestProgress, saveGuestProgress } from '../src/services/localProgress.ts'

const key = 'takku-estonian-v1'
const legacyKey = 'slovetto-estonian-v2'
const word = (id, progress) => ({
  id, estonian: 'tere', russian: 'привет', category: 'Общение', emojis: ['👋'], progress,
})
const starters = [word(1, 1), word(2, 2), word(3, 0)]
let storage

beforeEach(() => {
  storage = new Map()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (name) => storage.get(name) ?? null,
      setItem: (name, value) => storage.set(name, value),
    },
  })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage')
})

test('persists Know immediately and restores direction and queue', () => {
  const next = applyAnswer(loadGuestProgress(starters), 1, true)
  saveGuestProgress(next)

  assert.deepEqual(loadGuestProgress(starters), next)
  assert.equal(next.words[0].progress, 2)
  assert.deepEqual(next.queue, [2, 1])
})

test('persists Don’t Know immediately and restores forward direction', () => {
  const initial = { words: starters, queue: [2, 1] }
  const next = applyAnswer(initial, 2, false)
  saveGuestProgress(next)

  assert.deepEqual(loadGuestProgress(starters), next)
  assert.equal(next.words[1].progress, 1)
  assert.deepEqual(next.queue, [1, 2])
})

test('uses both directions before learned and keeps a lone missed word in the queue', () => {
  const initial = { words: [word(1, 1)], queue: [1] }
  const reverse = applyAnswer(initial, 1, true)
  assert.equal(reverse.words[0].progress, 2)
  assert.equal(applyAnswer(reverse, 1, false).words[0].progress, 1)
  assert.deepEqual(applyAnswer(initial, 1, false), initial)
  const learned = applyAnswer(reverse, 1, true)
  assert.equal(learned.words[0].progress, 3)
  assert.deepEqual(learned.queue, [])
  assert.equal(applyAnswer(learned, 1, false), learned)
  assert.equal(applyAnswer(initial, 2, true), initial)
})

test('keeps valid saved words and repairs malformed entries and queue IDs', () => {
  const custom = { ...word(90, 2), estonian: 'kass', russian: 'кот', forms: 'kassi' }
  storage.set(key, JSON.stringify({
    words: [null, word(1, null), word(1, 3), word(1, 0), { id: 2, progress: 1, emojis: [4, '☀️'], forms: [] }, custom, word(-1, 1), word(4, '3')],
    queue: [90, 90, '2', null, 1, -1, 4, 100],
  }))
  const recovered = loadGuestProgress(starters)
  assert.deepEqual(recovered.words.find(({ id }) => id === 1), word(1, 3))
  assert.deepEqual(recovered.words.find(({ id }) => id === 2), { ...word(2, 1), emojis: ['☀️'] })
  assert.deepEqual(recovered.words.find(({ id }) => id === 90), custom)
  assert.equal(recovered.words.find(({ id }) => id === 4).progress, 0)
  assert.deepEqual(recovered.queue, [90, 2])
})

test('reconstructs queue when an older snapshot only has words', () => {
  storage.set(key, JSON.stringify({ words: starters }))
  assert.deepEqual(loadGuestProgress(starters), { words: starters, queue: [1, 2] })
})

test('migrates a valid legacy record when current storage is empty or unreadable', () => {
  const legacy = { words: [word(1, 3), word(2, 1)], queue: [2] }
  storage.set(legacyKey, JSON.stringify(legacy))
  for (const current of [null, 'invalid JSON', '{"words":[null]}']) {
    if (current === null) storage.delete(key)
    else storage.set(key, current)
    assert.deepEqual(loadGuestProgress(starters), legacy)
    assert.deepEqual(JSON.parse(storage.get(key)), legacy)
    assert.deepEqual(JSON.parse(storage.get(legacyKey)), legacy)
  }
})

test('prefers valid current progress over legacy data', () => {
  const current = { words: [word(1, 3)], queue: [] }
  storage.set(key, JSON.stringify(current))
  storage.set(legacyKey, JSON.stringify({ words: starters, queue: [1, 2] }))
  assert.deepEqual(loadGuestProgress(starters), current)
})

test('recovers from storage exceptions and preserves readable legacy data if migration write fails', () => {
  globalThis.localStorage.getItem = () => { throw new Error('Storage denied') }
  assert.deepEqual(loadGuestProgress(starters), { words: starters, queue: [1, 2] })
  globalThis.localStorage.setItem = () => { throw new Error('Quota exceeded') }
  assert.doesNotThrow(() => saveGuestProgress({ words: starters, queue: [1, 2] }))
  const legacy = { words: [word(1, 2)], queue: [1] }
  globalThis.localStorage.getItem = (name) => name === legacyKey ? JSON.stringify(legacy) : null
  assert.deepEqual(loadGuestProgress(starters), legacy)
})

test('preserves named grammar and the legacy display string with guest progress', () => {
  const custom = {
    ...word(90, 2),
    partOfSpeech: 'noun',
    forms: 'kass, kassi',
    grammaticalForms: { nimetav: 'kass', genitive: ['kassi'] },
  }
  const progress = { words: [custom], queue: [90] }
  saveGuestProgress(progress)
  assert.deepEqual(loadGuestProgress([]), progress)
})
