export type Option = { id: string; text: string }
type BookQuestion = {
  lessonId: string; number: number; question: number; total: number; page: number
  heading: string; language: 'ru' | 'et'
  bookId?: string; mode?: 'translate' | 'match' | 'gap' | 'order'; answerSource?: 'vastused-215'
}
type Question = { id: string; prompt: string; explanation: string; exampleAudio?: string; scene?: { icon: string; label: string } }
export type IntroWord = { catalogId: string; et: string; ru: string; forms?: string; note?: string }
export type WordIntro = Question & { kind: 'word_intro'; word: IntroWord }
export type MultipleChoice = Question & {
  kind: 'multiple_choice'; options: Option[]; correct: string; accepted?: string[]; book?: BookQuestion
  instruction?: string; promptLanguage?: 'et' | 'ru'; optionLanguage?: 'et' | 'ru'
  presentation?: { kind: 'text' } | { kind: 'speech'; characterSrc?: string }
  showCorrectAnswer?: boolean
}
export type FillBlank = Question & { kind: 'fill_blank'; options: Option[]; correct: string; sentence?: { before: string; after: string } }
export type WordOrderExercise = Question & { kind: 'word_order'; options: Option[]; order: string[]; book?: BookQuestion }
export type Exercise = WordIntro | MultipleChoice | FillBlank | WordOrderExercise | (Question & (
  | { kind: 'matching_pairs'; matchingMode?: 'submit'; instruction?: string; columnLabels?: { left: string; right: string }; book?: BookQuestion; pairs: { id: string; left: string; right: string }[] }
))

export type BookChoice = Extract<Exercise, { kind: 'multiple_choice' }> & { book: BookQuestion }
export type BookOrder = Extract<Exercise, { kind: 'word_order' }> & { book: BookQuestion }
export type BookExercise = BookChoice | BookOrder
export const isBookChoice = (exercise?: Exercise): exercise is BookExercise =>
  (exercise?.kind === 'multiple_choice' || exercise?.kind === 'word_order') && exercise.book !== undefined

export function answerIsCorrect(exercise: Exercise, selected: string[]) {
  if (exercise.kind === 'word_intro') return false
  if (exercise.kind === 'matching_pairs') {
    return selected.length === exercise.pairs.length &&
      exercise.pairs.every(({ id }, index) => selected[index] === id)
  }
  if (exercise.kind === 'word_order') {
    const options = new Map(exercise.options.map(({ id, text }) => [id, text]))
    return selected.length === exercise.order.length && new Set(selected).size === selected.length &&
      exercise.order.every((id, index) => options.has(selected[index]) && options.get(selected[index]) === options.get(id))
  }
  return selected.length === 1 && (exercise.kind === 'multiple_choice' ? (exercise.accepted ?? [exercise.correct]).includes(selected[0]) : selected[0] === exercise.correct)
}

export const completion = '@completed'
export type Scores = Record<string, number>
export const hasScore = (scores: Scores, id: string) => Object.prototype.hasOwnProperty.call(scores, id)
export type WordDecision = 'known' | 'learn'
type ChoiceDraft = { exerciseId: string; optionId: string; order?: string[] }
export type LessonProgress = { best: Scores; attempt: Scores; pending: Scores; partsVersion?: 1; attemptSeed?: string; stepId?: string; choiceDraft?: ChoiceDraft; stageDrafts?: Record<string, ChoiceDraft>; wordDecisions?: Record<string, WordDecision> }
export const emptyProgress = (): LessonProgress => ({ best: {}, attempt: {}, pending: {} })

export function nextExercise(exercises: Exercise[], answers: Scores) {
  return exercises.find((exercise) => !hasScore(answers, exercise.id))
}

export function markAnswer(progress: LessonProgress, exercise: Exercise, answer: string[], exercises: Exercise[], cloud: boolean) {
  if (exercise.kind === 'word_intro') return progress
  return recordCompletion(progress, exercise, Number(answerIsCorrect(exercise, answer)), exercises, cloud)
}

// Keep the existing completion marker for saved checkpoints. Word introductions are excluded from lesson accuracy.
export function markWordDecision(progress: LessonProgress, exercise: WordIntro, decision: WordDecision,
  exercises: Exercise[], cloud: boolean) {
  if (hasScore(progress.attempt, exercise.id) || progress.wordDecisions?.[exercise.id]) return progress
  const next = { ...progress, wordDecisions: { ...progress.wordDecisions, [exercise.id]: decision } }
  return decision === 'known' ? recordCompletion(next, exercise, 1, exercises, cloud) : next
}

