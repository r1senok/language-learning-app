import { useState } from 'react'
import type { newWordExercises } from './greetingsContent'

export function NewWordCard({ exercise, onAnswer, onContinue }: {
  exercise: (typeof newWordExercises)[number]
  onAnswer: (answers: string[]) => void
  onContinue: () => void
}) {
  const [selected, setSelected] = useState<string>()
  const [checked, setChecked] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const right = selected === exercise.correct
  const word = exercise.word

  function check() {
    if (!selected || checked) return
    setShowHint(false)
    setChecked(true)
    onAnswer([selected])
  }

  return <div className="new-word-card">
    <span className="new-word-label" lang="en">NEW WORD</span>
    <button className="new-word-prompt" type="button" aria-expanded={showHint} aria-controls="new-word-hint"
      onClick={() => setShowHint(!showHint)} lang="et">{word.et}</button>
    <div id="new-word-hint" hidden={!showHint} className="new-word-hint">
      <strong>{word.ru}</strong><p lang="et">{word.forms}</p>
      {'note' in word && <small>{word.note}</small>}
    </div>
    <div className="new-word-options" aria-label="Варианты перевода">
      {exercise.options.map(({ id, text }) => {
        const correct = checked && id === exercise.correct
        const incorrect = checked && id === selected && !right
        return <button className="lesson-option" type="button" key={id} aria-pressed={id === selected}
          disabled={checked} data-result={correct ? 'correct' : incorrect ? 'incorrect' : undefined}
          onClick={() => setSelected(id)}>
          {text}{correct && <span aria-label="Правильный ответ">✓</span>}
          {incorrect && <span aria-label="Неверный ответ">×</span>}
        </button>
      })}
    </div>
    <div className="reader-sticky-action">
      {checked && <div className={`lesson-feedback lesson-feedback--${right ? 'correct' : 'incorrect'}`} role="status">
        <strong>{right ? 'Верно!' : 'Неверно'}</strong><p>{word.ru} · <span lang="et">{word.forms}</span></p>
      </div>}
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="button"
        disabled={!selected} onClick={checked ? onContinue : check}>
        {checked ? 'Продолжить' : 'Проверить'}
      </button>
    </div>
  </div>
}
