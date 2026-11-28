import { completion, hasScore, loadLesson, moveLessonStage, resumeFromCloud } from './engine.ts'
import { masteredScores } from './reviewQueue.ts'
import type { Exercise, LessonProgress, Scores } from './engine.ts'
import type { ReferenceContent, TheoryPanel } from './readerContent.ts'

type PartContent = {
  partId: string
  title: string
  examples?: string[]
} & (
  | { kind: 'theory'; templateType: 'phrases' | 'theory'; panels: TheoryPanel[]
    presentation?: { introLabel?: string; tone?: 'theory' } }
  | { kind: 'practice'; templateType: 'word_intro' | 'multiple_choice' | 'matching_pairs' | 'fill_blank' | 'word_order'
    exercises: Exercise[]; legacyExercises?: Exercise[] }
)

export type LessonPart = PartContent & { order: number; source: { bookId: string; lessonId: string; page: string } }

export type LessonDefinition = {
  id: string
  number: number
  checkpointTitle?: string
  checkpointSubtitle?: string
  repeatErrors?: boolean
  deferredSources?: readonly { page: number; exercise?: string; medium: string; resource?: number }[]
  parts: readonly LessonPart[]
  references?: ReferenceContent[]
  legacyExerciseIds?: readonly string[]
  restoreProgress?: (progress: LessonProgress) => LessonProgress
}

export function defineLesson({ bookId, parts, ...lesson }: Omit<LessonDefinition, 'parts'> & {
  bookId: string; parts: readonly (PartContent & { page: string })[]
}): LessonDefinition {
  return {
    ...lesson,
    parts: parts.map(({ page, ...part }, index) => ({
      ...part, order: index + 1, source: { bookId, lessonId: lesson.id, page },
    })),
  }
}

export function partExercises(part: LessonPart, attempt: Scores) {
  if (part.kind !== 'practice') return []
  const legacy = part.legacyExercises
  return legacy?.length && legacy.every(({ id }) => hasScore(attempt, id)) &&
    !part.exercises.some(({ id }) => hasScore(attempt, id)) ? legacy : part.exercises
}

export function firstIncompletePart(parts: readonly LessonPart[], attempt: Scores) {
  return parts.find((part) => partExercises(part, attempt).some(({ id }) => !hasScore(attempt, id)))
}

export function adjacentPart(parts: readonly LessonPart[], partId: string, direction: -1 | 1) {
  if (partId === '@result') return direction === -1 ? parts.at(-1) : undefined
  const index = parts.findIndex((part) => part.partId === partId)
  return index < 0 ? undefined : parts[index + direction]
}

export function nextPartId(parts: readonly LessonPart[], partId: string, attempt: Scores) {
  return (adjacentPart(parts, partId, 1) ?? firstIncompletePart(parts, attempt))?.partId ?? '@result'
}

export function openLesson(lesson: LessonDefinition, progress: LessonProgress) {
  if (progress.stepId === '@result' || lesson.parts.some(({ partId }) => partId === progress.stepId)) return progress
  const draftPart = lesson.parts.find((part) =>
    partExercises(part, progress.attempt).some(({ id }) => id === progress.choiceDraft?.exerciseId))
  if (draftPart) return { ...progress, stepId: draftPart.partId }
  const incomplete = Object.keys(progress.attempt).length ? firstIncompletePart(lesson.parts, lesson.repeatErrors ? masteredScores(progress) : progress.attempt) : lesson.parts[0]
  return incomplete ? moveLessonStage(progress, incomplete.partId) : moveLessonStage(progress, lesson.parts[0].partId, true)
}

export function lessonExerciseIds(lesson: LessonDefinition) {
  return [...new Set([
    ...lesson.parts.flatMap((part) => part.kind === 'practice'
      ? [...part.exercises, ...part.legacyExercises ?? []].map(({ id }) => id) : []),
    ...lesson.legacyExerciseIds ?? [],
  ])]
}

export function lessonStorageKey(lessonId: string, userId?: string) {
  return `takku-lessons-v1:${userId ?? 'guest'}:${lessonId}`
}

export function readLessonProgress(lesson: LessonDefinition, storage: Pick<Storage, 'getItem'>, userId?: string) {
  const progress = loadLesson(lessonStorageKey(lesson.id, userId), lessonExerciseIds(lesson), storage)
  return lesson.restoreProgress?.(progress) ?? progress
}

export function mergeLessonCloudResults(lesson: LessonDefinition, progress: LessonProgress,
  rows: readonly { exercise_id: string; score: number }[]) {
  const ids = new Set([...lessonExerciseIds(lesson), completion])
  const remote = Object.fromEntries(rows.filter(({ exercise_id }) => ids.has(exercise_id))
    .map(({ exercise_id, score }) => [exercise_id, score]))
  const merged = resumeFromCloud(progress, remote)
  return lesson.restoreProgress?.(merged) ?? merged
}
