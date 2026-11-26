import assert from 'node:assert/strict'
import test from 'node:test'
import { blocks, exercises, lessons } from '../src/lessons/course.ts'
import { answerIsCorrect, completion, emptyProgress, finishWordIntro, hasScore, markWordDecision, loadLesson, markAnswer, nextExercise, resumeFromCloud } from '../src/lessons/engine.ts'

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
  assert.equal(practice.length, 76)
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
    assert.equal(exercise.kind, 'word_intro')
    assert.equal(answerIsCorrect(exercise, [exercise.word.et]), false)
  }
  const legacy = Object.fromEntries(legacyGreetingIds.map((id) => [id, 1]))
  assert.equal(firstIncompleteStep(legacy).id, 'phrase-translation')
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
  const throughStepFour = Object.fromEntries(lessonSteps.slice(0, 5).flatMap((step) => (step.exercises ?? []).map(({ id }) => [id, 1])))
  assert.equal(firstIncompleteStep(throughStepFour).id, 'olema-practice')
  assert.equal(lessonSteps[5].id, 'olema-theory')
})

test('book exercise counts, keys, aliases, and full lesson completion', async () => {
  const { lessonSteps } = await import('../src/lessons/readerContent.ts')
  const { deferredExercises } = await import('../src/lessons/tereLessonContent.ts')
  const entries = lessonSteps.flatMap((step) => step.exercises ?? [])
  assert.equal(new Set(entries.map(({ id }) => id)).size, 76)
  assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(entries.filter((x) => x.book), (x) => x.book.number))
    .map(([number, items]) => [number, items.length])), { 5: 12, 7: 1, 8: 6, 9: 6, 11: 6, 12: 6, 13: 6, 14: 15, 16: 10 })
  assert.equal(deferredExercises.length, 9)
  assert.deepEqual(entries.filter((x) => x.book?.number === 14).map((x) => x.correct),
    ['olen', 'on', 'ole', 'on', 'ole', 'oleme', 'oled', 'ole', 'olete', 'on', 'ole', 'on', 'ole', 'olete', 'oled'])
  const alternate = entries.find(({ id }) => id === 'exercise-5-9')
  assert.equal(answerIsCorrect(alternate, ['Nägemiseni!']), true)
  assert.equal(answerIsCorrect(alternate, ['Kohtumiseni!']), true)
  const goodbye = entries.find(({ id }) => id === 'exercise-5-10')
  assert.equal(answerIsCorrect(goodbye, ['Nägemist!']), true)
  assert.equal(answerIsCorrect(goodbye, ['Nägemiseni!']), false)
  const printed = {
    5: ['Tere õhtust!', 'Head aega!', 'Head ööd!', 'Kõike head!', 'Tere!', 'Tere hommikust!', 'Tervist!', 'Tere päevast!', 'Kohtumiseni!', 'Nägemist!', 'Head päeva!', 'Head õhtut!'],
    7: ['mina', 'sina', 'tema', 'meie', 'teie', 'nemad'],
    11: ['olen', 'oled', 'on', 'oleme', 'olete', 'on'],
    12: ['me', 'ma', 'nad', 'sa', 'ta', 'te'],
    13: ['ole', 'ole', 'ole', 'ole', 'ole', 'ole'],
    16: ['Ta on õpilane.', 'Kes te olete?', 'Ta ei ole Indrek.', 'Ta on õpilane.', 'Ma ei ole sekretär.',
      'Kes sa oled?', 'Ma olen inimene.', 'Ma ei ole Katrin.', 'Ta on naine.', 'Sa ei ole mees!'],
  }
  for (const [number, answers] of Object.entries(printed)) {
    const questions = entries.filter((x) => x.book?.number === Number(number))
    assert.deepEqual(questions.flatMap((x) => x.kind === 'matching_pairs' ? x.pairs.map(({ right }) => right) : [x.kind === 'word_order' ? x.explanation : x.correct]), answers)
  }
  assert.ok(entries.filter((x) => x.book).every((x) => x.book.answerSource === 'vastused-215'))
  let progress = emptyProgress()
  for (const exercise of entries) {
    if (exercise.kind === 'word_intro') {
      progress = markWordDecision(progress, exercise, 'known', entries, true)
      continue
    }
    const input = correct(exercise)
    assert.equal(answerIsCorrect(exercise, input), true, exercise.id)
    if (exercise.kind === 'word_order') {
      assert.equal(exercise.order.map((id) => exercise.options.find((option) => option.id === id).text).join(' '), exercise.explanation)
      progress.choiceDraft = { exerciseId: exercise.id, optionId: '', order: input }
    }
    progress = markAnswer(progress, exercise, input, entries, true)
    const restored = loadLesson('test', entries.map(({ id }) => id), { getItem: () => JSON.stringify(progress) })
    assert.deepEqual(restored, progress)
  }
  assert.equal(progress.best[completion], 100)
})

