import { MultipleChoiceCard } from './MultipleChoiceCard'
import { FillInBlank } from './FillInBlank'
import type { ReactNode } from 'react'
import { exerciseTemplate, isFillBlank } from './lessonTemplates'
import { shuffledWordBank } from './wordBank'
import { useMemo } from 'react'
import { ReaderAction, ReaderInstruction } from './ReaderLayout'
import type { BookExercise, FillBlank, MultipleChoice } from './engine'

export function BookChoiceCard({ actionTarget, exercise, selected, order, score, reference, onSelect, onOrder, onCheck, onContinue }: {
  actionTarget: HTMLDivElement | null; exercise: BookExercise | MultipleChoice | FillBlank; reference?: ReactNode; selected?: string; order: string[]; score?: number
  onSelect: (option: string) => void; onOrder: (order: string[]) => void
  onCheck: () => void; onContinue: () => void
}) {
  const { options } = exercise
  const choices = useMemo(() => exercise.kind === 'word_order'
    ? shuffledWordBank(exercise.id, exercise.options, exercise.order) : exercise.options, [exercise])
  if (isFillBlank(exercise)) {
    return <FillInBlank exercise={exercise} reference={reference} actionTarget={actionTarget} selected={selected}
      score={score} onSelect={onSelect} onCheck={onCheck} onContinue={onContinue} />
  }
  const { book } = exercise
  if (exercise.kind === 'multiple_choice' && exerciseTemplate(exercise) === 'multiple_choice') {
    return <MultipleChoiceCard exercise={exercise} actionTarget={actionTarget} selected={selected}
      score={score} onSelect={onSelect} onCheck={onCheck} onContinue={onContinue} />
  }
  if (!book) return <p>Этот тип задания пока не поддерживается.</p>
  const checked = score !== undefined
  const ordered = exercise.kind === 'word_order'
  const correct = ordered ? [] : exercise.accepted ?? [exercise.correct]
  const valid = ordered ? order.length === options.length : Boolean(selected)
  const answer = ordered ? exercise.explanation : correct.join(' / ')
  const optionText = (id: string) => options.find((option) => option.id === id)?.text

  return <div className="new-word-card book-choice-card">
    {book.mode !== 'translate' && <ReaderInstruction>
      {ordered ? 'Соберите предложение' : book.heading}
    </ReaderInstruction>}
    <p className="book-choice-prompt" lang={book.language}>
      {exercise.prompt}{book.language === 'et' && ' → ?'}
    </p>
    {ordered && <div className="lesson-bank" aria-label="Собранное предложение">
      {order.map((id) => <button className="lesson-option" type="button" key={id} lang="et" disabled={checked}
        onClick={() => onOrder(order.filter((part) => part !== id))}>{optionText(id)}</button>)}
    </div>}
    <div className={`book-choice-options${options.length > 4 ? ' book-choice-options--grid' : ''}`} aria-label="Варианты ответа">
      {choices.map(({ id, text }) => {
        const right = checked && correct.includes(id)
        const wrong = checked && !correct.includes(id) && id === selected
        return <button className="lesson-option" type="button" key={id} lang="et" aria-pressed={id === selected}
          disabled={checked || order.includes(id)} data-result={right ? 'correct' : wrong ? 'incorrect' : undefined}
          onClick={() => ordered ? onOrder([...order, id]) : onSelect(id)}>
          {text}{right && <span aria-label="Правильный ответ"> ✓</span>}{wrong && <span aria-label="Неверный ответ"> ×</span>}
        </button>
      })}
    </div>
    <ReaderAction target={actionTarget}>
      {checked && <div className={`lesson-feedback lesson-feedback--${score ? 'correct' : 'incorrect'}`} role="status">
        <strong>{score ? 'Верно!' : 'Неверно'}</strong>{checked && <> · <span lang="et">{answer}</span></>}
      </div>}
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="button"
        disabled={!checked && !valid} onClick={checked ? onContinue : onCheck}>
        {checked ? 'Продолжить' : 'Проверить'}
      </button>
    </ReaderAction>
  </div>
}
