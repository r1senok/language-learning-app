import { shuffledOptions } from './wordBank'
import { ReaderAction, ReaderInstruction } from './ReaderLayout'
import { useState } from 'react'
import { answerIsCorrect } from './engine'
import type { Exercise } from './engine'

export function ExerciseCard({ actionTarget, exercise, attemptSeed, onAnswer, onContinue }: {
  actionTarget: HTMLDivElement | null; exercise: Extract<Exercise, { kind: 'matching_pairs' }>; attemptSeed: string; onAnswer: (answer: string[]) => void; onContinue: () => void
}) {
  const [left, setLeft] = useState(-1)
  const [matches, setMatches] = useState<Record<number, string>>({})
  const [result, setResult] = useState<boolean>()
  const locked = result !== undefined
  const ready = exercise.pairs.every((_, index) => matches[index] !== undefined)
  const leftPairs = shuffledOptions(exercise.pairs.map((pair, index) => ({ ...pair, index })), `${attemptSeed}:${exercise.id}:left`)
  const rightPairs = shuffledOptions(exercise.pairs, `${attemptSeed}:${exercise.id}:right`)

  function submit() {
    if (locked || !ready) return
    const answer = exercise.pairs.map((_, index) => matches[index])
    setResult(answerIsCorrect(exercise, answer))
    onAnswer(answer)
  }

  return <div className="lesson-exercise">
    <ReaderInstruction>Сопоставьте пары</ReaderInstruction>
    <h3>{exercise.prompt}</h3>
    {exercise.scene && <div className="reader-scene" role="img" aria-label={exercise.scene.label}>{exercise.scene.icon}</div>}
    <div className="lesson-pairs">
      <div>{leftPairs.map(({ id, left: label, index }) => <button className="lesson-option" key={id}
        disabled={locked} aria-pressed={left === index} onClick={() => setLeft(index)} lang="et">
        {label}{matches[index] && ` → ${exercise.pairs.find((pair) => pair.id === matches[index])?.right}`}
      </button>)}</div>
      <div>{rightPairs.map(({ id, right }) => <button className="lesson-option" key={id}
        disabled={locked || left < 0} onClick={() => {
          const next = Object.fromEntries(Object.entries(matches).filter(([, value]) => value !== id))
          setMatches({ ...next, [left]: id })
          setLeft(-1)
        }} lang="et">{right}</button>)}</div>
    </div>
    <ReaderAction target={actionTarget}>
    {locked ? <>
      <div className={`lesson-feedback lesson-feedback--${result ? 'correct' : 'incorrect'}`} role="status"><strong>{result ? 'Верно!' : 'Неверно'}</strong><p>{exercise.explanation}</p></div>
      <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={onContinue}>Продолжить</button>
    </> : <button className="tactile-button tactile-button--primary tactile-button--wide" disabled={!ready} onClick={submit}>Проверить</button>}
    </ReaderAction>
  </div>
}
