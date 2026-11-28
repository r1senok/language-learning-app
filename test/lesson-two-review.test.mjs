import assert from 'node:assert/strict'
import { test } from 'node:test'
import { answerIsCorrect, completeLesson, completion, emptyProgress, markAnswer, moveLessonStage, wordOrderReady } from '../src/lessons/engine.ts'
import { adjacentPart, lessonStorageKey, mergeLessonCloudResults, readLessonProgress } from '../src/lessons/lessonModel.ts'
import { learningPath } from '../src/lessons/learningPath.ts'
import { recordMatchingPair } from '../src/lessons/matchingProgress.ts'
import { checkRetry, continueRetry, practiceFinished, reviewQuestions } from '../src/lessons/reviewQueue.ts'
import { lessonTwoVocabulary, reviewCheckpoint, secondLesson } from '../src/lessons/tereLessonTwo.ts'
import { infinitivePairs, sentenceOrder } from '../src/lessons/tereLessonTwoPractice.ts'

test('the published sequence omits exercise 2 and every practice item has unique provenance and a valid answer', () => {
  assert.equal(secondLesson.parts.length, 21)
  assert.ok(secondLesson.deferredSources.some(({ page, exercise }) => page === 17 && exercise === '2'))
  assert.equal(secondLesson.parts.reduce((total, part) => total + (part.exercises?.length ?? 0), 0), 113)
  assert.deepEqual(reviewCheckpoint.parts.map(({ exercises }) => exercises.length), [9, 10])
  assert.equal(new Set(lessonTwoVocabulary.map((item) => item[3])).size, 7)
  const ids = new Set()
  for (const lesson of [secondLesson, reviewCheckpoint]) {
    for (const [index, part] of lesson.parts.entries()) {
      assert.equal(part.order, index + 1)
      assert.equal(adjacentPart(lesson.parts, part.partId, -1)?.partId, lesson.parts[index - 1]?.partId)
      for (const item of part.exercises ?? []) {
        assert.ok(item.source.page && !ids.has(item.id), item.id)
        ids.add(item.id)
        switch (item.kind) {
          case 'word_intro': assert.ok(item.word.catalogId); break
          case 'matching_pairs': assert.ok(answerIsCorrect(item, item.pairs.map(({ id }) => id))); break
          case 'word_order':
            for (const sequence of [item.order, ...item.alternativeOrders]) {
              assert.ok(wordOrderReady(item, sequence.length))
              assert.ok(answerIsCorrect(item, sequence), item.id)
            }
            break
          default:
            for (const id of item.accepted ?? [item.correct]) {
              assert.ok(item.options.some((option) => option.id === id))
              assert.ok(answerIsCorrect(item, [id]), item.id)
            }
            assert.equal(answerIsCorrect(item, ['other']), false)
        }
      }
    }
  }
})

test('WordOrder accepts one approved alternative and validates independent repeated tokens', () => {
  const answer = reviewCheckpoint.parts[1].exercises.find(({ alternativeOrders }) => alternativeOrders.length)
  assert.ok(answerIsCorrect(answer, answer.order))
  assert.ok(answerIsCorrect(answer, answer.alternativeOrders[0]))
  assert.equal(answerIsCorrect(answer, [...answer.order, ...answer.alternativeOrders[0]]), false)
  const repeated = sentenceOrder('fixture', 'fixture', ['a b a', 'a c'])
  assert.equal(new Set(repeated.order).size, 3)
  assert.equal(answerIsCorrect(repeated, [repeated.order[0], repeated.order[1], repeated.order[0]]), false)
  assert.ok(answerIsCorrect(repeated, repeated.alternativeOrders[0]))
})

test('errors survive navigation and reload, rotate on another miss, and preserve the first score', () => {
  const part = reviewCheckpoint.parts[0]
  const questions = part.exercises.slice(0, 2)
  for (const account of [undefined, 'test-account']) {
    const key = lessonStorageKey(reviewCheckpoint.id, account)
    const read = (state) => readLessonProgress(reviewCheckpoint, { getItem: (requested) => requested === key ? JSON.stringify(state) : null }, account)
    let progress = { ...emptyProgress(), stepId: part.partId, attemptSeed: 'fixed' }
    for (const question of questions) {
      progress = markAnswer(progress, question, ['wrong'], questions, Boolean(account), true)
    }
    assert.equal(progress.best[completion], undefined)
    const queue = reviewQuestions(part.partId, questions, progress)
    const at = (id) => questions.find((question) => question.id === id)
    const select = (item, optionId) => { progress = { ...progress, choiceDraft: { exerciseId: item.id, retry: true, optionId } } }
    const [first, second] = queue.map(at)
    select(first, 'wrong')
    progress = checkRetry(progress, first, ['wrong'])
    const otherPart = reviewCheckpoint.parts[1].partId
    progress = read(moveLessonStage(progress, otherPart))
    progress = read(moveLessonStage(progress, part.partId))
    assert.equal(progress.choiceDraft.reviewScore, 0)
    assert.deepEqual(reviewQuestions(part.partId, questions, progress), queue)
    progress = read(continueRetry(progress, part.partId, queue))
    assert.deepEqual(reviewQuestions(part.partId, questions, progress), [second.id, first.id])
    for (const question of [second, first]) {
      select(question, question.correct)
      progress = checkRetry(progress, question, [question.correct])
      progress = read(continueRetry(progress, part.partId, reviewQuestions(part.partId, questions, progress)))
    }
    assert.ok(practiceFinished(questions, progress, true))
    assert.deepEqual(progress.attempt, Object.fromEntries(questions.map(({ id }) => [id, 0])))
    assert.equal(completeLesson(progress, questions, Boolean(account)).best[completion], 0)
    assert.deepEqual(moveLessonStage(progress, part.partId, true).mastered, undefined)
  }
})

test('a wrong matching pick persists as a first-attempt error and all correct pairs achieve mastery', () => {
  const exercise = infinitivePairs
  const [first, second] = exercise.pairs.map(({ id }) => id)
  let progress = recordMatchingPair(exercise, emptyProgress(), first, second, [exercise], true, true)
  assert.equal(progress.choiceDraft.matchingMiss, true)
  for (const { id } of exercise.pairs) progress = recordMatchingPair(exercise, progress, id, id, [exercise], true, true)
  assert.equal(progress.attempt[exercise.id], 0)
  assert.equal(progress.best[completion], undefined)
  assert.ok(practiceFinished([exercise], progress, true))
})

test('the map gates the next lesson on the checkpoint and completion remains valid during replay', () => {
  const node = (number, completed, checkpointId) => ({
    number, title: 'fixture', completed, checkpointId, available: true, progress: 0, started: false,
  })
  const statuses = (first, second, review) => learningPath([
    node(1, first), node(2, second), node(2, review, reviewCheckpoint.id), node(3, false),
  ]).map(({ status }) => status)
  assert.deepEqual(statuses(false, false, false), ['current', 'locked', 'locked', 'locked'])
  assert.deepEqual(statuses(true, false, false), ['completed', 'current', 'locked', 'locked'])
  assert.deepEqual(statuses(true, true, false), ['completed', 'completed', 'current', 'locked'])
  assert.deepEqual(statuses(true, true, true), ['completed', 'completed', 'completed', 'current'])
  const restored = mergeLessonCloudResults(reviewCheckpoint, emptyProgress(), [{ exercise_id: completion, score: 0 }])
  assert.equal(moveLessonStage(restored, reviewCheckpoint.parts[0].partId, true).best[completion], 0)
  assert.notEqual(lessonStorageKey(secondLesson.id), lessonStorageKey(reviewCheckpoint.id))
})
