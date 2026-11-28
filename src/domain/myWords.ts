import type { Word } from '../types'
import { wordStatus } from './wordTraining.ts'

export function filterDictionary(words: readonly Word[], search: string, status = 'all', category = ''): readonly Word[] {
  const normalize = (value: string) => value.normalize('NFC').toLowerCase()
  const query = normalize(search.trim())
  if (!query && status === 'all' && !category) return words
  return words.filter((word) => {
    const state = wordStatus(word)
    return (status === 'all' || status === state || (status === 'learning' && state === 'pending_reverse')) &&
      (!category || word.categories?.includes(category) || word.category === category) &&
      (!query || [word.estonian, word.russian, word.forms ?? '', ...Object.values(word.grammaticalForms ?? {}).flat()]
        .some((value) => normalize(value).includes(query)))
  })
}
