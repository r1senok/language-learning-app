import { useEffect, useState } from 'react'
import { PhraseAudioButton } from './AudioPhrase'
import { ReaderAction } from './ReaderLayout'
import type { BookChoice } from './engine'

export function TranslationChoiceCard({ actionTarget, exercise, selected, score, onSelect, onCheck, onContinue, onPlayAudio, characterSrc }: {
  actionTarget: HTMLDivElement | null; exercise: BookChoice; selected?: string; score?: number
  onSelect: (option: string) => void; onCheck: () => void; onContinue: () => void
  onPlayAudio?: (text: string) => void; characterSrc?: string
}) {
  const [animating, setAnimating] = useState(false)
  const checked = score !== undefined
  const correct = exercise.accepted ?? [exercise.correct]
  const outcome = checked ? (score ? 'correct' : 'incorrect') : undefined

  useEffect(() => {
    if (!animating) return
    const fallback = window.setTimeout(() => setAnimating(false), 400)
    return () => window.clearTimeout(fallback)
  }, [animating])

  function check() {
    if (!selected || checked) return
    setAnimating(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    onCheck()
  }

  return <div className="translation-choice">
    <h2 className="lesson-accent-heading">Выберите перевод</h2>
    <div className="translation-choice__prompt">
      {characterSrc ? <img className="translation-choice__character" src={characterSrc} alt="" /> :
        <div className="translation-choice__character" aria-hidden="true" />}
      <div className="reader-phrase" lang={exercise.book.language}>
        <div className="reader-phrase__body"><PhraseAudioButton text={exercise.prompt} onPlayAudio={onPlayAudio} /></div>
      </div>
    </div>
    <div className="book-choice-options translation-choice__options" aria-label="Варианты ответа">
      {exercise.options.map(({ id, text }) => {
        const right = checked && (score ? id === selected : correct.includes(id))
        const wrong = checked && !score && id === selected
        return <button key={id} className="lesson-option" type="button" lang="et" disabled={checked}
          aria-pressed={id === selected} data-result={right ? 'correct' : wrong ? 'incorrect' : undefined}
          onClick={() => onSelect(id)}>
          {text}{right && <span lang="ru" className="sr-only"> Правильный ответ</span>}
          {wrong && <span lang="ru" className="sr-only"> Неверный ответ</span>}
        </button>
      })}
    </div>
    <ReaderAction target={actionTarget}>
      <div className="translation-choice__footer" data-outcome={outcome} data-animate={checked && animating || undefined}
        onAnimationEnd={(event) => { if (event.target === event.currentTarget) setAnimating(false) }}>
        <div className="translation-choice__footer-inner">
          {checked && <p className="translation-choice__feedback" role="status">
            <span aria-hidden="true">{score ? '✓' : '×'}</span>{score ? 'Верно!' : 'Неверно!'}
          </p>}
          <button type="button" className={`tactile-button tactile-button--${checked ? (score ? 'green' : 'red') : 'primary'}`}
            disabled={checked ? animating : !selected} onClick={checked ? onContinue : check}>
            {checked ? 'Продолжить' : 'Проверить'}
          </button>
        </div>
      </div>
    </ReaderAction>
  </div>
}
