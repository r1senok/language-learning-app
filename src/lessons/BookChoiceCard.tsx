import { TranslationChoiceCard } from './TranslationChoiceCard'
import { shuffledWordBank } from './wordBank'
import { useMemo } from 'react'
import { ReaderAction, ReaderInstruction } from './ReaderLayout'
import type { BookExercise } from './engine'

export function BookChoiceCard({ actionTarget, exercise, selected, order, score, characterSrc, onSelect, onOrder, onCheck, onContinue }: {
  actionTarget: HTMLDivElement | null; exercise: BookExercise; selected?: string; order: string[]; score?: number; characterSrc?: string
  onSelect: (option: string) => void; onOrder: (order: string[]) => void
  onCheck: () => void; onContinue: () => void
}) {
  const { book, options } = exercise
  const choices = useMemo(() => exercise.kind === 'word_order'
    ? shuffledWordBank(exercise.id, exercise.options, exercise.order) : exercise.options, [exercise])
  if (exercise.kind === 'multiple_choice' && book.mode === 'translate') {
    return <TranslationChoiceCard exercise={exercise} actionTarget={actionTarget} selected={selected}
      score={score} characterSrc={characterSrc} onSelect={onSelect} onCheck={onCheck} onContinue={onContinue} />
  }
  const checked = score !== undefined
  const ordered = exercise.kind === 'word_order'
  const correct = ordered ? [] : exercise.accepted ?? [exercise.correct]
  const valid = ordered ? order.length === options.length : Boolean(selected)
  const answer = ordered ? exercise.explanation : correct.join(' / ')
  const optionText = (id: string) => options.find((option) => option.id === id)?.text
  const gap = book.mode === 'gap' ? exercise.prompt.split('…') : undefined

  return <div className="new-word-card book-choice-card">
    {book.mode !== 'translate' && <ReaderInstruction>
      {ordered ? 'Соберите предложение' : gap ? 'Заполните пропуск' : book.heading}
    </ReaderInstruction>}
    {gap ? <p className="book-choice-prompt" lang="et">
      {gap[0]}<strong className="reader-accent">{selected || '…'}</strong>{gap[1]}
    </p> : <p className="book-choice-prompt" lang={book.language}>
      {exercise.prompt}{book.language === 'et' && ' → ?'}
    </p>}
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