export function finishWordIntro(progress: LessonProgress, exercise: WordIntro, exercises: Exercise[], cloud: boolean) {
  return progress.wordDecisions?.[exercise.id] === 'learn'
    ? recordCompletion(progress, exercise, 1, exercises, cloud) : progress
}

function recordCompletion(progress: LessonProgress, exercise: Exercise, score: number, exercises: Exercise[], cloud: boolean) {
  if (hasScore(progress.attempt, exercise.id)) return progress
  const attempt = { ...progress.attempt, [exercise.id]: score }
  const entries: Scores = { [exercise.id]: score }
  if (!nextExercise(exercises, attempt)) {
    entries[completion] = lessonResult(exercises, { ...progress, attempt }).percent
  }
  const best = mergeScores(progress.best, entries)
  const pending = cloud ? mergeScores(progress.pending, entries) : progress.pending
  return { ...progress, best, attempt, pending }
}

export function completeLesson(progress: LessonProgress, exercises: Exercise[], cloud: boolean) {
  const score = lessonResult(exercises, progress).percent
  if (hasScore(progress.best, completion) && progress.best[completion] >= score) return progress
  const entries = { [completion]: score }
  return { ...progress, best: mergeScores(progress.best, entries),
    pending: cloud ? mergeScores(progress.pending, entries) : progress.pending }
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

export function moveLessonStage(progress: LessonProgress, stepId: string, replay = false): LessonProgress {
  if (replay) return { ...progress, stepId, attempt: {}, attemptSeed: undefined, choiceDraft: undefined, stageDrafts: undefined, wordDecisions: undefined }
  const stageDrafts = { ...progress.stageDrafts }
  if (progress.stepId && progress.choiceDraft) stageDrafts[progress.stepId] = progress.choiceDraft
  const choiceDraft = Object.prototype.hasOwnProperty.call(stageDrafts, stepId) ? stageDrafts[stepId] : undefined
  delete stageDrafts[stepId]
  return { ...progress, stepId, choiceDraft, stageDrafts: Object.keys(stageDrafts).length ? stageDrafts : undefined }
}

export function lessonResult(exercises: Exercise[], progress: LessonProgress) {
  const ids = [...new Set(exercises.filter(({ kind }) => kind !== 'word_intro').map(({ id }) => id))].filter((id) => hasScore(progress.attempt, id))
  const correct = ids.filter((id) => progress.attempt[id] === 1).length
  return { correct, total: ids.length, errors: ids.length - correct,
    percent: ids.length ? Math.round(100 * correct / ids.length) : 0, best: progress.best[completion] ?? 0 }
}

export function loadLesson(key: string, ids: string[], storage: Pick<Storage, 'getItem'>) {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '{}')
    const read = (value: unknown, allowCompletion: boolean): Scores => Object.fromEntries(
      [...ids, ...(allowCompletion ? [completion] : [])].flatMap((id) => {
        const score = (value as Scores | undefined)?.[id]
        return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= (id === completion ? 100 : 1) ? [[id, score]] : []
      }))
    const readDraft = (value: unknown): ChoiceDraft | undefined => {
      const draft = value as Partial<ChoiceDraft> | undefined
      if (!draft || typeof draft.exerciseId !== 'string' || !ids.includes(draft.exerciseId) ||
          typeof draft.optionId !== 'string') return undefined
      return { exerciseId: draft.exerciseId, optionId: draft.optionId,
        ...(Array.isArray(draft.order) && draft.order.every((id) => typeof id === 'string') ? { order: draft.order } : {}) }
    }
    const choiceDraft = readDraft(parsed.choiceDraft)
    const stageDrafts = Object.fromEntries(Object.entries(parsed.stageDrafts ?? {}).flatMap(([step, value]) => {
      const draft = readDraft(value)
      return /^[a-z0-9-]+$/.test(step) && draft ? [[step, draft]] : []
    }))
    const wordDecisions = Object.fromEntries(Object.entries(parsed.wordDecisions ?? {}).filter(([id, value]) =>
      ids.includes(id) && (value === 'known' || value === 'learn'))) as Record<string, WordDecision>
    return { best: read(parsed.best, true), attempt: read(parsed.attempt, false), pending: read(parsed.pending, true),
      ...(parsed.partsVersion === 1 && { partsVersion: 1 as const }),
      ...(typeof parsed.attemptSeed === 'string' && { attemptSeed: parsed.attemptSeed }),
      ...(typeof parsed.stepId === 'string' && { stepId: parsed.stepId }),
      ...(choiceDraft && { choiceDraft }),
      ...(Object.keys(wordDecisions).length > 0 && { wordDecisions }),
      ...(Object.keys(stageDrafts).length > 0 && { stageDrafts }) }
  } catch {
    return emptyProgress()
  }
}
