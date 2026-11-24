import { useEffect, useRef, useState } from 'react'
import { studyGrammarRows } from './domain/grammar'
import { bindCardGesture } from './domain/cardGesture'
import { Icon } from './Icon'
import type { Word } from './types'

type AnswerFeedback = 'known' | 'unknown' | undefined

function StudyCard({ word, feedback, isLocked, onAnswer }: {
  word: Word
  feedback: AnswerFeedback
  isLocked: () => boolean
  onAnswer: (known: boolean) => void
}) {
  const surface = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')
  const flipTimer = useRef<number | undefined>(undefined)
  const [hintShown, setHintShown] = useState(false)
  const [offset, setOffset] = useState(0)

  function flip() {
    if (isLocked() || flipTimer.current !== undefined) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed((value) => !value)
      return
    }
    setPhase('out')
    flipTimer.current = window.setTimeout(() => {
      setRevealed((value) => !value)
      setPhase('in')
      flipTimer.current = window.setTimeout(() => {
        flipTimer.current = undefined
        setPhase('idle')
      }, 110)
    }, 110)
  }

  const latest = useRef({ isLocked, onAnswer, flip })
  latest.current = { isLocked, onAnswer, flip }

  useEffect(() => {
    if (!surface.current) return
    const unbind = bindCardGesture(surface.current, {
      isLocked: () => latest.current.isLocked(),
      drag: setOffset,
      flip: () => latest.current.flip(),
      answer: (known) => latest.current.onAnswer(known),
    })
    return () => {
      unbind()
      window.clearTimeout(flipTimer.current)
      flipTimer.current = undefined
    }
  }, [])

  const forward = word.progress === 1
  const grammar = revealed ? studyGrammarRows(word.partOfSpeech, word.grammaticalForms) : []
  const hintEmojis = word.emojis.slice(0, 3)

  return <>
    <div className="swipe-stage" ref={surface}>
      <div className={`swipe-label swipe-label--no ${offset < -25 ? 'visible' : ''}`} aria-hidden="true">Не знаю</div>
      <div className={`swipe-label swipe-label--yes ${offset > 25 ? 'visible' : ''}`} aria-hidden="true">Знаю</div>
      <div className={`flashcard ${revealed ? 'flashcard--revealed' : ''} ${feedback ? `flashcard--${feedback}` : ''} ${offset ? 'flashcard--dragging' : ''}`}
        style={feedback || !offset ? undefined : { transform: `translateX(${offset}px) rotate(${offset / 18}deg)` }}>
        <div className={`study-card__scroll study-card__scroll--${phase}`} key={revealed ? 'answer' : 'prompt'}>
          <div className="study-card__content">
            <div className="study-card__text">
              <h2 lang={revealed || !forward ? 'ru' : 'et'}>{revealed || !forward ? word.russian : word.estonian}</h2>
              {revealed && <p className="study-card__original" lang="et">{word.estonian}</p>}
              {grammar.length > 0 && <div className="study-card__grammar">
                <h3>Основные формы</h3>
                <dl>{grammar.map(({ label, value }) => <div key={label} lang="et"><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              </div>}
            </div>
            {!revealed && hintEmojis.length > 0 &&
              <button type="button" className="study-card__hint"
                aria-label={hintShown ? `Скрыть подсказку: ${hintEmojis.join(' ')}` : 'Показать подсказку'}
                onClick={() => setHintShown((value) => !value)}>
                {hintShown ? <span className="study-card__emojis" aria-hidden="true">
                  {hintEmojis.map((emoji, index) => <span key={index}>{emoji}</span>)}
                </span> : <Icon name="bulb" />}
              </button>}
          </div>
        </div>
        <div className="flip-indicator">{revealed ? 'Нажми, чтобы вернуться' : 'Нажми, чтобы увидеть перевод'}</div>
      </div>
    </div>
    <div className="study-session__controls" aria-label="Управление карточкой">
      <button type="button" disabled={Boolean(feedback)} onClick={() => onAnswer(false)}>← Не знаю</button>
      <button type="button" disabled={Boolean(feedback)} onClick={flip}>Перевернуть</button>
      <button type="button" disabled={Boolean(feedback)} onClick={() => onAnswer(true)}>Знаю →</button>
    </div>
  </>
}

export function StudyScreen({ word, feedback, round, completed, onClose, onAnswer, isLocked }: {
  word: Word | undefined
  feedback: AnswerFeedback
  round: number
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
      </header>
      {word ? <StudyCard key={`${round}:${word.id}:${word.progress}`} word={word} feedback={feedback} isLocked={isLocked} onAnswer={onAnswer} />
        : <div className="complete-state">
          <h2>{completed ? 'Отличная работа!' : 'Очередь пуста'}</h2>
          <p>{completed ? 'Все слова текущей тренировки выучены.' : 'Добавь слова, чтобы начать изучение.'}</p>
          <button className="tactile-button tactile-button--primary" onClick={onClose}>К моим словам</button>
        </div>}
    </section>
  </main>
}
