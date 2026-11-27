import type { Option } from './engine'

export function AnswerGrid({ options, language, selected, checked, result, onSelect, className }: {
  options: Option[]; language?: 'et' | 'ru'; selected?: string; checked: boolean; className?: string
  result: (id: string) => 'selected' | 'correct' | 'incorrect' | undefined
  onSelect: (id: string) => void
}) {
  return <div className={['book-choice-options', 'answer-grid', className].filter(Boolean).join(' ')}
    data-size={options.length > 4 ? 'compact' : 'large'} role="group" aria-label="Варианты ответа">
    {options.map(({ id, text }) => {
      const state = result(id)
      return <button key={id} className="lesson-option" type="button" lang={language} disabled={checked}
        aria-pressed={id === selected} data-result={state === 'selected' ? undefined : state}
        onClick={() => onSelect(id)}>
        {text}{state === 'correct' && <span lang="ru" className="sr-only"> Правильный ответ</span>}
        {state === 'incorrect' && <span lang="ru" className="sr-only"> Неверный ответ</span>}
      </button>
    })}
  </div>
}
