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

test('nouns and adjectives show all three confirmed cases in the same order', () => {
  for (const [pos, values] of [
    ['noun', ['raamat', 'raamatu', 'raamatut']],
    ['adjective', ['suur', 'suure', 'suurt']],
  ]) {
    const [nimetav, omastav, osastav] = values
    assert.deepEqual(studyGrammarRows(pos, { osastav, nimetav, omastav }), [
      { label: 'Nimetav', value: nimetav },
      { label: 'Omastav', value: omastav },
      { label: 'Osastav', value: osastav },
    ])
  }
})

test('andma has four separate rows, with the present distinct from the imperative', () => {
  const forms = normalizeGrammaticalForms({
    imperative_2sg: 'anna', present_1sg: 'annan', da_infinitive: 'anda', ma_infinitive: 'andma',
    past_1sg: 'andsin',
  })
  assert.deepEqual(studyGrammarRows('verb', forms), [
    { label: 'Ma-tegevusnimi', value: 'andma' },
    { label: 'Da-tegevusnimi', value: 'anda' },
    { label: 'Olevik · mina', value: 'annan' },
    { label: 'Käskiv kõneviis · sina', value: 'anna' },
  ])
  assert.deepEqual(studyGrammarRows('verb', { past_1sg: 'andsin' }), [])
})

test('uninflected words and entries without verified forms have no grammar rows', () => {
  for (const pos of ['conjunction', 'adverb', 'phrase', 'interjection']) {
    assert.deepEqual(studyGrammarRows(pos, { nimetav: 'või', imperative_2sg: 'anna' }), [])
  }
  assert.deepEqual(studyGrammarRows('noun', normalizeGrammaticalForms({ nimetav: '', omastav: ' ' })), [])
  assert.deepEqual(studyGrammarRows('verb', undefined), [])
})
