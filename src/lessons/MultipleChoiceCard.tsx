import { useEffect, useState } from 'react'
import { PhraseAudioButton } from './AudioPhrase'
import { ExerciseActionPanel } from './ExerciseActionPanel'
import { multipleChoiceState, multipleChoiceView } from './lessonTemplates'
import type { MultipleChoice } from './engine'

export function MultipleChoiceCard({ actionTarget, exercise, selected, score, onSelect, onCheck, onContinue, onPlayAudio }: {
  actionTarget: HTMLDivElement | null; exercise: MultipleChoice; selected?: string; score?: number
  onSelect: (option: string) => void; onCheck: () => void; onContinue: () => void
  onPlayAudio?: (text: string) => void
}) {
  const [animating, setAnimating] = useState(false)
  const checked = score !== undefined
  const view = multipleChoiceView(exercise)
  const speech = view.presentation.kind === 'speech' ? view.presentation : undefined
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

  return <div className="multiple-choice">
    <h2 className="lesson-accent-heading">{view.instruction}</h2>
    {speech ? <div className="multiple-choice__prompt">
      <img className="multiple-choice__character" src={speech.characterSrc} alt="" />
      <div className="reader-phrase" lang={view.language}>
        <div className="reader-phrase__body"><PhraseAudioButton text={exercise.prompt} onPlayAudio={onPlayAudio} /></div>
      </div>
    </div> : <p className="book-choice-prompt" lang={view.language}>{exercise.prompt}</p>}
    <div className="book-choice-options multiple-choice__options" aria-label="Варианты ответа">
      {exercise.options.map(({ id, text }) => {
        const state = multipleChoiceState(exercise, id, selected, score)
        return <button key={id} className="lesson-option" type="button" lang={view.optionLanguage} disabled={checked}
          aria-pressed={id === selected} data-result={state === 'selected' ? undefined : state}
          onClick={() => onSelect(id)}>
          {text}{state === 'correct' && <span lang="ru" className="sr-only"> Правильный ответ</span>}
          {state === 'incorrect' && <span lang="ru" className="sr-only"> Неверный ответ</span>}
        </button>
      })}
    </div>
    <ExerciseActionPanel target={actionTarget} outcome={outcome} correctAnswer={outcome === 'incorrect' ? view.answerText : undefined} animate={checked && animating}
      onAnimationEnd={() => setAnimating(false)} disabled={checked ? animating : !selected}
      label={checked ? 'Продолжить' : 'Проверить'} onAction={checked ? onContinue : check} />
  </div>
}
