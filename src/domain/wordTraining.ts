import type { StoredProgress, Word, WordId } from '../types'

export const wordStatuses = ['new', 'learning', 'pending_reverse', 'learned'] as const
export const wordStatus = (word: Word) => wordStatuses[word.progress]

export function trainingCandidates(mode: 'new' | 'review', progress: StoredProgress, catalog: readonly Word[]) {
  const words = new Map(progress.words.map((word) => [word.id, word]))
  const queued = new Set(progress.queue)
  const candidates = mode === 'new'
    ? catalog.flatMap(({ id }) => {
      const word = words.get(id)
      return word?.progress === 0 && !queued.has(id) ? [word] : []
    })
    : progress.queue.flatMap((id) => {
      const word = words.get(id)
      return word && (word.progress === 1 || word.progress === 2) ? [word] : []
    })
  const seen = new Set<WordId>()
  return candidates.filter((word) => {
    const id = word.catalogId ?? word.id
    if (seen.has(id) || !word.estonian.trim() || !word.russian.trim()) return false
    seen.add(id)
    return true
  })
}
