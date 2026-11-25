import { useId } from 'react'
import type { Ref } from 'react'

export function LessonExitDialog({ dialogRef, onExit }: {
  dialogRef: Ref<HTMLDialogElement>; onExit: () => void
}) {
  const title = useId()
  const description = useId()
  return <dialog ref={dialogRef} className="reader-exit" aria-labelledby={title} aria-describedby={description}
    onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation() }}>
    <h2 id={title}>Выйти из урока?</h2>
    <p id={description}>Твой прогресс сохранится, и ты сможешь продолжить позже.</p>
    <form method="dialog" className="reader-exit__actions">
      <button className="tactile-button tactile-button--primary" autoFocus>Продолжить урок</button>
      <button type="button" className="lesson-option" onClick={onExit}>Выйти</button>
    </form>
  </dialog>
}
