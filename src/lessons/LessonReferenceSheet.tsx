import { useId, useRef } from 'react'
import type { ReferenceContent } from './readerContent'
import { Icon } from '../Icon'
import { TheoryCard } from './TheoryCard'

export function LessonReferenceSheet({ references, compactTrigger }: { references: ReferenceContent[]; compactTrigger?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  return <>
    <button type="button" className={compactTrigger ? "reader-reference-trigger reader-reference-trigger--text" : "lesson-option reader-reference-trigger"} onClick={() => dialog.current?.showModal()}
      aria-haspopup="dialog">{!compactTrigger && <span aria-hidden="true">💡 </span>}Шпаргалка</button>
    <dialog ref={dialog} className="reader-reference-sheet" aria-labelledby={titleId}
      onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation() }}>
      <div className="reader-reference-sheet__heading">
        <h2 id={titleId}>Шпаргалка</h2>
        <button type="button" autoFocus className="lesson-option reader-close" aria-label="Закрыть шпаргалку"
          onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </div>
      <div className="reader-reference-sheet__content">
        {references.map(({ id, title, panels }) => <div className="reader-reference-sheet__block" key={id}>
          <h3>{title}</h3>
          {panels.map((panel, index) => <TheoryCard key={index} panel={panel} />)}
        </div>)}
      </div>
    </dialog>
  </>
}
