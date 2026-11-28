import { answerIsCorrect, hasScore } from './engine.ts'
import type { Exercise, LessonProgress } from './engine.ts'
import { shuffledOptions } from './wordBank.ts'

export function reviewQuestions(partId: string, questions: Exercise[], progress: LessonProgress) {
  const errors = questions.filter(({ id }) => progress.attempt[id] === 0 && !progress.mastered?.[id])
  const stored = progress.reviewQueues?.[partId]
  if (stored) return stored.filter((id) => errors.some((question) => question.id === id))
  return shuffledOptions(errors.map(({ id }) => ({ id, text: id })), `${progress.attemptSeed ?? ''}:${partId}:review`)
    .map(({ id }) => id)
}

export function masteredScores(progress: LessonProgress) {
  return Object.fromEntries(Object.entries(progress.attempt).filter(([id, score]) => score === 1 || progress.mastered?.[id]))
}

export function checkRetry(progress: LessonProgress, question: Exercise, input: string[]) {
  const draft = progress.choiceDraft
  if (!draft || draft.exerciseId !== question.id || draft.reviewScore !== undefined) return progress
  return { ...progress, choiceDraft: { ...draft, reviewScore: Number(answerIsCorrect(question, input)) } }
}

export function continueRetry(progress: LessonProgress, partId: string, queue: string[]) {
  const draft = progress.choiceDraft
  if (!draft || draft.exerciseId !== queue[0] || draft.reviewScore === undefined) return progress
  const [id, ...remaining] = queue
  return {
    ...progress, choiceDraft: undefined,
    mastered: draft.reviewScore === 1 ? { ...progress.mastered, [id]: 1 } : progress.mastered,
    reviewQueues: { ...progress.reviewQueues, [partId]: draft.reviewScore === 1 ? remaining : [...remaining, id] },
  }
}

export function practiceFinished(questions: Exercise[], progress: LessonProgress, repeatErrors?: boolean) {
  const scores = repeatErrors ? masteredScores(progress) : progress.attempt
  return questions.every(({ id }) => hasScore(scores, id))
}
