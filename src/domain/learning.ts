import type { Progress, StoredProgress, Word, WordId } from '../types'

export function advanceProgress(progress: Progress, known: boolean): Progress {
  if (!known) return progress
  if (progress === 1) return 2
  if (progress === 2) return 3
  return progress
}

export function requeueAfterAnswer<T extends WordId>(queue: T[], id: T, learned: boolean, random = Math.random): T[] {
  const rest = queue.filter((item) => item !== id)
  if (learned) return rest
  if (!rest.length) return [id]
  const insertAt = rest.length === 1 ? 1 : 1 + Math.floor(random() * rest.length)
  return [...rest.slice(0, insertAt), id, ...rest.slice(insertAt)]
}

export function setWordProgress(word: Word, progress: Progress): Word {
  return { ...word, progress }
}

export function applyAnswer(session: StoredProgress, wordId: WordId, known: boolean, random = Math.random): StoredProgress {
  if (session.queue[0] !== wordId) return session

  return reviewQueuedWord(session, wordId, known, random)
}

export function reviewQueuedWord(session: StoredProgress, wordId: WordId, known: boolean,
  random = Math.random, reviewedAt?: string): StoredProgress {
  if (!session.queue.includes(wordId)) return session

  const word = session.words.find(({ id }) => id === wordId)
  if (!word || (word.progress !== 1 && word.progress !== 2)) return session

  const progress = advanceProgress(word.progress, known)
  return {
    words: session.words.map((entry) => entry.id === wordId ? { ...entry, progress, ...(reviewedAt && { lastReviewedAt: reviewedAt }) } : entry),
    queue: requeueAfterAnswer(session.queue, wordId, progress === 3, random),
  }
}
