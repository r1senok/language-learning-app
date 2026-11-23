import type { VocabularyEntry } from '../../domain/vocabulary/models'

function normalizeSearchText(text: string) {
  return text.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ')
}

export function filterVocabulary(
  entries: readonly VocabularyEntry[],
  query: string,
  categoryId: string | null,
) {
  const term = normalizeSearchText(query)

  return entries.filter((entry) => {
    if (categoryId && !entry.categoryIds.includes(categoryId)) return false

    return [entry.lemma, ...entry.translations.map(({ text }) => text)]
      .some((text) => normalizeSearchText(text).includes(term))
  })
}
