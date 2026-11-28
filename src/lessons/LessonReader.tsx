import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { completeLesson, finishWordIntro, hasScore, lessonResult, markAnswer, markWordDecision, moveLessonStage, wordOrderReady } from './engine'
import type { Exercise, LessonProgress, WordIntro } from './engine'
import { adjacentPart, firstIncompletePart, nextPartId, partExercises } from './lessonModel'
import type { LessonDefinition } from './lessonModel'
import { stageQuestionProgress, referencesForExercise } from './readerContent'
import { exerciseTemplate, isFillBlank, isMultipleChoice, usesChoiceDraft } from './lessonTemplates'
import { checkRetry, continueRetry, masteredScores, practiceFinished, reviewQuestions } from './reviewQueue'
import { MatchingCard } from './MatchingCard'
import { foundMatchingPairs, recordMatchingPair } from './matchingProgress'
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

export function LessonReader({ lesson, progress, current, save, onClose, studyWord, catalogWords, cloud, warnings }: {
  lesson: LessonDefinition; progress: LessonProgress; current: () => LessonProgress; save: (progress: LessonProgress) => void
  onClose: () => void; studyWord: (catalogId: string) => boolean; catalogWords: Word[]; cloud: boolean; warnings: ReactNode
}) {
  const [answered, setAnswered] = useState<Exercise>()
  const reader = useRef<HTMLDivElement>(null)
  const [actionTarget, setActionTarget] = useState<HTMLDivElement | null>(null)
  const exitDialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { parts } = lesson
  const exercises = parts.flatMap((part) => partExercises(part, progress.attempt))
  const result = progress.stepId === '@result'
  const partScores = lesson.repeatErrors ? masteredScores(progress) : progress.attempt
  const part = parts.find((item) => item.partId === progress.stepId) ?? firstIncompletePart(parts, partScores) ?? parts[parts.length - 1]
  const partQuestions = partExercises(part, progress.attempt)
  const draftQuestion = partQuestions.find(({ id }) => id === progress.choiceDraft?.exerciseId)
  const firstQuestion = partQuestions.find(({ id }) => !hasScore(progress.attempt, id))
  const retryQueue = lesson.repeatErrors && !firstQuestion ? reviewQuestions(part.partId, partQuestions, progress) : []
  const active = answered ?? ((usesChoiceDraft(draftQuestion) || draftQuestion?.kind === 'matching_pairs') ? draftQuestion : undefined)
    ?? firstQuestion ?? partQuestions.find(({ id }) => id === retryQueue[0])
  const retrying = Boolean(progress.choiceDraft?.retry || (!draftQuestion && active?.id && active.id === retryQueue[0]))
  const matchingExercise = !result && (active ?? (partQuestions.length === 1 ? partQuestions[0] : undefined))
  const matching = matchingExercise && matchingExercise.kind === 'matching_pairs' && matchingExercise.matchingMode !== 'submit'
    ? matchingExercise : undefined
  const bookChoice = !result && usesChoiceDraft(active) ? active : undefined
  const selectedOption = bookChoice?.options.find(({ id }) => progress.choiceDraft?.exerciseId === bookChoice.id &&
    progress.choiceDraft.optionId === id)?.id
  const selectedOrder = bookChoice && progress.choiceDraft?.exerciseId === bookChoice.id
    ? [...new Set(progress.choiceDraft.order ?? [])].filter((id) => bookChoice.options.some((option) => option.id === id)) : []
  const newWord = !result && active?.kind === 'word_intro' ? active : undefined
  const catalogWord = newWord && catalogWords.find(({ catalogId }) => catalogId === newWord.word.catalogId)
  const catalogForms = studyGrammarRows(catalogWord?.partOfSpeech, catalogWord?.grammaticalForms).map(({ value }) => value)
  const introForms = catalogForms.length ? catalogForms : newWord?.word.forms?.split(', ') ?? []
  const fillBlankStep = isFillBlank(bookChoice)
  const multipleChoiceStep = isMultipleChoice(bookChoice)
  const wordOrderStep = bookChoice?.kind === 'word_order'
  const theoryPresentation = !result && part.kind === 'theory' ? part.presentation : undefined
  const keyPhrasesStep = !result && part.templateType === 'phrases'
  const references = active && !result ? referencesForExercise(lesson.references ?? [], active.id) : []
  const reference = references.length > 0
    ? <LessonReferenceSheet key={active?.id} references={references} compactTrigger={fillBlankStep} />
    : undefined
  const matchedPairs = matching ? foundMatchingPairs(matching, progress) : []
  const stageProgress = result || matching ? undefined : stageQuestionProgress(partQuestions, partScores, active?.id)

  useLayoutEffect(() => {
    reader.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [part.partId, result, active?.id])

  useLayoutEffect(() => {
    if (!bookChoice && active?.kind !== 'matching_pairs') return
    const latest = current()
    if (!latest.attemptSeed) save({ ...latest, attemptSeed: crypto.getRandomValues(new Uint32Array(1))[0].toString(36) })
  }, [bookChoice, active, current, save, progress.attemptSeed])

  function navigate(stepId: string, replay = false) {
    setAnswered(undefined)
    save(moveLessonStage(current(), stepId, replay))
  }

  function saveWordVisit(previous: LessonProgress, nextProgress: LessonProgress, item: WordIntro) {
    if (previous === nextProgress) return
    const stageFinished = hasScore(nextProgress.attempt, item.id) &&
      partQuestions.every(({ id }) => hasScore(nextProgress.attempt, id))
    save(stageFinished ? enterNextPart(nextProgress) : nextProgress)
  }

  function enterNextPart(previous: LessonProgress) {
    const destination = nextPartId(parts, part.partId, lesson.repeatErrors ? masteredScores(previous) : previous.attempt)
    const next = moveLessonStage({ ...previous, choiceDraft: undefined }, destination)
    return destination === '@result' ? completeLesson(next, exercises, cloud) : next
  }

  function advancePart() {
    setAnswered(undefined)
    save(enterNextPart(current()))
  }

  function close() {
    if (result) save({ ...current(), stepId: undefined })
    onClose()
  }

  const headerTitle = result ? 'Результат' : `${lesson.checkpointTitle ?? `Урок ${lesson.number}`}, часть ${part.order}`
  const previousStage = adjacentPart(parts, result ? '@result' : part.partId, -1)
  const confirmExit = () => exitDialog.current?.showModal()
  return <section className={`lesson-reader${keyPhrasesStep ? ' lesson-reader--key-phrases' : newWord ? ' lesson-reader--word-intro' : multipleChoiceStep || fillBlankStep || wordOrderStep ? ' lesson-reader--choice' : theoryPresentation?.tone === 'theory' ? ' lesson-reader--theory-footer' : matching ? ' lesson-reader--matching' : ''}`} aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') confirmExit() }}>
    <ReaderHeader headingRef={heading} title={headerTitle}
      onBack={previousStage ? () => navigate(previousStage.partId) : undefined}
      onClose={confirmExit} progress={stageProgress} />
    <LessonExitDialog dialogRef={exitDialog} onExit={close} />
    <div className="reader-scroll" ref={reader}>
      <div className="reader-content">
      {warnings}
      {result ? <div className="reader-panel">
        <LessonResult summary={lessonResult(exercises, progress)} />
        <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary" onClick={close}>Завершить</button>
          <button className="lesson-option reader-result__replay" onClick={() => navigate(parts[0].partId, true)}>Пройти ещё раз</button>
        </ReaderAction>
      </div> : <>
        <div className="reader-panel">
          {part.examples?.length && !retrying ? <aside aria-label="Образцы">
            <p className="reader-instruction">{part.examples.length === 1 ? 'Образец' : 'Образцы'}</p>
            {part.examples.map((example) => <p key={example}>{example}</p>)}
          </aside> : null}
          {retrying && <p role="status">Повторение ошибок</p>}
          {!fillBlankStep && reference}
          {part.kind === 'theory' ? <>
            {theoryPresentation?.introLabel && <div className="reader-phrase-intro">
              <p className="lesson-accent-heading">{theoryPresentation.introLabel}</p>
              <h2>{part.title}</h2>
            </div>}
            {part.panels.map((panel, panelIndex) => <TheoryCard key={panelIndex} panel={panel} />)}
          </> : matching ? <MatchingCard key={matching.id} actionTarget={actionTarget} matched={matchedPairs}
            pairs={matching.pairs} shuffleKey={`${progress.attemptSeed ?? ''}:${matching.id}`} prompt={matching.instruction ?? matching.prompt}
            leftLabel={matching.columnLabels?.left ?? 'Левая колонка'} rightLabel={matching.columnLabels?.right ?? 'Правая колонка'}
            onMatch={(left, right) => {
              const previous = current()
              const nextProgress = recordMatchingPair(matching, previous, left, right, exercises, cloud, lesson.repeatErrors)
              if (nextProgress !== previous) save(nextProgress)
            }}
            onContinue={() => {
              const previous = current()
              if (!hasScore(previous.attempt, matching.id)) return
              if (practiceFinished(partQuestions, previous, lesson.repeatErrors)) advancePart()
              else save({ ...previous, choiceDraft: undefined })
            }} /> : bookChoice ? <BookChoiceCard key={bookChoice.id} actionTarget={actionTarget} exercise={bookChoice} attemptSeed={progress.attemptSeed ?? ''} selected={selectedOption}
            score={retrying ? progress.choiceDraft?.reviewScore : progress.attempt[bookChoice.id]} order={selectedOrder} reference={fillBlankStep ? reference : undefined}
            onOrder={(order) => {
              const previous = current()
              if (retrying ? previous.choiceDraft?.reviewScore === undefined : !hasScore(previous.attempt, bookChoice.id)) {
                save({ ...previous, choiceDraft: { exerciseId: bookChoice.id, optionId: '', order, retry: retrying || undefined } })
              }
            }}
            onSelect={(optionId) => {
              const previous = current()
              if (retrying ? previous.choiceDraft?.reviewScore !== undefined : hasScore(previous.attempt, bookChoice.id)) return
              save({ ...previous, choiceDraft: { exerciseId: bookChoice.id, optionId, retry: retrying || undefined } })
            }} onCheck={() => {
              const previous = current()
              const draft = previous.choiceDraft
              if (draft?.exerciseId !== bookChoice.id || (!retrying && hasScore(previous.attempt, bookChoice.id))) return
              const inputs = bookChoice.kind === 'word_order' ? selectedOrder : [draft.optionId]
              if (inputs.length && inputs.every((id) => bookChoice.options.some((option) => option.id === id)) &&
                  (bookChoice.kind !== 'word_order' || wordOrderReady(bookChoice, inputs.length))) {
                save(retrying ? checkRetry(previous, bookChoice, inputs) :
                  markAnswer(previous, bookChoice, inputs, exercises, cloud, lesson.repeatErrors))
              }
            }} onContinue={() => {
              const previous = current()
              if (!hasScore(previous.attempt, bookChoice.id)) return
              const next = retrying ? continueRetry(previous, part.partId, retryQueue) : { ...previous, choiceDraft: undefined }
              if (next === previous) return
              save(practiceFinished(partQuestions, next, lesson.repeatErrors) ? enterNextPart(next) : next)
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
          : active?.kind === 'matching_pairs' ? <ExerciseCard key={active.id} actionTarget={actionTarget} exercise={active} attemptSeed={progress.attemptSeed ?? ''} onAnswer={(answer) => {
            setAnswered(active)
            save(markAnswer(current(), active, answer, exercises, cloud))
          }} onContinue={() => setAnswered(undefined)} /> : <p>Упражнения этого шага завершены.</p>}
        </div>
        {!active && !matching && <ReaderAction target={actionTarget}>
          <button className="tactile-button tactile-button--primary" onClick={advancePart}>Продолжить</button>
        </ReaderAction>}
      </>}
      </div>
    </div>
    <div className="reader-action" ref={setActionTarget} />
  </section>
}
