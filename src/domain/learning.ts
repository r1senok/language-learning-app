import type { Progress, Word } from '../types'

export function advanceProgress(progress: Progress, known: boolean): Progress {
  if (!known) return 1
  if (progress === 1) return 2
  if (progress === 2) return 3
  return progress
}

export function requeueAfterAnswer(queue: number[], id: number, learned: boolean, random = Math.random): number[] {
  const rest = queue.filter((item) => item !== id)
  if (learned) return rest
  if (!rest.length) return [id]
  const insertAt = rest.length === 1 ? 1 : 1 + Math.floor(random() * rest.length)
  return [...rest.slice(0, insertAt), id, ...rest.slice(insertAt)]
}

export function setWordProgress(word: Word, progress: Progress): Word {
  return { ...word, progress }
}

export function completesActiveSession(progress: Progress, known: boolean, queue: number[], wordId: number): boolean {
  return known && progress === 2 && queue.length > 0 && queue.every((id) => id === wordId)
}
