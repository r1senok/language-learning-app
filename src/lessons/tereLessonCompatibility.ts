import { hasScore } from './engine.ts'
import type { LessonProgress, Scores } from './engine.ts'
import { pronounMatching, pronounPractice } from './tereLessonContent.ts'

const matchingPart = 'pronouns-practice'
const choicePart = 'pronouns-choices'
const choiceIds = new Set(pronounPractice.slice(1).map(({ id }) => id))

export function restoreFirstLessonProgress(progress: LessonProgress): LessonProgress {
  const exercise = pronounMatching
  const restoreScores = (scores: Scores) => !hasScore(scores, exercise.id) &&
    exercise.pairs.every(({ id }) => scores[id] === 1) ? { ...scores, [exercise.id]: 1 } : scores
  const attempt = restoreScores(progress.attempt)
  const best = restoreScores(progress.best)
  if (progress.partsVersion === 1 && (hasScore(attempt, exercise.id) || !exercise.pairs.some(({ id }) => attempt[id] === 1))) {
    return { ...progress, attempt, best }
  }
  const stageDrafts = { ...progress.stageDrafts }
  const parked = stageDrafts[matchingPart]
  if (!progress.partsVersion && parked && choiceIds.has(parked.exerciseId)) {
    stageDrafts[choicePart] ??= parked
    delete stageDrafts[matchingPart]
  }

  let choiceDraft = progress.choiceDraft
  let stepId = progress.stepId
  if (!progress.partsVersion && stepId === matchingPart && (choiceDraft ? choiceIds.has(choiceDraft.exerciseId)
    : hasScore(attempt, exercise.id) && !stageDrafts[matchingPart])) {
    stepId = choicePart
    choiceDraft ??= stageDrafts[choicePart]
    delete stageDrafts[choicePart]
  }

  // Historical versions persisted each pronoun pair as a separate scored question.
  const partial = exercise.pairs.filter(({ id }) => attempt[id] === 1).map(({ id }) => id)
  if (partial.length && !hasScore(attempt, exercise.id)) {
    const draft = stepId === matchingPart ? choiceDraft : stageDrafts[matchingPart]
    const merged = { exerciseId: exercise.id, optionId: '', order: [...new Set([...(draft?.order ?? []), ...partial])] }
    if (stepId === matchingPart) choiceDraft = merged
    else stageDrafts[matchingPart] = merged
  }
  return { ...progress, partsVersion: 1, attempt, best, stepId, choiceDraft,
    stageDrafts: Object.keys(stageDrafts).length ? stageDrafts : undefined }
}
