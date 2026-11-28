import type { ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../Icon'

export function ReaderHeader({ title, headingRef, headingId = 'reader-heading', onBack, backLabel = 'К предыдущему этапу', onClose, progress }: {
  title: string; headingRef?: Ref<HTMLHeadingElement>; headingId?: string; onBack?: () => void; backLabel?: string; onClose?: () => void
  progress?: { question?: number; label?: string; completed: number; total: number }
}) {
  return <header className="reader-bar">
    <div className="reader-bar__inner">
      {onBack && <button className="lesson-option reader-close reader-header-back" onClick={onBack}
        aria-label={backLabel}><Icon name="back" /></button>}
      <h1 id={headingId} ref={headingRef} tabIndex={-1}>{title}</h1>
      {onClose && <button className="lesson-option reader-close reader-header-exit" onClick={onClose} aria-label="Закрыть урок"><Icon name="close" /></button>}
      {progress && <div className="reader-bar__progress">
        <progress aria-label={progress.label ?? 'Прогресс этапа'} value={progress.completed} max={progress.total} />
        {progress.question !== undefined && <span className="reader-stage sr-only">Вопрос {progress.question} из {progress.total}</span>}
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
