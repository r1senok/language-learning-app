import { hasScore, markAnswer } from './engine.ts'
import type { Exercise, LessonProgress, Scores } from './engine.ts'
import { pronounMatching } from './tereLessonContent.ts'

export function foundPronounPairs(progress: LessonProgress) {
  const draft = progress.choiceDraft?.exerciseId === pronounMatching.id ? progress.choiceDraft.order : undefined
  return pronounMatching.pairs.filter(({ id }) => progress.attempt[pronounMatching.id] === 1 ||
    progress.attempt[id] === 1 || draft?.includes(id)).map(({ id }) => id)
}

export function restoreLegacyMatching(progress: LessonProgress): LessonProgress {
  function restore(scores: Scores): Scores {
    return !hasScore(scores, pronounMatching.id) && pronounMatching.pairs.every(({ id }) => scores[id] === 1)
      ? { ...scores, [pronounMatching.id]: 1 } : scores
  }
  return { ...progress, attempt: restore(progress.attempt), best: restore(progress.best) }
}

export function recordPronounPair(progress: LessonProgress, leftId: string, rightId: string, exercises: Exercise[], cloud: boolean) {
  if (hasScore(progress.attempt, pronounMatching.id)) return progress
  const matched = foundPronounPairs(progress)
  if (leftId !== rightId || matched.includes(leftId) || !pronounMatching.pairs.some(({ id }) => id === leftId)) return progress

  const next = { ...progress, choiceDraft: { exerciseId: pronounMatching.id, optionId: '', order: [...matched, leftId] } }
  return next.choiceDraft.order.length === pronounMatching.pairs.length
    ? markAnswer(next, pronounMatching, pronounMatching.pairs.map(({ id }) => id), exercises, cloud)
    : next
}
