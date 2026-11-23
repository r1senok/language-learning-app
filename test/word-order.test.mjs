import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sortByEstonian } from '../src/domain/wordOrder.ts'

test('orders Estonian words with Õ, Ä, Ö and Ü after V and keeps the input order intact', () => {
  const input = ['ülikool', 'öö', 'õun', 'aed', 'või', 'ämber', 'zebra', 'sõna', 'šokolaad', 'taim', 'žanr']
  const words = input.map((estonian, index) => ({ estonian, russian: String(index) }))

  assert.deepEqual(sortByEstonian(words).map(({ estonian }) => estonian),
    ['aed', 'sõna', 'šokolaad', 'zebra', 'žanr', 'taim', 'või', 'õun', 'ämber', 'öö', 'ülikool'])
  assert.deepEqual(words.map(({ estonian }) => estonian), input)
})

test('keeps separate meanings of an identical spelling in their original order', () => {
  const meanings = [{ estonian: 'või', russian: 'или' }, { estonian: 'või', russian: 'масло' }]
  assert.deepEqual(sortByEstonian(meanings), meanings)
})
