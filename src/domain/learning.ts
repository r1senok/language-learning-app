import type { Progress, StoredProgress, Word, WordId } from '../types'

export function advanceProgress(progress: Progress, known: boolean): Progress {
  if (!known) return 1
  if (progress === 1) return 2
  if (progress === 2) return 3
  return progress
}

export function requeueAfterAnswer(queue: WordId[], id: WordId, learned: boolean, random = Math.random): WordId[] {
  const rest = queue.filter((item) => item !== id)
  if (learned) return rest
  if (!rest.length) return [id]
  const insertAt = rest.length === 1 ? 1 : 1 + Math.floor(random() * rest.length)
  return [...rest.slice(0, insertAt), id, ...rest.slice(insertAt)]
}

export function setWordProgress(word: Word, progress: Progress): Word {
  return { ...word, progress }
}

export function completesActiveSession(progress: Progress, known: boolean, queue: WordId[], wordId: WordId): boolean {
  return known && progress === 2 && queue.length > 0 && queue.every((id) => id === wordId)
}

export function applyAnswer(session: StoredProgress, wordId: WordId, known: boolean): StoredProgress {
  if (session.queue[0] !== wordId) return session

  const word = session.words.find(({ id }) => id === wordId)
  if (!word || (word.progress !== 1 && word.progress !== 2)) return session

  const progress = advanceProgress(word.progress, known)
  return {
    words: session.words.map((entry) => entry.id === wordId ? setWordProgress(entry, progress) : entry),
    queue: requeueAfterAnswer(session.queue, wordId, progress === 3),
  }
}
