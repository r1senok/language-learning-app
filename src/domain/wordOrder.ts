import type { Word } from '../types'

const estonianCollator = new Intl.Collator('et-EE')

export function sortByEstonian<T extends Pick<Word, 'estonian'>>(words: readonly T[]): T[] {
  return [...words].sort((first, second) => estonianCollator.compare(first.estonian, second.estonian))
}
