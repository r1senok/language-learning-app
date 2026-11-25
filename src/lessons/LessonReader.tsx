import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { completion, hasScore, isBookChoice, markAnswer } from './engine'
import type { Exercise, LessonProgress } from './engine'
import { firstIncompleteStep, stageQuestionProgress, stepExercises, lessonReferences, referencesForExercise } from './readerContent'
import type { ReaderStep } from './readerContent'
import { PronounMatchingCard } from './PronounMatchingCard'
import { pronounMatching } from './tereLessonContent'
import { foundPronounPairs, recordPronounPair } from './matchingProgress'
import { BookChoiceCard } from './BookChoiceCard'
import { ExerciseCard } from './ExerciseCard'
import { NewWordCard } from './NewWordCard'
import { ReaderAction, ReaderHeader } from './ReaderLayout'
import { TheoryCard } from './TheoryCard'
import { LessonReferenceSheet } from './LessonReferenceSheet'
import { newWordExercises } from './greetingsContent'

const stageTitles: Record<string, string> = {
  'greetings-practice': 'Новые слова',
  'pronouns-theory': 'Местоимения',
  'olema-theory': 'Глагол olema',
  'olema-practice': 'Формы olema',
  'negation-theory': 'Отрицание',
}

export function LessonReader({ steps, progress, current, save, onClose, cloud, warnings }: {
  steps: ReaderStep[]; progress: LessonProgress; current: () => LessonProgress; save: (progress: LessonProgress) => void
  onClose: () => void; cloud: boolean; warnings: ReactNode
}) {
  const [answered, setAnswered] = useState<Exercise>()
  const reader = useRef<HTMLDivElement>(null)
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const exercises = steps.flatMap((step) => stepExercises(step, progress.attempt))
  const last = steps.length
  const result = progress.stepId === '@result'
  const step = steps.find((item) => item.id === progress.stepId) ?? firstIncompleteStep(progress.attempt, steps) ?? steps[last - 1]
  const index = steps.indexOf(step)
  const stepQuestions = stepExercises(step, progress.attempt)
  const draftQuestion = stepQuestions.find(({ id }) => id === progress.choiceDraft?.exerciseId)
  const active = answered ?? ((isBookChoice(draftQuestion) || draftQuestion?.id === pronounMatching.id) ? draftQuestion : undefined)
    ?? stepQuestions.find(({ id }) => !hasScore(progress.attempt, id))
  const bookChoice = !result && isBookChoice(active) ? active : undefined
  const selectedOption = bookChoice?.options.find(({ id }) => progress.choiceDraft?.exerciseId === bookChoice.id &&
    progress.choiceDraft.optionId === id)?.id
  const selectedOrder = bookChoice && progress.choiceDraft?.exerciseId === bookChoice.id
    ? [...new Set(progress.choiceDraft.order ?? [])].filter((id) => bookChoice.options.some((option) => option.id === id)) : []
  const showMatching = !result && active?.id === pronounMatching.id
  const newWord = active && newWordExercises.find(({ id }) => id === active.id)
  const keyPhrasesStep = !result && step.id === 'greetings-theory'
  const references = active && !result ? referencesForExercise(lessonReferences, active.id) : []
  const stageProgress = result || showMatching ? undefined : stageQuestionProgress(stepQuestions, progress.attempt, active?.id)

  useLayoutEffect(() => {
    reader.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step.id, result, active?.id])

  function navigate(stepId: string, replay = false) {
    setAnswered(undefined)
    const previous = current()
    save({ ...previous, stepId, attempt: replay ? {} : previous.attempt, choiceDraft: undefined })
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

  const recorded = result && exercises.some(({ id }) => !hasScore(progress.attempt, id))
    ? Object.values(progress.attempt) : exercises.map(({ id }) => progress.attempt[id] ?? 0)
  const score = recorded.reduce((sum, value) => sum + value, 0)
  return <section className={`lesson-reader${keyPhrasesStep ? ' lesson-reader--key-phrases' : ''}`} aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') close() }}>
    <ReaderHeader headingRef={heading} title={result ? 'Урок завершён' : stageTitles[step.id] ?? step.title}
      onClose={close} progress={stageProgress} />
    <div className="reader-scroll" ref={reader}>
      <div className="reader-content">
      {warnings}
      {result ? <div className="reader-panel">
        <p>Верных ответов в этой попытке: {score} из {recorded.length}.</p>
        <p>Лучший результат: {progress.best[completion] ?? 0}%.</p>
        <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary tactile-button--wide"
            onClick={() => navigate(steps[0].id, true)}>Пройти ещё раз</button>
        </ReaderAction>
      </div> : <>
        <div className="reader-panel">
          {references.length > 0 && <LessonReferenceSheet key={`reference-${active?.id}`} references={references} />}
          {step.kind === 'theory' ? <>
            {stageTitles[step.id] && !step.panels.some(({ kind }) => kind === 'explanation') && <h2>{step.title}</h2>}
            {step.panels.map((panel, panelIndex) => <TheoryCard key={panelIndex} panel={panel} />)}
          </> : showMatching ? <PronounMatchingCard actionTarget={actionTarget} matched={foundPronounPairs(progress)}
            onMatch={(left, right) => {
              const previous = current()
              const nextProgress = recordPronounPair(previous, left, right, exercises, cloud)
              if (nextProgress !== previous) save(nextProgress)
            }}
            onContinue={() => {
              const previous = current()
              if (hasScore(previous.attempt, pronounMatching.id)) save({ ...previous, choiceDraft: undefined })
            }} /> : bookChoice ? <BookChoiceCard key={bookChoice.id} actionTarget={actionTarget} exercise={bookChoice} selected={selectedOption}
            score={progress.attempt[bookChoice.id]} order={selectedOrder}
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
              if (draft?.exerciseId !== bookChoice.id) return
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
            }} /> : newWord ? <NewWordCard key={newWord.id} actionTarget={actionTarget} exercise={newWord} onAnswer={(answer) => {
            setAnswered(newWord)
            save(markAnswer(current(), newWord, answer, exercises, cloud))
          }} onContinue={() => {
            if (newWordExercises.every(({ id }) => hasScore(current().attempt, id))) navigate(steps[index + 1].id)
            else setAnswered(undefined)
          }} /> : active ? <ExerciseCard key={active.id} actionTarget={actionTarget} exercise={active} onAnswer={(answer) => {
            setAnswered(active)
            save(markAnswer(current(), active, answer, exercises, cloud))
          }} onContinue={() => setAnswered(undefined)} /> : <p>Упражнения этого шага завершены.</p>}
        </div>
        {!newWord && !bookChoice && !showMatching && index > 0 &&
          <button className="reader-back" onClick={() => navigate(steps[index - 1].id)}>Назад</button>}
        {!active && <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary" onClick={next}>Продолжить</button>
        </ReaderAction>}
      </>}
      </div>
    </div>
    <div className="reader-action" ref={setActionTarget} />
  </section>
}
