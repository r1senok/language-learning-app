import assert from 'node:assert/strict'
import test from 'node:test'
import { blocks, exercises, lessons } from '../src/lessons/course.ts'
import { answerIsCorrect, completion, emptyProgress, loadLesson, markAnswer, nextExercise, resumeFromCloud } from '../src/lessons/engine.ts'

const correct = (exercise) => exercise.kind === 'matching_pairs' ? exercise.pairs.map(({ id }) => id)
  : exercise.kind === 'word_order' ? exercise.order : [exercise.correct]

test('lesson covers four blocks and grades all five types by identity', () => {
  assert.equal(lessons.length, 20)
  assert.equal(blocks.length, 4)
  assert.equal(new Set(exercises.map(({ id }) => id)).size, exercises.length)
  assert.equal(new Set(exercises.map(({ kind }) => kind)).size, 5)
  for (const exercise of exercises) {
    const reversed = exercise.options ? { ...exercise, options: [...exercise.options].reverse() } : exercise
    assert.equal(answerIsCorrect(reversed, correct(exercise)), true, exercise.id)
    assert.equal(answerIsCorrect(exercise, []), false, exercise.id)
    if (correct(exercise).length > 1) assert.equal(answerIsCorrect(exercise, [...correct(exercise)].reverse()), false)
  }
})

test('restores attempts by stable ID and keeps completion score when redoing or adding work', () => {
  const first = markAnswer(emptyProgress(), exercises[0], correct(exercises[0]), exercises, true)
  const all = exercises.slice(1).reduce((progress, exercise) =>
    markAnswer(progress, exercise, correct(exercise), exercises, true), first)
  const ids = exercises.map(({ id }) => id)
  const recovered = loadLesson('test', ids, { getItem: () => JSON.stringify(first) })
  assert.deepEqual(recovered, first)
  assert.equal(nextExercise(exercises, recovered.attempt)?.id, exercises[1].id)
  assert.equal(all.best[completion], 100)
  assert.equal(all.pending[completion], 100)
  const retry = markAnswer({ ...all, attempt: {} }, exercises[0], [], exercises, true)
  assert.equal(retry.best[exercises[0].id], 1)
  assert.equal(retry.best[completion], 100)
  assert.equal(resumeFromCloud(retry, all.best).attempt[exercises[0].id], 0)
  assert.equal(nextExercise([...exercises, { ...exercises[0], id: 'new-question' }], all.attempt)?.id, 'new-question')
})

test('recovers storage exceptions and restores a cloud checkpoint', () => {
  assert.deepEqual(loadLesson('test', [], { getItem() { throw Error() } }), emptyProgress())
  const remote = { [exercises[0].id]: 0 }
  const progress = resumeFromCloud(emptyProgress(), remote)
  assert.equal(nextExercise(exercises, progress.attempt)?.id, exercises[1].id)
})
