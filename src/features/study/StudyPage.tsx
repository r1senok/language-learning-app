import { Link } from 'react-router'
import type { StudyDecision } from '../../domain/study/session'
import { StudyCard } from './StudyCard'
import { catalogById } from './catalog-words'
import { StudyStorageNotice, useStudy } from './StudyProvider'

export function StudyPage() {
  const { session, ready, busy, answer } = useStudy()
  const id = session.queue[0]
  const entry = catalogById.get(id)

  function decide(decision: StudyDecision) {
    if (entry && !busy) void answer(entry.id, session.turn, decision)
  }

  return (
    <section className="trainer" aria-labelledby="study-heading" tabIndex={entry ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          decide(event.key === 'ArrowRight' ? 'know' : 'unknown')
        }
      }}>
      <div className="results-heading trainer-heading">
        <h1 id="study-heading">Тренировка</h1>
        {ready && <p className="text-sm text-muted" role="status">В очереди: {session.queue.length}</p>}
      </div>
      <StudyStorageNotice />
      {ready && (entry ? (
        <>
          <StudyCard
            key={session.turn}
            entry={entry}
            progress={session.progress[id]}
            busy={busy}
            onDecision={decide}
          />
          <div className="study-decisions">
            <button className="action-button unknown-button" type="button" aria-disabled={busy} onClick={() => decide('unknown')}>← Не знаю</button>
            <button className="action-button primary-button" type="button" aria-disabled={busy} onClick={() => decide('know')}>Знаю →</button>
          </div>
          <p className="mt-4 text-center text-sm text-muted">Смахните карточку или используйте кнопки и клавиши ← →.</p>
        </>
      ) : (
        <div className="empty-state">
          <h2 className="font-semibold">Очередь пуста</h2>
          <p className="mt-1 text-sm text-muted">Добавьте слова из каталога или верните выученное слово в тренировку.</p>
          <Link className="action-button primary-button mt-4" to="/catalog">Открыть словарь</Link>
        </div>
      ))}
    </section>
  )
}