test('reader progress counts checked questions within one stage, including incorrect answers', async () => {
  const { stageQuestionProgress, lessonSteps } = await import('../src/lessons/readerContent.ts')
  const words = lessonSteps[1].exercises
  const translations = lessonSteps[2].exercises
  const attempt = { [words[0].id]: 0 }

  assert.equal(stageQuestionProgress([], attempt), undefined)
  assert.deepEqual(stageQuestionProgress(words, {}, words[0].id), { question: 1, completed: 0, total: 8 })
  assert.deepEqual(stageQuestionProgress(words, attempt, words[0].id), { question: 1, completed: 1, total: 8 })
  assert.deepEqual(stageQuestionProgress(words, attempt, words[1].id), { question: 2, completed: 1, total: 8 })
  assert.deepEqual(stageQuestionProgress(translations, attempt, translations[0].id), { question: 1, completed: 0, total: 12 })

  const pairs = lessonSteps[4].exercises
  assert.deepEqual(stageQuestionProgress(pairs, {}, pairs[4].id), { question: 1, completed: 0, total: 13 })
  assert.deepEqual(stageQuestionProgress(pairs, { [pairs[4].id]: 1 }, pairs[4].id), { question: 1, completed: 1, total: 13 })
  assert.deepEqual(stageQuestionProgress(pairs, { [pairs[4].id]: 1 }, pairs[0].id), { question: 2, completed: 1, total: 13 })
})

test('pronoun matching restores partial pairs and awards one result exactly once', async () => {
  const { pronounMatching, legacyPronounExercises } = await import('../src/lessons/tereLessonContent.ts')
  const { foundPronounPairs, recordPronounPair, restoreLegacyMatching } = await import('../src/lessons/matchingProgress.ts')
  const exercises = [pronounMatching]
  const pairs = pronounMatching.pairs.map(({ id }) => id)
  const restore = (progress) => restoreLegacyMatching(loadLesson('test',
    [pronounMatching.id, ...legacyPronounExercises.map(({ id }) => id)],
    { getItem: () => JSON.stringify(progress) }))
  assert.equal(legacyPronounExercises.filter(({ book }) => book.number === 6).length, 6)
  assert.deepEqual(pronounMatching.pairs.map(({ left }) => left), ['ma', 'sa', 'ta', 'me', 'te', 'nad'])

  let progress = restore({ ...emptyProgress(), attempt: { 'exercise-6-1': 1, [pairs[0]]: 1,
    [pairs[1]]: 0 }, choiceDraft: { exerciseId: pairs[0], optionId: 'mina' } })
  assert.deepEqual(foundPronounPairs(progress), [pairs[0]])
  assert.equal(recordPronounPair(progress, pairs[1], pairs[2], exercises, true), progress)
  for (const id of pairs.slice(1, -1)) progress = recordPronounPair(progress, id, id, exercises, true)
  progress = restore(progress)
  assert.deepEqual(foundPronounPairs(progress), pairs.slice(0, -1))
  assert.deepEqual(progress.pending, {})
  assert.equal(hasScore(progress.attempt, pronounMatching.id), false)
  const last = pairs.at(-1)
  const finished = restore(recordPronounPair(progress, last, last, exercises, true))
  assert.deepEqual(foundPronounPairs(finished), pairs)
  assert.deepEqual(finished.pending, { [pronounMatching.id]: 1, [completion]: 100 })
  assert.equal(recordPronounPair(finished, last, last, exercises, true), finished)

  const legacy = restore({ ...emptyProgress(), attempt: Object.fromEntries(pairs.map((id) => [id, 1])) })
  assert.equal(legacy.attempt[pronounMatching.id], 1)
  assert.deepEqual(legacy.pending, {})
})

