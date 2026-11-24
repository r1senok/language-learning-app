import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGrammaticalForms, studyGrammarRows } from '../src/domain/grammar.ts'

test('named noun and adjective forms display in case order without invented values', () => {
  const forms = normalizeGrammaticalForms({
    partitive: ' koera ', nimetav: 'koer', omastav: 12, variants: ['alt'], nested: {},
  })
  const expected = [{ label: 'Nimetav', value: 'koer' }, { label: 'Osastav', value: 'koera' }]
  assert.deepEqual(studyGrammarRows('nimisõna', forms), expected)
  assert.deepEqual(studyGrammarRows('adjective', forms), expected)
  assert.deepEqual(studyGrammarRows('adverb', forms), [])
  assert.deepEqual(studyGrammarRows(undefined, forms), [])
})

test('verbs show only explicit verb forms and preserve documented alternatives', () => {
  const forms = normalizeGrammaticalForms({ ma_infinitive: 'lugema', present_1sg: ['loen', null, ''], genitive: 'lugemise' })
  assert.deepEqual(studyGrammarRows('verb', forms), [
    { label: 'Ma-tegevusnimi', value: 'lugema' },
    { label: 'Olevik · mina', value: 'loen' },
  ])
  assert.equal(normalizeGrammaticalForms('koer, koera, koera'), undefined)
  assert.equal(normalizeGrammaticalForms({ genitive: [''], partitive: null }), undefined)
})
