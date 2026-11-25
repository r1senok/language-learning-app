import type { ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'

export function ReaderHeader({ title, headingRef, onClose, progress }: {
  title: string; headingRef: Ref<HTMLHeadingElement>; onClose: () => void
  progress?: { question: number; completed: number; total: number }
}) {
  return <header className="reader-bar">
    <div className="reader-bar__inner">
      <button className="lesson-option reader-close" onClick={onClose} aria-label="Закрыть урок">×</button>
      <h1 id="reader-heading" ref={headingRef} tabIndex={-1}>{title}</h1>
      {progress && <>
        <span className="reader-stage" aria-label={`Вопрос ${progress.question} из ${progress.total}`}>
          {progress.question} / {progress.total}
        </span>
        <progress aria-label="Прогресс этапа" value={progress.completed} max={progress.total} />
      </>}
    </div>
  </header>
}

export function ReaderInstruction({ children }: { children: ReactNode }) {
  return <p className="reader-instruction">{children}</p>
}

export function ReaderAction({ target, children }: { target: HTMLDivElement | null; children: ReactNode }) {
  return target ? createPortal(children, target) : null
}
