import type { ReactNode } from 'react'
import { AnswerGrid } from './AnswerGrid'
import { ChoiceActionPanel } from './ExerciseActionPanel'
import type { FillBlank, MultipleChoice } from './engine'

export function FillInBlank({ exercise, reference, actionTarget, selected, score, onSelect, onCheck, onContinue }: {
  exercise: FillBlank | MultipleChoice; reference?: ReactNode; actionTarget: HTMLDivElement | null
  selected?: string; score?: number; onSelect: (id: string) => void; onCheck: () => void; onContinue: () => void
}) {
  const sentence = (exercise.kind === 'fill_blank' ? exercise.sentence : undefined) ?? (() => {
    const gap = exercise.prompt.search(/…|\.{3}/)
    if (gap < 0) return { before: exercise.prompt + ' ', after: '' }
    return { before: exercise.prompt.slice(0, gap), after: exercise.prompt.slice(gap + (exercise.prompt[gap] === '…' ? 1 : 3)) }
  })()
  const accepted = (exercise.kind === 'multiple_choice' ? exercise.accepted : undefined) ?? [exercise.correct]
  const selectedText = exercise.options.find(({ id }) => id === selected)?.text
  const correctAnswer = accepted.map((id) => exercise.options.find((option) => option.id === id)?.text).filter(Boolean).join(' / ')

  return <div className="fill-in-blank">
    <div className="fill-in-blank__heading">
      <h2 className="lesson-accent-heading">Заполните пропуск</h2>
      {reference}
    </div>
    <p className="book-choice-prompt fill-in-blank__sentence"
      lang={exercise.kind === 'multiple_choice' ? exercise.book?.language : exercise.sentence ? 'et' : undefined}>
      {sentence.before}<strong className="reader-accent" lang="et">{selectedText ?? '...'}</strong>{sentence.after}
    </p>
    <AnswerGrid options={exercise.options} language="et" selected={selected} checked={score !== undefined}
      result={(id) => score !== undefined && id === selected ? (score ? 'correct' : 'incorrect') : undefined}
      onSelect={onSelect} />
    <ChoiceActionPanel target={actionTarget} selected={selected} score={score} correctAnswer={correctAnswer}
      idleContinue onCheck={onCheck} onContinue={onContinue} />
  </div>
}
