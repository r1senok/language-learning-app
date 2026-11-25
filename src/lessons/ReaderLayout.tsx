import type { ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'

export function ReaderHeader({ title, headingRef, onBack, onClose, progress }: {
  title: string; headingRef: Ref<HTMLHeadingElement>; onBack?: () => void; onClose: () => void
  progress?: { question: number; completed: number; total: number }
}) {
  return <header className="reader-bar">
    <div className="reader-bar__inner">
      <button className="lesson-option reader-close reader-header-back" onClick={onBack}
        disabled={!onBack} aria-label="К предыдущему этапу">←</button>
      <h1 id="reader-heading" ref={headingRef} tabIndex={-1}>{title}</h1>
      <button className="lesson-option reader-close reader-header-exit" onClick={onClose} aria-label="Закрыть урок">×</button>
      {progress && <div className="reader-bar__progress">
        <progress aria-label="Прогресс этапа" value={progress.completed} max={progress.total} />
        <span className="reader-stage" aria-label={`Вопрос ${progress.question} из ${progress.total}`}>
          {progress.question} / {progress.total}
        </span>
      </div>}
    </div>
  </header>
}

export function ReaderInstruction({ children }: { children: ReactNode }) {
  return <p className="reader-instruction">{children}</p>
}

export function ReaderAction({ target, children }: { target: HTMLDivElement | null; children: ReactNode }) {
  return target ? createPortal(children, target) : null
}