test('olema theory keeps its grouped content and the reference is scoped to each applicable question', async () => {
  const { lessonSteps, lessonReferences, referencesForExercise } = await import('../src/lessons/readerContent.ts')
  const { panels } = lessonSteps.find(({ id }) => id === 'olema-theory')
  assert.deepEqual(panels.map(({ kind }) => kind), ['heading', 'highlight', 'dialogue-group'])
  assert.deepEqual(panels[1].panels.map(({ kind }) => kind), ['paragraph', 'paragraph', 'example-group'])
  assert.equal(panels[1].panels[2].items.length, 6)
  assert.deepEqual(panels[2].dialogues.map(({ length }) => length), [2, 2])
  const questions = lessonSteps.flatMap((step) => step.exercises ?? [])
  for (const { id, book } of questions) {
    const result = referencesForExercise(lessonReferences, id)
    assert.deepEqual(result, [11, 12].includes(book?.number) ? lessonReferences : [], id)
  }
  assert.equal(lessonReferences[0].exerciseIds.length, 12)
  assert.equal(lessonReferences[0].panels[0].rows.length, 6)
})

test('all ten sentence banks are stable, non-linear permutations of the original words', async () => {
  const { sentenceTranslation } = await import('../src/lessons/tereLessonContent.ts')
  const { shuffledWordBank } = await import('../src/lessons/wordBank.ts')
  assert.equal(sentenceTranslation.length, 10)
  for (const exercise of sentenceTranslation) {
    const { id, options, order } = exercise
    const bank = shuffledWordBank(id, options, order)
    assert.deepEqual(bank, shuffledWordBank(id, options, order))
    assert.deepEqual(bank.map(({ id }) => id).sort(), [...order].sort())
    assert.notDeepEqual(bank.map(({ id }) => id), order)
    assert.notDeepEqual(bank.map(({ id }) => id), [...order].reverse())
    assert.equal(answerIsCorrect(exercise, order), true)
  }
  const repeated = { ...sentenceTranslation[0], options: [
    { id: '0', text: 'Ei' }, { id: '1', text: 'Ei' }, { id: '2', text: 'ole!' },
  ], order: ['0', '1', '2'] }
  assert.equal(answerIsCorrect(repeated, ['1', '0', '2']), true)
  assert.equal(answerIsCorrect(repeated, ['0', '0', '2']), false)
  assert.equal(answerIsCorrect(repeated, ['1', '2', '0']), false)
})

test('moving between stages parks persistent drafts and replay keeps the best result', async () => {
  const { moveLessonStage } = await import('../src/lessons/engine.ts')
  const draft = { exerciseId: 'exercise-16-1', optionId: '', order: ['0'] }
  const progress = { ...emptyProgress(), best: { [completion]: 86 }, attempt: { 'exercise-16-2': 1 },
    stepId: 'sentence-translation', choiceDraft: draft }
  const back = moveLessonStage(progress, 'negation-practice')
  const restored = loadLesson('test', ['exercise-16-1', 'exercise-16-2'], { getItem: () => JSON.stringify(back) })
  const forward = moveLessonStage(restored, 'sentence-translation')
  assert.deepEqual(forward.choiceDraft, draft)
  assert.deepEqual(forward.attempt, progress.attempt)
  const replay = moveLessonStage(forward, 'greetings-theory', true)
  assert.deepEqual(replay.attempt, {})
  assert.equal(replay.choiceDraft, undefined)
  assert.equal(replay.stageDrafts, undefined)
  assert.equal(replay.best[completion], 86)
})

