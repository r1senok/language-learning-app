import { sortByEstonian } from './wordOrder.ts'
import type { Word, WordId } from '../types'

export type WordFilter = 'all' | 'studying' | 'learned'

export function selectMyWords(words: readonly Word[], isPersonal: (word: Word) => boolean) {
  return sortByEstonian(words.filter((word) => isPersonal(word) || word.progress > 0))
}

export function filterMyWords(words: readonly Word[], query: string, filter: WordFilter) {
  const term = query.trim().toLowerCase()
  return words.filter((word) => {
    if (filter === 'learned' && word.progress !== 3) return false
    if (filter === 'studying' && word.progress !== 1 && word.progress !== 2) return false
    return `${word.estonian} ${word.russian}`.toLowerCase().includes(term)
  })
}

export function sessionProgress(initial: ReadonlySet<WordId>, answered: ReadonlySet<WordId>) {
  const count = [...initial].filter((id) => answered.has(id)).length
  return { count, total: initial.size, percentage: initial.size ? count / initial.size * 100 : 0 }
}
