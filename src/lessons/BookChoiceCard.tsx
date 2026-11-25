import type { BookChoice } from './engine'

export function BookChoiceCard({ exercise, selected, score, onSelect, onCheck, onContinue }: {
  exercise: BookChoice; selected?: string; score?: number
  onSelect: (option: string) => void; onCheck: () => void; onContinue: () => void
}) {
  const { book, options, correct } = exercise
  const checked = score !== undefined
  return <div className="new-word-card book-choice-card">
    <div className="book-choice-count">
      <strong>Упражнение №{book.number}</strong><span>{book.question} / {book.total}</span>
    </div>
    <progress aria-label="Прогресс упражнения" value={book.question - Number(!checked)} max={book.total} />
    <h3>{book.heading}</h3>
    <p className="book-choice-prompt" lang={book.language}>{exercise.prompt}{book.language === 'et' && ' → ?'}</p>
    <div className={`book-choice-options${options.length > 4 ? ' book-choice-options--grid' : ''}`} aria-label="Варианты ответа">
      {options.map(({ id, text }) => {
        const right = checked && id === correct
        const wrong = checked && id === selected && id !== correct
        return <button className="lesson-option" type="button" key={id} lang="et" aria-pressed={id === selected}
          disabled={checked} data-result={right ? 'correct' : wrong ? 'incorrect' : undefined} onClick={() => onSelect(id)}>
          {text}{right && <span aria-label="Правильный ответ"> ✓</span>}{wrong && <span aria-label="Неверный ответ"> ×</span>}
        </button>
      })}
    </div>
    <div className="reader-sticky-action">
      {checked && <div className={`lesson-feedback lesson-feedback--${score ? 'correct' : 'incorrect'}`} role="status">
        <strong>{score ? 'Верно!' : 'Неверно'}</strong> · <span lang="et">{correct}</span>
      </div>}
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="button"
        disabled={!checked && !selected} onClick={checked ? onContinue : onCheck}>
        {checked ? 'Продолжить' : 'Проверить'}
      </button>
    </div>
  </div>
}
