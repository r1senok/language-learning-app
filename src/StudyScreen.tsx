import { useEffect, useRef, useState } from 'react'
import { bindCardGesture } from './domain/cardGesture'
import { Icon } from './Icon'
import type { Word } from './types'
import { useStudyPronunciation } from './useStudyPronunciation'

type AnswerFeedback = 'known' | 'unknown' | undefined

function StudyCard({ word, feedback, isLocked, onAnswer }: {
  word: Word
  feedback: AnswerFeedback
  isLocked: () => boolean
  onAnswer: (known: boolean) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const [flipped, setFlipped] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [offset, setOffset] = useState(0)
  const { pronounce, speechMessage, setSpeechMessage } = useStudyPronunciation()
  const latest = useRef({ isLocked, onAnswer })
  latest.current = { isLocked, onAnswer }

  function flip() {
    if (latest.current.isLocked()) return
    setFlipped((value) => !value)
    setSpeechMessage('')
  }

  useEffect(() => {
    if (!surface.current) return
    return bindCardGesture(surface.current, {
      isLocked: () => latest.current.isLocked(),
      drag: setOffset,
      flip: () => {
        setFlipped((value) => !value)
        setSpeechMessage('')
      },
      answer: (known) => latest.current.onAnswer(known),
    })
  }, [setSpeechMessage])

  const forward = word.progress === 1
  const speak = () => pronounce(word.estonian)

  return <>
    <div className="swipe-stage" ref={surface}>
      <div className={`swipe-label swipe-label--no ${offset < -25 ? 'visible' : ''}`} aria-hidden="true">Не знаю</div>
      <div className={`swipe-label swipe-label--yes ${offset > 25 ? 'visible' : ''}`} aria-hidden="true">Знаю</div>
      <div className={`flashcard ${flipped ? 'flashcard--flipped' : ''} ${feedback ? `flashcard--${feedback}` : ''} ${offset ? 'flashcard--dragging' : ''}`}
        style={feedback ? undefined : { transform: `translateX(${offset}px) rotate(${offset / 18}deg)` }}>
        <div className="flashcard__inner">
          <div className="flashcard__face flashcard__face--front" inert={flipped}>
            <div className="flashcard__content">
              <div className="flashcard__main">
                <h2 lang={forward ? 'et' : 'ru'}>{forward ? word.estonian : word.russian}</h2>
                {forward && <button className="sound-button" onClick={speak} aria-label="Прослушать эстонское слово"><Icon name="volume" /></button>}
              </div>
              {word.emojis.length > 0 && <button className={`hint-orb ${hintShown ? 'hint-orb--shown' : ''}`}
                aria-label={hintShown ? 'Скрыть подсказку' : 'Показать подсказку'} onClick={() => setHintShown((value) => !value)}>
                {hintShown ? <span className="hint-orb__emojis">{word.emojis.join(' ')}</span> : <span className="hint-orb__question">?</span>}
              </button>}
            </div>
            <div className="flashcard__bottom"><span className="flip-indicator">Нажми, чтобы перевернуть</span></div>
          </div>
          <div className="flashcard__face flashcard__face--back" inert={!flipped}>
            <div className="flashcard__content flashcard__content--answer">
              <div className="flashcard__main">
                <h2 lang={forward ? 'ru' : 'et'}>{forward ? word.russian : word.estonian}</h2>
                <p className="answer-original" lang={forward ? 'et' : 'ru'}>{forward ? word.estonian : word.russian}</p>
                <button className="sound-button" onClick={speak} aria-label="Прослушать эстонское слово"><Icon name="volume" /></button>
              </div>
            </div>
            <div className="flashcard__bottom"><span className="flip-indicator">Нажми, чтобы вернуться</span></div>
          </div>
        </div>
      </div>
    </div>
    {speechMessage && <p className="study-tip" role="status">{speechMessage}</p>}
    <div className="study-session__controls" aria-label="Управление карточкой">
      <button type="button" disabled={Boolean(feedback)} onClick={() => onAnswer(false)}>← Не знаю</button>
      <button type="button" disabled={Boolean(feedback)} onClick={flip}>Перевернуть</button>
      <button type="button" disabled={Boolean(feedback)} onClick={() => onAnswer(true)}>Знаю →</button>
    </div>
  </>
}

export function StudyScreen({ word, feedback, round, count, total, percentage, completed, onClose, onAnswer, isLocked }: {
  word: Word | undefined
  feedback: AnswerFeedback
  round: number
  count: number
  total: number
  percentage: number
  completed: boolean
  onClose: () => void
  onAnswer: (known: boolean) => void
  isLocked: () => boolean
}) {
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus() }, [])

  return <main className="study-session" onKeyDown={(event) => {
    if (event.key === 'Escape') onClose()
  }}>
    <section className="screen--study study-session__layout" aria-labelledby="study-session-heading">
      <header className="study-session__header">
        <button type="button" ref={close} aria-label="Закрыть изучение" onClick={onClose}><Icon name="close" /></button>
        <h1 id="study-session-heading">Изучение</h1>
        <span aria-label={`Просмотрено ${count} из ${total}`}>{count < total ? `${count + 1} / ${total}` : 'Повторение'}</span>
      </header>
      <div className="study-session__track" role="progressbar" aria-label="Просмотрено в сессии" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={count}>
        <span style={{ width: `${percentage}%` }} />
      </div>
      {word ? <StudyCard key={`${round}:${word.id}:${word.progress}`} word={word} feedback={feedback} isLocked={isLocked} onAnswer={onAnswer} />
        : <div className="complete-state">
          <h2>{completed ? 'Отличная работа!' : 'Очередь пуста'}</h2>
          <p>{completed ? 'Все слова текущей тренировки выучены.' : 'Добавь слова, чтобы начать изучение.'}</p>
          <button className="tactile-button tactile-button--primary" onClick={onClose}>К моим словам</button>
        </div>}
    </section>
  </main>
}
