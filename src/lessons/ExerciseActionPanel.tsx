import { useEffect, useState } from 'react'
import { ReaderAction } from './ReaderLayout'

export function ExerciseActionPanel({ target, outcome, animate, onAnimationEnd, correctAnswer, label, disabled, onAction }: {
  target: HTMLDivElement | null; outcome?: 'correct' | 'incorrect'; animate?: boolean; onAnimationEnd?: () => void
  correctAnswer?: string; label: string; disabled: boolean; onAction: () => void
}) {
  return <ReaderAction target={target}>
    <div className="exercise-action-panel" data-outcome={outcome} data-animate={animate || undefined}
      onAnimationEnd={(event) => { if (event.target === event.currentTarget) onAnimationEnd?.() }}>
      <div className="exercise-action-panel__inner">
        {outcome && <div role="status">
          <p className="exercise-action-panel__feedback">
            <span aria-hidden="true">{outcome === 'correct' ? '✓' : '×'}</span>{outcome === 'correct' ? 'Верно!' : 'Неверно!'}
          </p>
          {correctAnswer && <p className="exercise-action-panel__answer">Правильный ответ: {correctAnswer}</p>}
        </div>}
        <button type="button" className={`tactile-button tactile-button--${outcome === 'correct' ? 'green' : outcome === 'incorrect' ? 'red' : 'primary'}`}
          disabled={disabled} onClick={onAction}>{label}</button>
      </div>
    </div>
  </ReaderAction>
}

export function ChoiceActionPanel({ target, selected, score, correctAnswer, idleContinue, onCheck, onContinue }: {
  target: HTMLDivElement | null; selected?: string; score?: number; correctAnswer?: string; idleContinue?: boolean
  onCheck: () => void; onContinue: () => void
}) {
  const [animating, setAnimating] = useState(false)
  const checked = score !== undefined
  const outcome = checked ? (score ? 'correct' : 'incorrect') : undefined

  useEffect(() => {
    if (!animating) return
    const fallback = window.setTimeout(() => setAnimating(false), 400)
    return () => window.clearTimeout(fallback)
  }, [animating])

  function check() {
    if (!selected || checked) return
    setAnimating(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    onCheck()
  }

  return <ExerciseActionPanel target={target} outcome={outcome}
    correctAnswer={outcome === 'incorrect' ? correctAnswer : undefined} animate={checked && animating}
    onAnimationEnd={() => setAnimating(false)} disabled={checked ? animating : !selected}
    label={checked || (idleContinue && !selected) ? 'Продолжить' : 'Проверить'} onAction={checked ? onContinue : check} />
}
