import assert from 'node:assert/strict'
import { test } from 'node:test'
import { completion, emptyProgress, markAnswer, moveLessonStage } from '../src/lessons/engine.ts'
import { firstLesson } from '../src/lessons/readerContent.ts'
import { adjacentPart, defineLesson, lessonStorageKey, mergeLessonCloudResults, nextPartId,
  openLesson, partExercises, readLessonProgress } from '../src/lessons/lessonModel.ts'
import { foundMatchingPairs, recordMatchingPair } from '../src/lessons/matchingProgress.ts'
import { pronounMatching } from '../src/lessons/tereLessonContent.ts'

const contents = [
  'greetings-theory', 'greetings-practice', 'phrase-translation', 'pronouns-theory', 'pronouns-practice',
  'pronouns-choices', 'olema-theory', 'olema-practice', 'negation-theory', 'negation-practice', 'sentence-translation',
]
const memory = (entries) => ({ getItem: (key) => JSON.stringify(entries[key] ?? {}) })
const read = (state, userId) => readLessonProgress(firstLesson,
  memory({ [lessonStorageKey(firstLesson.id, userId)]: state }), userId)

test('all eleven parts are numbered from data and every part has its exact adjacent part', () => {
  const { parts, id } = firstLesson
  const attempt = Object.fromEntries(parts.flatMap((part) => partExercises(part, {})).map(({ id }) => [id, 1]))
  assert.deepEqual(parts.map(({ partId }) => partId), contents)
  assert.deepEqual(parts.map(({ order }) => order), Array.from({ length: 11 }, (_, i) => i + 1))
  assert.ok(parts.every(({ source }) => source.lessonId === id && source.bookId === 'tere-a1' && source.page))
  for (const [index, part] of parts.entries()) {
    assert.equal(adjacentPart(parts, part.partId, -1)?.partId, contents[index - 1])
    assert.equal(nextPartId(parts, part.partId, attempt), contents[index + 1] ?? '@result')
  }
  assert.equal(openLesson(firstLesson, emptyProgress()).stepId, contents[0])
  assert.equal(adjacentPart(parts, '@result', -1).partId, contents.at(-1))
  assert.equal(parts[5].exercises.length, 12)
})

test('legacy part 6 selections, checked scores and parked drafts survive reload and going back to part 5', () => {
  for (const user of [undefined, 'account']) {
    const draft = { exerciseId: 'exercise-8-2', optionId: 'tema' }
    const previous = { ...emptyProgress(), stepId: 'pronouns-practice', attemptSeed: 'saved',
      attempt: { [pronounMatching.id]: 1, 'exercise-8-2': 1 }, choiceDraft: draft }
    const restored = read(previous, user)
    assert.equal(restored.stepId, 'pronouns-choices')
    assert.equal(restored.attemptSeed, 'saved')
    assert.equal(restored.attempt[draft.exerciseId], 1)
    assert.deepEqual(restored.choiceDraft, draft)
    const previousPart = adjacentPart(firstLesson.parts, restored.stepId, -1)
    const wentBack = read(moveLessonStage(restored, previousPart.partId), user)
    assert.equal(wentBack.stepId, 'pronouns-practice')
    assert.deepEqual(foundMatchingPairs(pronounMatching, wentBack), pronounMatching.pairs.map(({ id }) => id))
    const reentered = read(moveLessonStage(wentBack, 'pronouns-choices'), user)
    assert.deepEqual(reentered.choiceDraft, draft)
    assert.equal(reentered.attempt[draft.exerciseId], 1)

    const parked = read({ ...previous, stepId: 'olema-theory', choiceDraft: undefined,
      stageDrafts: { 'pronouns-practice': draft } }, user)
    assert.deepEqual(parked.stageDrafts, { 'pronouns-choices': draft })
    assert.equal(read({ ...previous, choiceDraft: undefined }, user).stepId, 'pronouns-choices')
    const matchingDraft = { exerciseId: pronounMatching.id, optionId: '', order: pronounMatching.pairs.slice(0, 1).map(({ id }) => id) }
    assert.equal(read({ ...previous, choiceDraft: matchingDraft }, user).stepId, 'pronouns-practice')
  }
})

test('two lessons with the same exercise IDs have separate guest and account records and cloud results', () => {
  const exercise = firstLesson.parts[2].exercises[0]
  const make = (id, number) => defineLesson({ id, number, bookId: 'fixture',
    parts: [{ partId: 'choices', page: '1', title: 'Fixture', kind: 'practice', templateType: 'multiple_choice', exercises: [exercise] }] })
  const one = make('fixture-one', 1)
  const two = make('fixture-two', 2)
  const saved = markAnswer(emptyProgress(), exercise, [exercise.correct], [exercise], true)
  const store = memory({ [lessonStorageKey(one.id)]: saved, [lessonStorageKey(two.id, 'account')]: saved })
  assert.equal(readLessonProgress(one, store).best[completion], 100)
  assert.deepEqual(readLessonProgress(two, store).best, {})
  assert.deepEqual(readLessonProgress(one, store, 'account').best, {})
  assert.equal(readLessonProgress(two, store, 'account').pending[exercise.id], 1)
  const firstCloud = mergeLessonCloudResults(one, emptyProgress(), [{ exercise_id: exercise.id, score: 1 }])
  const secondCloud = mergeLessonCloudResults(two, emptyProgress(), [{ exercise_id: exercise.id, score: 0 },
    { exercise_id: 'different-question', score: 1 }])
  assert.deepEqual(firstCloud.attempt, { [exercise.id]: 1 })
  assert.deepEqual(secondCloud.attempt, { [exercise.id]: 0 })
})

test('interactive matching persists generic pair identifiers and scores only the actual exercise', () => {
  const pairs = [{ id: 'red', left: 'x', right: 'r' }, { id: 'green', left: 'y', right: 'g' }]
  const exercise = { id: 'generic-matching', kind: 'matching_pairs', prompt: 'Fixture', explanation: '', pairs }
  const lesson = defineLesson({ id: 'matching-fixture', number: 3, bookId: 'fixture',
    parts: [{ partId: 'matching', page: '1', title: 'Fixture', kind: 'practice', templateType: 'matching_pairs', exercises: [exercise] }] })
  let progress = openLesson(lesson, emptyProgress())
  assert.equal(recordMatchingPair(exercise, progress, 'red', 'green', [exercise], true), progress)
  progress = recordMatchingPair(exercise, progress, 'green', 'green', [exercise], true)
  progress = readLessonProgress(lesson, memory({ [lessonStorageKey(lesson.id)]: progress }))
  assert.deepEqual(foundMatchingPairs(exercise, progress), ['green'])
  assert.deepEqual(progress.attempt, {})
  const completed = recordMatchingPair(exercise, progress, 'red', 'red', [exercise], true)
  assert.deepEqual(completed.pending, { [exercise.id]: 1, [completion]: 100 })
  assert.equal(recordMatchingPair(exercise, completed, 'red', 'red', [exercise], true), completed)
})
