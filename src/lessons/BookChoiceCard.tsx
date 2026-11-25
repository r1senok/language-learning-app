import type { BookChoice, BookExercise } from './engine'

export function BookChoiceCard({ exercise, selected, order, score, matching, pairActive, onSelect, onOrder, onPair, onCheck, onContinue }: {
  exercise: BookExercise; selected?: string; order: string[]; score?: number
  matching: { question: BookChoice; done: boolean }[]; pairActive: boolean
  onSelect: (option: string) => void; onOrder: (order: string[]) => void
  onPair: (id: string) => void; onCheck: () => void; onContinue: () => void
}) {
  const { book, options } = exercise
  const checked = score !== undefined
  const ordered = exercise.kind === 'word_order'
  const correct = ordered ? [] : exercise.accepted ?? [exercise.correct]
  const match = book.mode === 'match'
  const wrongPair = match && selected && !checked
  const valid = ordered ? order.length === options.length : Boolean(selected)
  const answer = ordered ? exercise.explanation : correct.join(' / ')
  const optionText = (id: string) => options.find((option) => option.id === id)?.text
  const gap = book.mode === 'gap' ? exercise.prompt.split('…') : undefined

  return <div className="new-word-card book-choice-card">
    <div className="book-choice-count">
      <strong>Упражнение №{book.number}</strong><span>{match ? matching.filter(({ done }) => done).length : book.question} / {book.total}</span>
    </div>
    <progress aria-label="Прогресс упражнения" value={match ? matching.filter(({ done }) => done).length : book.question - Number(!checked)} max={book.total} />
    <h3>{book.heading}</h3>
    {gap ? <p className="book-choice-prompt" lang="et">
      {gap[0]}<strong className="reader-accent">{selected || '…'}</strong>{gap[1]}
    </p> : !match && <p className="book-choice-prompt" lang={book.language}>
      {exercise.prompt}{book.language === 'et' && ' → ?'}
    </p>}
    {ordered && <div className="lesson-bank" aria-label="Собранное предложение">
      {order.map((id) => <button className="lesson-option" type="button" key={id} lang="et" disabled={checked}
        onClick={() => onOrder(order.filter((part) => part !== id))}>{optionText(id)}</button>)}
    </div>}
    <div className={match ? 'lesson-pairs' : undefined}>
      {match && <div>{matching.map(({ question, done }) => <button className="lesson-option" type="button" key={question.id}
        lang="et" aria-pressed={pairActive && question.id === exercise.id} disabled={done || checked} onClick={() => onPair(question.id)}>
        {question.prompt}{done && ` → ${question.correct} ✓`}
      </button>)}</div>}
      <div className={`book-choice-options${!match && options.length > 4 ? ' book-choice-options--grid' : ''}`} aria-label="Варианты ответа">
        {options.map(({ id, text }) => {
          const right = !match && checked && correct.includes(id)
          const wrong = (wrongPair || checked && !correct.includes(id)) && id === selected
          const matched = match && matching.some(({ question, done }) => done && question.correct === id)
          return <button className="lesson-option" type="button" key={id} lang="et" aria-pressed={id === selected}
            disabled={checked || matched || (match && !pairActive) || order.includes(id)} data-result={right ? 'correct' : wrong ? 'incorrect' : undefined}
            onClick={() => ordered ? onOrder([...order, id]) : onSelect(id)}>
            {text}{right && <span aria-label="Правильный ответ"> ✓</span>}{wrong && <span aria-label="Неверный ответ"> ×</span>}
          </button>
        })}
      </div>
    </div>
    <div className="reader-sticky-action">
      {(checked || wrongPair) && <div className={`lesson-feedback lesson-feedback--${score ? 'correct' : 'incorrect'}`} role="status">
        <strong>{score ? 'Верно!' : 'Неверно'}</strong>{checked && <> · <span lang="et">{answer}</span></>}
      </div>}
      {(!match || checked) && <button className="tactile-button tactile-button--primary tactile-button--wide" type="button"
        disabled={!checked && !valid} onClick={checked ? onContinue : onCheck}>
        {checked ? 'Продолжить' : 'Проверить'}
      </button>}
    </div>
  </div>
}
