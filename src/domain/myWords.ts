import type { Word, WordId } from '../types'

export function filterDictionary(words: readonly Word[], search: string): readonly Word[] {
  const normalize = (value: string) => value.normalize('NFC').toLowerCase()
  const query = normalize(search.trim())
  if (!query) return words

  return words.filter(({ estonian, russian }) =>
    normalize(estonian).includes(query) || normalize(russian).includes(query))
}

export function sessionProgress(initial: ReadonlySet<WordId>, answered: ReadonlySet<WordId>) {
  const count = [...initial].filter((id) => answered.has(id)).length
  return { count, total: initial.size, percentage: initial.size ? count / initial.size * 100 : 0 }
}
