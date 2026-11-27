import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { finishWordIntro, hasScore, lessonResult, markAnswer, markWordDecision, moveLessonStage } from './engine'
import type { Exercise, LessonProgress, WordIntro } from './engine'
import { firstIncompleteStep, stageQuestionProgress, stepExercises, lessonReferences, referencesForExercise } from './readerContent'
import type { ReaderStep } from './readerContent'
import { exerciseTemplate, isFillBlank, isMultipleChoice, lessonPart, usesChoiceDraft } from './lessonTemplates'
import { MatchingCard } from './MatchingCard'
import { pronounMatching } from './tereLessonContent'
import { foundPronounPairs, recordPronounPair } from './matchingProgress'
import { BookChoiceCard } from './BookChoiceCard'
import { ExerciseCard } from './ExerciseCard'
import { NewWordCard } from './NewWordCard'
import { ReaderAction, ReaderHeader } from './ReaderLayout'
import { LessonExitDialog } from './LessonExitDialog'
import { LessonResult } from './LessonResult'
import { TheoryCard } from './TheoryCard'
import { LessonReferenceSheet } from './LessonReferenceSheet'
import type { Word } from '../types'
import { studyGrammarRows } from '../domain/grammar'

const stageTitles: Record<string, string> = {
  'negation-theory': 'Отрицание',
}

