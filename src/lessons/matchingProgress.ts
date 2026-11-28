import { hasScore, markAnswer } from './engine.ts'
import type { Exercise, LessonProgress } from './engine.ts'

type MatchingExercise = Extract<Exercise, { kind: 'matching_pairs' }>

export function foundMatchingPairs(exercise: MatchingExercise, progress: LessonProgress) {
  const draft = progress.choiceDraft?.exerciseId === exercise.id ? progress.choiceDraft.order : undefined
  return exercise.pairs.filter(({ id }) => progress.attempt[exercise.id] === 1 || progress.mastered?.[exercise.id] === 1 || draft?.includes(id)).map(({ id }) => id)
}

export function recordMatchingPair(exercise: MatchingExercise, progress: LessonProgress, leftId: string, rightId: string,
  exercises: Exercise[], cloud: boolean, repeatErrors = false) {
  const retry = repeatErrors && progress.attempt[exercise.id] === 0 && !progress.mastered?.[exercise.id]
  if (hasScore(progress.attempt, exercise.id) && !retry) return progress
  const matched = foundMatchingPairs(exercise, progress)
  if (![leftId, rightId].every((id) => exercise.pairs.some((pair) => pair.id === id) && !matched.includes(id))) return progress
  const matchingMiss = progress.choiceDraft?.exerciseId === exercise.id && progress.choiceDraft.matchingMiss
  const draft = { exerciseId: exercise.id, optionId: '', order: matched, ...(matchingMiss && { matchingMiss: true }) }
  if (leftId !== rightId) {
    return repeatErrors && !matchingMiss ? { ...progress, choiceDraft: { ...draft, matchingMiss: true } } : progress
  }
  const next = { ...progress, choiceDraft: { ...draft, order: [...matched, leftId] } }
  if (next.choiceDraft.order.length !== exercise.pairs.length) return next
  const result = retry ? next : markAnswer(next, exercise, matchingMiss ? [] : exercise.pairs.map(({ id }) => id), exercises, cloud, repeatErrors)
  return retry || matchingMiss ? { ...result, mastered: { ...result.mastered, [exercise.id]: 1 } } : result
}
