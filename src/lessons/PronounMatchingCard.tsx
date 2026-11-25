import { useEffect, useRef, useState } from 'react'
import { ReaderAction, ReaderInstruction } from './ReaderLayout'
import { pronounMatching } from './tereLessonContent'

export function PronounMatchingCard({ matched, onMatch, onContinue, actionTarget }: {
  matched: string[]; onMatch: (left: string, right: string) => void
  onContinue: () => void; actionTarget: HTMLDivElement | null
}) {
  const [left, setLeft] = useState<string>()
  const [wrong, setWrong] = useState<{ left: string; right: string }>()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [right] = useState(() => {
    const shuffled = [...pronounMatching.pairs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    if (shuffled.every(({ id }, i) => id === pronounMatching.pairs[i].id)) shuffled.push(shuffled.shift()!)
    return shuffled
  })
  const done = matched.length === pronounMatching.pairs.length
  useEffect(() => () => clearTimeout(timer.current), [])

  function clearError() {
    clearTimeout(timer.current)
    setWrong(undefined)
  }

  function match(id: string) {
    if (!left || matched.includes(id)) return
    clearError()
    setLeft(undefined)
    if (left === id) onMatch(left, id)
    else {
      setWrong({ left, right: id })
      timer.current = setTimeout(() => setWrong(undefined), 350)
    }
  }

  return <div className="pronoun-matching">
    <ReaderInstruction>Сопоставьте короткую и полную формы</ReaderInstruction>
    <p className="pronoun-matching__count" role="status" aria-label="Найдено пар">
      {matched.length}/{pronounMatching.pairs.length}{done && ' · Все пары найдены'}
    </p>
    {wrong && <span className="sr-only" role="status">Пара не совпала. Попробуйте ещё раз.</span>}
    <div className="lesson-pairs">
      <div role="group" aria-label="Короткие формы">
        {pronounMatching.pairs.map(({ id, left: text }) => <button className="lesson-option" type="button" lang="et"
          key={id} disabled={matched.includes(id)} aria-pressed={left === id}
          data-result={matched.includes(id) ? 'correct' : wrong?.left === id ? 'incorrect' : undefined}
          onClick={() => { clearError(); setLeft(id) }}>{text}</button>)}
      </div>
      <div role="group" aria-label="Полные формы">
        {right.map(({ id, right: text }) => <button className="lesson-option" type="button" lang="et"
          key={id} disabled={matched.includes(id)}
          data-result={matched.includes(id) ? 'correct' : wrong?.right === id ? 'incorrect' : undefined}
          onClick={() => match(id)}>{text}</button>)}
      </div>
    </div>
    {done && <ReaderAction target={actionTarget}>
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="button"
        onClick={onContinue}>Продолжить</button>
    </ReaderAction>}
  </div>
}
