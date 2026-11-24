import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterDictionary } from '../src/domain/myWords.ts'

test('search filters the published list by either language without changing order or progress', () => {
  const words = [
    { id: 'a', estonian: 'aed', russian: 'сад', progress: 1 },
    { id: 'b', estonian: 'aedõun', russian: 'садовое яблоко', progress: 0 },
    { id: 'c', estonian: 'õun', russian: 'яблоко', progress: 3 },
  ]
  assert.equal(filterDictionary(words, '  '), words)
  assert.deepEqual(filterDictionary(words, ' САД '), [words[0], words[1]])
  assert.deepEqual(filterDictionary(words, 'ÕUN'), [words[1], words[2]])
  assert.deepEqual(filterDictionary(words, 'нет совпадений'), [])
})
