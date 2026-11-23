import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { StudyDecision } from '../../domain/study/session'
import type { VocabularyEntry } from '../../domain/vocabulary/models'
import type { StudyProgress } from '../../domain/study/models'

interface Drag {
  id: number
  startX: number
  startY: number
  axis?: 'horizontal' | 'vertical'
}

const swipeThreshold = 80

export function StudyCard({
  entry, progress, busy, onDecision,
}: {
  entry: VocabularyEntry
  progress: StudyProgress
  busy: boolean
  onDecision: (decision: StudyDecision) => void
}) {
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const gesture = useRef<Drag | null>(null)
  const translation = entry.translations
    .filter(({ languageCode }) => languageCode === progress.translationLanguageCode)
    .map(({ text }) => text).join(', ')
  const forward = progress.state === 'forward'
  const prompt = forward ? entry.lemma : translation
  const answer = forward ? translation : entry.lemma
  const promptLanguage = forward ? entry.languageCode : progress.translationLanguageCode
  const answerLanguage = forward ? progress.translationLanguageCode : entry.languageCode
  const hints = entry.hintEmojis ?? []

  function start(event: PointerEvent<HTMLDivElement>) {
    if (busy || gesture.current || !event.isPrimary || event.button !== 0) return

    gesture.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
    }
    if (drag.axis === 'horizontal') {
      setDragging(true)
      setOffset(dx)
    }
  }

  function finish(event: PointerEvent<HTMLDivElement>, commit = false) {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return

    gesture.current = null
    setDragging(false)
    setOffset(0)
    const dx = event.clientX - drag.startX
    if (commit && drag.axis === 'horizontal' && Math.abs(dx) >= swipeThreshold) {
      onDecision(dx > 0 ? 'know' : 'unknown')
    }
  }

  return (
    <>
      <div className="study-card-frame">
        <div
          className="study-card"
          data-dragging={dragging}
          style={{ transform: `translateX(${offset}px) rotate(${Math.max(-14, Math.min(14, offset / 12))}deg)` }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={(event) => finish(event, true)}
          onPointerCancel={(event) => finish(event)}
          onLostPointerCapture={(event) => finish(event)}
        >
          <div className="swipe-indicators" aria-hidden="true">
            <span className="swipe-label swipe-unknown" data-active={offset < 0}>← Не знаю</span>
            <span className="swipe-label swipe-know" data-active={offset > 0}>Знаю →</span>
          </div>
          <div className="study-card-content" aria-live="polite">
            <p className="language-pair">{forward ? 'Эстонский → Русский' : 'Русский → Эстонский'}</p>
            <h2 lang={promptLanguage} className="study-prompt">{prompt}</h2>
            {showHint && <p className="study-hint" aria-label={`Подсказка: ${hints.join(' ')}`}>{hints.join(' ')}</p>}
            {showAnswer && <p className="study-answer" lang={answerLanguage}>{answer}</p>}
          </div>
        </div>
      </div>
      <div className="study-tools">
        {hints.length > 0 && (
          <button className="action-button" type="button" aria-pressed={showHint} onClick={() => setShowHint(!showHint)}>
            {showHint ? 'Скрыть подсказку' : 'Подсказка'}
          </button>
        )}
        <button className="action-button" type="button" aria-pressed={showAnswer} onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? 'Скрыть ответ' : 'Показать ответ'}
        </button>
      </div>
    </>
  )
}
