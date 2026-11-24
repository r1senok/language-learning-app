import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterMyWords, selectMyWords, sessionProgress } from '../src/domain/myWords.ts'

test('my words include personal entries and started words, ordered by Estonian', () => {
  const words = [
    { id: 'b', estonian: 'õun', russian: 'яблоко', progress: 3 },
    { id: 'a', estonian: 'aed', russian: 'сад', progress: 1 },
    { id: 'c', estonian: 'kass', russian: 'кот', progress: 0 },
    { id: 'd', estonian: 'koer', russian: 'собака', progress: 0 },
  ]
  const mine = selectMyWords(words, (word) => word.id === 'c')
  assert.deepEqual(mine.map(({ id }) => id), ['a', 'c', 'b'])
  assert.deepEqual(filterMyWords(mine, ' яб ', 'learned').map(({ id }) => id), ['b'])
  assert.deepEqual(filterMyWords(mine, 'AE', 'studying').map(({ id }) => id), ['a'])
  assert.deepEqual(filterMyWords(mine, 'кот', 'all').map(({ id }) => id), ['c'])
})

test('session progress counts an initial word once and ignores newly arriving cards', () => {
  assert.deepEqual(sessionProgress(new Set(['a', 'b']), new Set(['a', 'a', 'c'])),
    { count: 1, total: 2, percentage: 50 })
  assert.deepEqual(sessionProgress(new Set(), new Set(['a'])), { count: 0, total: 0, percentage: 0 })
})
