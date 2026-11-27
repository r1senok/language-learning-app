import { ReaderAction } from './ReaderLayout'

export function ExerciseActionPanel({ target, outcome, animate, onAnimationEnd, label, disabled, onAction }: {
  target: HTMLDivElement | null; outcome?: 'correct' | 'incorrect'; animate?: boolean; onAnimationEnd?: () => void
  label: string; disabled: boolean; onAction: () => void
}) {
  return <ReaderAction target={target}>
    <div className="exercise-action-panel" data-outcome={outcome} data-animate={animate || undefined}
      onAnimationEnd={(event) => { if (event.target === event.currentTarget) onAnimationEnd?.() }}>
      <div className="exercise-action-panel__inner">
        {outcome && <p className="exercise-action-panel__feedback" role="status">
          <span aria-hidden="true">{outcome === 'correct' ? '✓' : '×'}</span>{outcome === 'correct' ? 'Верно!' : 'Неверно!'}
        </p>}
        <button type="button" className={`tactile-button tactile-button--${outcome === 'correct' ? 'green' : outcome === 'incorrect' ? 'red' : 'primary'}`}
          disabled={disabled} onClick={onAction}>{label}</button>
      </div>
    </div>
  </ReaderAction>
}
