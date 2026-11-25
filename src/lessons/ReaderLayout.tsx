import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function ReaderInstruction({ children, question, total }: {
  children: ReactNode; question?: number; total?: number
}) {
  return <div className="reader-instruction">
    <span>{children}</span>
    {question !== undefined && <span>{question} из {total}</span>}
  </div>
}

export function ReaderAction({ target, children }: { target: HTMLDivElement | null; children: ReactNode }) {
  return target ? createPortal(children, target) : null
}