export function LessonReader({ lessonNumber, steps, progress, current, save, onClose, studyWord, catalogWords, cloud, warnings }: {
  lessonNumber: number; steps: ReaderStep[]; progress: LessonProgress; current: () => LessonProgress; save: (progress: LessonProgress) => void
  onClose: () => void; studyWord: (catalogId: string) => boolean; catalogWords: Word[]; cloud: boolean; warnings: ReactNode
}) {
  const [answered, setAnswered] = useState<Exercise>()
  const reader = useRef<HTMLDivElement>(null)
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null)
  const exitDialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const exercises = steps.flatMap((step) => stepExercises(step, progress.attempt))
  const last = steps.length
  const result = progress.stepId === '@result'
  const step = steps.find((item) => item.id === progress.stepId) ?? firstIncompleteStep(progress.attempt, steps) ?? steps[last - 1]
  const index = steps.indexOf(step)
  const stepQuestions = stepExercises(step, progress.attempt)
  const draftQuestion = stepQuestions.find(({ id }) => id === progress.choiceDraft?.exerciseId)
  const active = answered ?? ((usesChoiceDraft(draftQuestion) || draftQuestion?.id === pronounMatching.id) ? draftQuestion : undefined)
    ?? stepQuestions.find(({ id }) => !hasScore(progress.attempt, id))
  const bookChoice = !result && usesChoiceDraft(active) ? active : undefined
  const selectedOption = bookChoice?.options.find(({ id }) => progress.choiceDraft?.exerciseId === bookChoice.id &&
    progress.choiceDraft.optionId === id)?.id
  const selectedOrder = bookChoice && progress.choiceDraft?.exerciseId === bookChoice.id
    ? [...new Set(progress.choiceDraft.order ?? [])].filter((id) => bookChoice.options.some((option) => option.id === id)) : []
  const showMatching = !result && active?.id === pronounMatching.id
  const newWord = !result && active?.kind === 'word_intro' ? active : undefined
  const catalogWord = newWord && catalogWords.find(({ catalogId }) => catalogId === newWord.word.catalogId)
  const catalogForms = studyGrammarRows(catalogWord?.partOfSpeech, catalogWord?.grammaticalForms).map(({ value }) => value)
  const introForms = catalogForms.length ? catalogForms : newWord?.word.forms?.split(', ') ?? []
  const fillBlankStep = isFillBlank(bookChoice)
  const multipleChoiceStep = isMultipleChoice(bookChoice)
  const pronounsTheory = !result && step.id === 'pronouns-theory'
  const keyPhrasesStep = !result && step.id === 'greetings-theory'
  const references = active && !result ? referencesForExercise(lessonReferences, active.id) : []
  const reference = references.length > 0
    ? <LessonReferenceSheet key={active?.id} references={references} compactTrigger={fillBlankStep} />
    : undefined
  const matchedPairs = showMatching ? foundPronounPairs(progress) : []
  const stageProgress = result || showMatching ? undefined : stageQuestionProgress(stepQuestions, progress.attempt, active?.id)

  useLayoutEffect(() => {
    reader.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step.id, result, active?.id])

  function navigate(stepId: string, replay = false) {
    setAnswered(undefined)
    save(moveLessonStage(current(), stepId, replay))
  }

  function saveWordVisit(previous: LessonProgress, nextProgress: LessonProgress, item: WordIntro) {
    if (previous === nextProgress) return
    const nextStage = steps[index + 1]
    const stageFinished = hasScore(nextProgress.attempt, item.id) &&
      stepQuestions.every(({ id }) => hasScore(nextProgress.attempt, id))
    save(stageFinished && nextStage ? moveLessonStage(nextProgress, nextStage.id) : nextProgress)
  }

  function next() {
    if (active) return
    const incomplete = index + 1 === last ? firstIncompleteStep(current().attempt, steps) : undefined
    if (incomplete) {
      navigate(incomplete.id)
      return
    }
    navigate(steps[index + 1]?.id ?? '@result')
  }

  function close() {
    if (result) save({ ...current(), stepId: undefined })
    onClose()
  }

  const numbered = keyPhrasesStep || step.id === 'greetings-practice' ||
    step.id === 'phrase-translation' || showMatching || multipleChoiceStep || fillBlankStep ||
    (step.kind === 'theory' && step.panels.some((panel) => panel.kind === 'heading' && panel.label))
  const headerTitle = result ? 'Результат' : numbered
    ? `Урок ${lessonNumber}, часть ${lessonPart(steps, index, active?.id)}` : stageTitles[step.id] ?? step.title
  const previousStage = result ? steps[last - 1] : steps[index - 1]
  const confirmExit = () => exitDialog.current?.showModal()
  return <section className={`lesson-reader${keyPhrasesStep ? ' lesson-reader--key-phrases' : newWord ? ' lesson-reader--word-intro' : multipleChoiceStep || fillBlankStep ? ' lesson-reader--choice' : pronounsTheory ? ' lesson-reader--pronouns' : showMatching ? ' lesson-reader--matching' : ''}`} aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') confirmExit() }}>
    <ReaderHeader headingRef={heading} title={headerTitle}
      onBack={previousStage ? () => navigate(previousStage.id) : undefined}
      onClose={confirmExit} progress={stageProgress} />
    <LessonExitDialog dialogRef={exitDialog} onExit={close} />
    <div className="reader-scroll" ref={reader}>
      <div className="reader-content">
      {warnings}
      {result ? <div className="reader-panel">
        <LessonResult summary={lessonResult(exercises, progress)} />
        <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary" onClick={close}>Завершить</button>
          <button className="lesson-option reader-result__replay" onClick={() => navigate(steps[0].id, true)}>Пройти ещё раз</button>
        </ReaderAction>
      </div> : <>
        <div className="reader-panel">
          {!fillBlankStep && reference}
          {step.kind === 'theory' ? <>
            {keyPhrasesStep && <div className="reader-phrase-intro">
              <p className="lesson-accent-heading">Начнём!</p>
              <h2>{step.title}</h2>
            </div>}
            {stageTitles[step.id] && !step.panels.some(({ kind }) => kind === 'heading') && <h2>{step.title}</h2>}
            {step.panels.map((panel, panelIndex) => <TheoryCard key={panelIndex} panel={panel} />)}
          </> : showMatching ? <MatchingCard key={active?.id} actionTarget={actionTarget} matched={matchedPairs}
            pairs={pronounMatching.pairs} prompt="Сопоставьте короткую и полную формы"
            leftLabel="Короткие формы" rightLabel="Полные формы"
            onMatch={(left, right) => {
              const previous = current()
              const nextProgress = recordPronounPair(previous, left, right, exercises, cloud)
              if (nextProgress !== previous) save(nextProgress)
            }}
            onContinue={() => {
              const previous = current()
              if (hasScore(previous.attempt, pronounMatching.id)) save({ ...previous, choiceDraft: undefined })
            }} /> : bookChoice ? <BookChoiceCard key={bookChoice.id} actionTarget={actionTarget} exercise={bookChoice} selected={selectedOption}
            score={progress.attempt[bookChoice.id]} order={selectedOrder} reference={fillBlankStep ? reference : undefined}
            onOrder={(order) => {
              const previous = current()
              if (!hasScore(previous.attempt, bookChoice.id)) {
                save({ ...previous, choiceDraft: { exerciseId: bookChoice.id, optionId: '', order } })
              }
            }}
            onSelect={(optionId) => {
              const previous = current()
              if (hasScore(previous.attempt, bookChoice.id)) return
              save({ ...previous, choiceDraft: { exerciseId: bookChoice.id, optionId } })
            }} onCheck={() => {
              const previous = current()
              const draft = previous.choiceDraft
              if (draft?.exerciseId !== bookChoice.id || hasScore(previous.attempt, bookChoice.id)) return
              const inputs = bookChoice.kind === 'word_order' ? selectedOrder : [draft.optionId]
              if (inputs.length && inputs.every((id) => bookChoice.options.some((option) => option.id === id)) &&
                  (bookChoice.kind !== 'word_order' || inputs.length === bookChoice.options.length)) {
                save(markAnswer(previous, bookChoice, inputs, exercises, cloud))
              }
            }} onContinue={() => {
              const previous = current()
              if (!hasScore(previous.attempt, bookChoice.id)) return
              if (stepQuestions.every(({ id }) => hasScore(previous.attempt, id))) {
                const destination = steps[index + 1] ?? firstIncompleteStep(previous.attempt, steps)
                navigate(destination?.id ?? '@result')
              } else save({ ...previous, choiceDraft: undefined })
            }} /> : newWord ? <NewWordCard key={newWord.id} actionTarget={actionTarget} word={newWord.word}
            forms={introForms} revealed={progress.wordDecisions?.[newWord.id] === 'learn'}
            onKnow={() => {
              const previous = current()
              saveWordVisit(previous, markWordDecision(previous, newWord, 'known', exercises, cloud), newWord)
            }}
            onLearn={() => {
              const previous = current()
              if (previous.wordDecisions?.[newWord.id] === 'learn') return true
              if (hasScore(previous.attempt, newWord.id) || !studyWord(newWord.word.catalogId)) return false
              save(markWordDecision(previous, newWord, 'learn', exercises, cloud))
              return true
            }}
            onContinue={() => {
              const previous = current()
              saveWordVisit(previous, finishWordIntro(previous, newWord, exercises, cloud), newWord)
            }} /> : active && exerciseTemplate(active) === 'unsupported' ?
            <p role="status">Этот тип задания пока не поддерживается.</p>
          : active && active.kind !== 'word_intro' ? <ExerciseCard key={active.id} actionTarget={actionTarget} exercise={active} onAnswer={(answer) => {
            setAnswered(active)
            save(markAnswer(current(), active, answer, exercises, cloud))
          }} onContinue={() => setAnswered(undefined)} /> : <p>Упражнения этого шага завершены.</p>}
        </div>
        {!active && <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary" onClick={next}>Продолжить</button>
        </ReaderAction>}
      </>}
      </div>
    </div>
    <div className="reader-action" ref={setActionTarget} />
  </section>
}
