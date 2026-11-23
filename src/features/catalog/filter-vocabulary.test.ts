import { describe, expect, it } from 'vitest'
import { categories, demoVocabulary } from './demo-data'
import { filterVocabulary } from './filter-vocabulary'

describe('catalog filters', () => {
  it('returns the full collection for a blank query and no category', () => {
    expect(filterVocabulary(demoVocabulary, '  ', null)).toEqual(demoVocabulary)
  })

  it('matches Estonian spelling regardless of case and Unicode composition', () => {
    const entries = filterVocabulary(demoVocabulary, '  ÕU  '.normalize('NFD'), null)
    expect(entries.map(({ lemma }) => lemma)).toEqual(['õun'])
  })

  it('matches a Russian translation', () => {
    const entries = filterVocabulary(demoVocabulary, 'БИБЛИО', null)
    expect(entries.map(({ lemma }) => lemma)).toEqual(['raamatukogu'])
  })

  it('filters by topic and applies search within that topic', () => {
    const entries = filterVocabulary(demoVocabulary, '', 'food')
    expect(entries).toHaveLength(5)
    expect(entries.every(({ categoryIds }) => categoryIds.includes('food'))).toBe(true)
    expect(filterVocabulary(demoVocabulary, 'хлеб', 'food')).toHaveLength(1)
    expect(filterVocabulary(demoVocabulary, 'хлеб', 'city')).toEqual([])
  })
})

it('provides usable standalone demonstration data', () => {
  const ids = new Set(demoVocabulary.map(({ id }) => id))
  const categoryIds = new Set(categories.map(({ id }) => id))

  expect(demoVocabulary.length).toBeGreaterThanOrEqual(20)
  expect(demoVocabulary.length).toBeLessThanOrEqual(30)
  expect(ids.size).toBe(demoVocabulary.length)

  for (const entry of demoVocabulary) {
    expect(entry.languageCode).toBe('et')
    expect(entry.sources).toEqual([])
    expect(entry.hintEmojis?.length).toBeGreaterThanOrEqual(1)
    expect(entry.hintEmojis?.length).toBeLessThanOrEqual(3)
    expect(entry.translations.some(({ languageCode, text }) => languageCode === 'ru' && text.trim())).toBe(true)
    expect(entry.categoryIds.length).toBeGreaterThan(0)
    expect(entry.categoryIds.every((id) => categoryIds.has(id))).toBe(true)
  }
})
