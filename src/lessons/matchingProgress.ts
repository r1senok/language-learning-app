import { hasScore, markAnswer } from './engine.ts'
import type { Exercise, LessonProgress } from './engine.ts'

type MatchingExercise = Extract<Exercise, { kind: 'matching_pairs' }>

export function foundMatchingPairs(exercise: MatchingExercise, progress: LessonProgress) {
  const draft = progress.choiceDraft?.exerciseId === exercise.id ? progress.choiceDraft.order : undefined
  return exercise.pairs.filter(({ id }) => progress.attempt[exercise.id] === 1 || draft?.includes(id)).map(({ id }) => id)
}

export function recordMatchingPair(exercise: MatchingExercise, progress: LessonProgress, leftId: string, rightId: string,
  exercises: Exercise[], cloud: boolean) {
  if (hasScore(progress.attempt, exercise.id)) return progress
  const matched = foundMatchingPairs(exercise, progress)
  if (leftId !== rightId || matched.includes(leftId) || !exercise.pairs.some(({ id }) => id === leftId)) return progress
  const next = { ...progress, choiceDraft: { exerciseId: exercise.id, optionId: '', order: [...matched, leftId] } }
  return next.choiceDraft.order.length === exercise.pairs.length
    ? markAnswer(next, exercise, exercise.pairs.map(({ id }) => id), exercises, cloud)
    : next
}
