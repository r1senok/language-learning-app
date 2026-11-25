import assert from 'node:assert/strict'
import test from 'node:test'
import { blocks, exercises, lessons } from '../src/lessons/course.ts'
import { answerIsCorrect, completion, emptyProgress, loadLesson, markAnswer, nextExercise, resumeFromCloud } from '../src/lessons/engine.ts'

const correct = (exercise) => exercise.kind === 'matching_pairs' ? exercise.pairs.map(({ id }) => id)
  : exercise.kind === 'word_order' ? exercise.order : [exercise.correct]

test('lesson covers four blocks and grades all four text types by identity', () => {
  assert.equal(lessons.length, 20)
  assert.equal(blocks.length, 4)
  assert.equal(new Set(exercises.map(({ id }) => id)).size, exercises.length)
  assert.equal(new Set(exercises.map(({ kind }) => kind)).size, 4)
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

test('reader preserves later exercise IDs and a theory checkpoint on reload', async () => {
  const { lessonSteps, firstIncompleteStep } = await import('../src/lessons/readerContent.ts')
  assert.equal(new Set(lessonSteps.map(({ id }) => id)).size, lessonSteps.length)
  const practice = lessonSteps.filter(({ kind }) => kind === 'practice').flatMap((step) => step.exercises)
  assert.deepEqual(practice.filter(({ id }) => !id.startsWith('new-word-') && !id.startsWith('exercise-')).map(({ id }) => id).sort(), exercises.filter(({ id }) => !id.startsWith('greeting-')).map(({ id }) => id).sort())
  const state = { ...emptyProgress(), stepId: 'olema-theory' }
  assert.deepEqual(loadLesson('test', [], { getItem: () => JSON.stringify(state) }), state)
  const answered = markAnswer(state, exercises[0], correct(exercises[0]), exercises, false)
  assert.equal(answered.stepId, 'olema-theory')
  assert.equal(firstIncompleteStep(answered.attempt).id, 'greetings-practice')
})

test('the text greeting exercise retains the original ID and saved answers', () => {
  const replaced = exercises.find(({ id }) => id === 'greeting-listen')
  assert.equal(replaced.kind, 'multiple_choice')
  assert.equal(replaced.options.find(({ id }) => id === replaced.correct).text, 'Tere õhtust!')
  const saved = { ...emptyProgress(), attempt: { 'greeting-listen': 1 } }
  const restored = loadLesson('test', exercises.map(({ id }) => id), { getItem: () => JSON.stringify(saved) })
  assert.equal(restored.attempt['greeting-listen'], 1)
  assert.equal(markAnswer(restored, replaced, [], exercises, false), restored)
})

test('page 13 contains thirteen phrases and eight words, and prior users keep their checkpoint', async () => {
  const { keyPhrases, newWordExercises, legacyGreetingIds } = await import('../src/lessons/greetingsContent.ts')
  const { firstIncompleteStep, lessonSteps, stepExercises } = await import('../src/lessons/readerContent.ts')
  assert.equal(keyPhrases.length, 13)
  assert.deepEqual(newWordExercises.map(({ word }) => word.et), ['hommik', 'päev', 'õhtu', 'aeg', 'öö', 'hea', 'kõik', 'kuulama'])
  for (const exercise of newWordExercises) {
    assert.equal(exercise.options.length, 4)
    assert.equal(new Set(exercise.options.map(({ id }) => id)).size, 4)
    assert.equal(answerIsCorrect(exercise, [exercise.correct]), true)
  }
  const legacy = Object.fromEntries(legacyGreetingIds.map((id) => [id, 1]))
  assert.equal(firstIncompleteStep(legacy).id, 'pronouns-practice')
  assert.equal(stepExercises(lessonSteps[1], legacy).length, 4)
  assert.equal(stepExercises(lessonSteps[1], { ...legacy, [newWordExercises[0].id]: 0 }).length, 8)
})

test('book questions use all items in order, and selection and checked score survive reload', async () => {
  const { pronounBookExercises: questions } = await import('../src/lessons/pronounExercises.ts')
  const { firstIncompleteStep, lessonSteps } = await import('../src/lessons/readerContent.ts')
  const expected = [
    [['Я', 'mina'], ['Он', 'tema'], ['Ты', 'sina'], ['Они', 'nemad'], ['Вы', 'teie'], ['Мы', 'meie']],
    [['sina', 'sa'], ['tema', 'ta'], ['meie', 'me'], ['teie', 'te'], ['mina', 'ma'], ['nemad', 'nad']],
  ]
  for (const [index, number] of [8, 9].entries()) {
    const set = questions.filter(({ book }) => book.number === number)
    assert.deepEqual(set.map(({ prompt, correct }) => [prompt, correct]), expected[index])
    for (const question of set) {
      const variants = question.options.map(({ id }) => id)
      assert.equal(variants.length, number === 8 ? 4 : 6)
      assert.equal(new Set(variants).size, variants.length)
      assert.equal(variants.filter((id) => id === question.correct).length, 1)
    }
  }
  const first = questions[0]
  const optionId = first.options.find(({ id }) => id !== first.correct).id
  const draft = { ...emptyProgress(), stepId: 'pronouns-practice', choiceDraft: { exerciseId: first.id, optionId } }
  const restore = (state) => loadLesson('test', questions.map(({ id }) => id), { getItem: () => JSON.stringify(state) })
  assert.deepEqual(restore(draft), draft)
  const saved = markAnswer(draft, first, [optionId], questions, true)
  assert.deepEqual(restore(saved), saved)
  assert.equal(saved.attempt[first.id], 0)
  assert.equal(markAnswer(saved, first, [first.correct], questions, true), saved)
  const throughStepFour = Object.fromEntries(lessonSteps.slice(0, 4).flatMap((step) => (step.exercises ?? []).map(({ id }) => [id, 1])))
  assert.equal(firstIncompleteStep(throughStepFour).id, 'olema-practice')
  assert.equal(lessonSteps[4].id, 'olema-theory')
})
