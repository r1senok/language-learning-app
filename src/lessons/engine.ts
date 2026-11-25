export type Option = { id: string; text: string }
type BookQuestion = {
  lessonId: string; number: number; question: number; total: number; page: number
  heading: string; language: 'ru' | 'et'
}
type Question = { id: string; prompt: string; explanation: string; exampleAudio?: string; scene?: { icon: string; label: string } }
export type Exercise = Question & (
  | { kind: 'multiple_choice'; options: Option[]; correct: string; book?: BookQuestion }
  | { kind: 'fill_blank'; options: Option[]; correct: string }
  | { kind: 'matching_pairs'; pairs: { id: string; left: string; right: string }[] }
  | { kind: 'word_order'; options: Option[]; order: string[] }
)

export type BookChoice = Extract<Exercise, { kind: 'multiple_choice' }> & { book: BookQuestion }
export const isBookChoice = (exercise?: Exercise): exercise is BookChoice =>
  exercise?.kind === 'multiple_choice' && exercise.book !== undefined

export function answerIsCorrect(exercise: Exercise, selected: string[]) {
  if (exercise.kind === 'matching_pairs') {
    return selected.length === exercise.pairs.length &&
      exercise.pairs.every(({ id }, index) => selected[index] === id)
  }
  if (exercise.kind === 'word_order') {
    return selected.length === exercise.order.length && exercise.order.every((id, index) => selected[index] === id)
  }
  return selected.length === 1 && selected[0] === exercise.correct
}

export const completion = '@completed'
export type Scores = Record<string, number>
export const hasScore = (scores: Scores, id: string) => Object.prototype.hasOwnProperty.call(scores, id)
export type LessonProgress = { best: Scores; attempt: Scores; pending: Scores; stepId?: string; choiceDraft?: { exerciseId: string; optionId: string } }
export const emptyProgress = (): LessonProgress => ({ best: {}, attempt: {}, pending: {} })

export function nextExercise(exercises: Exercise[], answers: Scores) {
  return exercises.find((exercise) => !hasScore(answers, exercise.id))
}

export function markAnswer(progress: LessonProgress, exercise: Exercise, answer: string[], exercises: Exercise[], cloud: boolean) {
  if (hasScore(progress.attempt, exercise.id)) return progress
  const score = Number(answerIsCorrect(exercise, answer))
  const attempt = { ...progress.attempt, [exercise.id]: score }
  const entries: Scores = { [exercise.id]: score }
  if (!nextExercise(exercises, attempt)) {
    entries[completion] = Math.round(100 * exercises.reduce((sum, { id }) => sum + (attempt[id] ?? 0), 0) / exercises.length)
  }
  const best = mergeScores(progress.best, entries)
  const pending = cloud ? mergeScores(progress.pending, entries) : progress.pending
  return { ...progress, best, attempt, pending }
}

export function mergeScores(existing: Scores, incoming: Scores): Scores {
  const merged = { ...existing }
  for (const [id, score] of Object.entries(incoming)) {
    merged[id] = Math.max(existing[id] ?? 0, score)
  }
  return merged
}

export function resumeFromCloud(progress: LessonProgress, remote: Scores) {
  // Explicit local replays stay independent of answers from earlier runs on another device.
  const best = mergeScores(progress.best, remote)
  const attempt = hasScore(progress.best, completion) || Object.keys(progress.attempt).length > 0
    ? progress.attempt
    : mergeScores(progress.attempt, Object.fromEntries(Object.entries(remote).filter(([id]) => id !== completion)))
  return { ...progress, best, attempt }
}

export function loadLesson(key: string, ids: string[], storage: Pick<Storage, 'getItem'>) {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '{}')
    const read = (value: unknown, allowCompletion: boolean): Scores => Object.fromEntries(
      [...ids, ...(allowCompletion ? [completion] : [])].flatMap((id) => {
        const score = (value as Scores | undefined)?.[id]
        return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= (id === completion ? 100 : 1) ? [[id, score]] : []
      }))
    return { best: read(parsed.best, true), attempt: read(parsed.attempt, false), pending: read(parsed.pending, true),
      ...(typeof parsed.stepId === 'string' && { stepId: parsed.stepId }),
      ...(ids.includes(parsed.choiceDraft?.exerciseId) && typeof parsed.choiceDraft?.optionId === 'string' &&
        { choiceDraft: { exerciseId: parsed.choiceDraft.exerciseId, optionId: parsed.choiceDraft.optionId } }) }
  } catch {
    return emptyProgress()
  }
}
