import type { Word } from '../types'

export function filterDictionary(words: readonly Word[], search: string): readonly Word[] {
  const normalize = (value: string) => value.normalize('NFC').toLowerCase()
  const query = normalize(search.trim())
  if (!query) return words

  return words.filter(({ estonian, russian }) =>
    normalize(estonian).includes(query) || normalize(russian).includes(query))
}
