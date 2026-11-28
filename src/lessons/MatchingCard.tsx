import { shuffledOptions } from './wordBank'
import { useEffect, useRef, useState } from 'react'
import { ExerciseActionPanel } from './ExerciseActionPanel'

type Pair = { id: string; left: string; right: string }
type Side = 'left' | 'right'
type Pick = { side: Side; id: string }
type Feedback = Record<Side, string> & { result: 'correct' | 'incorrect' }

export function MatchingCard({ pairs, shuffleKey, prompt, leftLabel, rightLabel, matched, onMatch, onContinue, actionTarget }: {
  pairs: Pair[]; shuffleKey: string; prompt: string; leftLabel: string; rightLabel: string
  matched: string[]; onMatch: (left: string, right: string) => void
  onContinue: () => void; actionTarget: HTMLDivElement | null
}) {
  const [selected, setSelected] = useState<Pick>()
  const [feedback, setFeedback] = useState<Feedback>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const done = matched.length === pairs.length
  useEffect(() => () => clearTimeout(timer.current), [])

  function pick(side: Side, id: string) {
    if (timer.current !== undefined || matched.includes(id) || done) return
    if (!selected || selected.side === side) {
      setSelected(selected?.id === id ? undefined : { side, id })
      return
    }

    const left = side === 'left' ? id : selected.id
    const right = side === 'right' ? id : selected.id
    const correct = left === right
    setSelected(undefined)
    setFeedback({ left, right, result: correct ? 'correct' : 'incorrect' })
    timer.current = setTimeout(() => {
      timer.current = undefined
      setFeedback(undefined)
    }, correct ? 500 : 700)
    onMatch(left, right)
  }

  return <div className="matching-card">
    <h2 className="lesson-accent-heading">{prompt}</h2>
    {feedback?.result === 'incorrect' && <span className="sr-only" role="status">Пара не совпала. Попробуйте ещё раз.</span>}
    <div className="lesson-pairs">
      {(['left', 'right'] as const).map((side) => <div key={side} role="group" aria-label={side === 'left' ? leftLabel : rightLabel}>
        {shuffledOptions(pairs, `${shuffleKey}:${side}`).map((pair) => {
          const completed = matched.includes(pair.id)
          const state = feedback && feedback[side] === pair.id ? feedback.result : completed ? 'completed' : undefined
          return <button className="lesson-option" type="button" lang="et" key={pair.id}
            disabled={completed} aria-pressed={selected?.side === side && selected.id === pair.id}
            aria-disabled={feedback ? true : undefined} data-result={state} onClick={() => pick(side, pair.id)}>
            {pair[side]}
          </button>
        })}
      </div>)}
    </div>
    <ExerciseActionPanel target={actionTarget} outcome={done ? 'correct' : undefined} animate={done && Boolean(feedback)}
      label="Продолжить" disabled={!done || Boolean(feedback)} onAction={onContinue} />
  </div>
}