test('result counts unique answered active exercises and handles all right, all wrong and empty', async () => {
  const { lessonResult } = await import('../src/lessons/engine.ts')
  const [a, b] = exercises
  const result = (attempt) => lessonResult([a, a, b], { ...emptyProgress(), attempt, best: { [completion]: 86 } })
  assert.deepEqual(result({ [a.id]: 1, ignored: 1 }), { correct: 1, total: 1, errors: 0, percent: 100, best: 86 })
  assert.deepEqual(result({ [a.id]: 0, [b.id]: 0 }), { correct: 0, total: 2, errors: 2, percent: 0, best: 86 })
  assert.deepEqual(result({}), { correct: 0, total: 0, errors: 0, percent: 0, best: 86 })
})

test('word introductions preserve the reveal across reload and count completion separately from accuracy', async () => {
  const { lessonResult, moveLessonStage } = await import('../src/lessons/engine.ts')
  const { newWordExercises } = await import('../src/lessons/greetingsContent.ts')
  const catalog = (await import('node:fs')).readFileSync(new URL('../supabase/grammar/review/working-647.json', import.meta.url), 'utf8')
  const byId = new Map(JSON.parse(catalog).map((entry) => [entry.id, entry]))
  for (const { word } of newWordExercises) {
    assert.equal(byId.get(word.catalogId).lemma, word.et)
    assert.ok(byId.get(word.catalogId).russian_glosses.includes(word.ru))
  }
  const [learn, known] = newWordExercises
  const [quiz] = exercises
  const entries = [learn, known, quiz]
  const restore = (state) => loadLesson('test', entries.map(({ id }) => id), { getItem: () => JSON.stringify(state) })
  const first = markWordDecision(emptyProgress(), learn, 'learn', entries, true)
  assert.deepEqual(first.attempt, {})
  assert.deepEqual(first.pending, {})
  assert.deepEqual(restore(first).wordDecisions, { [learn.id]: 'learn' })
  const parked = moveLessonStage(moveLessonStage({ ...first, stepId: 'words' }, 'theory'), 'words')
  assert.equal(parked.wordDecisions[learn.id], 'learn')
  const viewed = finishWordIntro(restore(parked), learn, entries, true)
  assert.equal(finishWordIntro(viewed, learn, entries, true), viewed)
  assert.equal(markWordDecision(viewed, learn, 'known', entries, true), viewed)
  const introDone = markWordDecision(viewed, known, 'known', entries, true)
  assert.equal(introDone.attempt[known.id], 1)
  assert.equal(introDone.wordDecisions[known.id], 'known')
  assert.equal(hasScore(introDone.best, completion), false)
  const finished = markAnswer(introDone, quiz, [], entries, true)
  assert.deepEqual(lessonResult(entries, finished), { correct: 0, total: 1, errors: 1, percent: 0, best: 0 })
  assert.equal(finished.pending[completion], 0)
  assert.equal(moveLessonStage(finished, 'words', true).wordDecisions, undefined)
})

test('theory keeps highlight boundaries and the six pronoun forms and translations', async () => {
  const { lessonSteps } = await import('../src/lessons/readerContent.ts')
  const pronouns = lessonSteps.find(({ id }) => id === 'pronouns-theory').panels
  assert.deepEqual(pronouns.map(({ kind }) => kind), ['heading', 'highlight'])
  const [intro, table, note] = pronouns[1].panels
  assert.equal(intro.kind, 'paragraph')
  assert.deepEqual(table.headers, ['Местоимение', 'Перевод'])
  assert.deepEqual(table.rows.map(([forms, translation]) => [forms.map(({ text }) => text).join(''), translation]), [
    ['Mina / Ma', 'Я'], ['Sina / Sa', 'Ты'], ['Tema / Ta', 'Он / она'],
    ['Meie / Me', 'Мы'], ['Teie / Te', 'Вы'], ['Nemad / Nad', 'Они'],
  ])
  assert.equal(note.text.map(({ text }) => text).join(''),
    'Местоимения ОН и ОНА переводятся на эстонский язык одним словом tema (ta).')
  const [negation] = lessonSteps.find(({ id }) => id === 'negation-theory').panels
  assert.equal(negation.kind, 'highlight')
  assert.deepEqual(negation.panels.map(({ kind }) => kind), ['paragraph', 'table'])
})
