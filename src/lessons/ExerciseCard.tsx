import { ReaderAction, ReaderInstruction } from './ReaderLayout'
import { useState } from 'react'
import { answerIsCorrect } from './engine'
import type { Exercise } from './engine'

export function ExerciseCard({ actionTarget, exercise, onAnswer, onContinue }: {
  actionTarget: HTMLDivElement | null; exercise: Exercise; onAnswer: (answer: string[]) => void; onContinue: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [left, setLeft] = useState(-1)
  const [matches, setMatches] = useState<Record<number, string>>({})
  const [result, setResult] = useState<boolean>()
  const locked = result !== undefined
  const ready = exercise.kind === 'matching_pairs'
    ? exercise.pairs.every((_, index) => matches[index] !== undefined)
    : exercise.kind === 'word_order' ? selected.length === exercise.order.length : selected.length === 1

  function submit() {
    if (locked || !ready) return
    const answer = exercise.kind === 'matching_pairs' ? exercise.pairs.map((_, index) => matches[index]) : selected
    setResult(answerIsCorrect(exercise, answer))
    onAnswer(answer)
  }

  return <div className="lesson-exercise">
    <ReaderInstruction>{exercise.kind === 'matching_pairs' ? 'Сопоставьте пары' :
      exercise.kind === 'word_order' ? 'Соберите предложение' : 'Выберите ответ'}</ReaderInstruction>
    <h3>{exercise.prompt}</h3>
    {exercise.scene && <div className="reader-scene" role="img" aria-label={exercise.scene.label}>{exercise.scene.icon}</div>}
    {exercise.kind === 'matching_pairs' ? <div className="lesson-pairs">
      <div>{exercise.pairs.map(({ id, left: label }, index) => <button className="lesson-option" key={id}
        disabled={locked} aria-pressed={left === index} onClick={() => setLeft(index)} lang="et">
        {label}{matches[index] && ` → ${exercise.pairs.find((pair) => pair.id === matches[index])?.right}`}
      </button>)}</div>
      <div>{[...exercise.pairs].reverse().map(({ id, right }) => <button className="lesson-option" key={id}
        disabled={locked || left < 0} onClick={() => {
          const next = Object.fromEntries(Object.entries(matches).filter(([, value]) => value !== id))
          setMatches({ ...next, [left]: id })
          setLeft(-1)
        }} lang="et">{right}</button>)}</div>
    </div> : <>
      {exercise.kind === 'word_order' && <div className="lesson-bank" aria-label="Собранная фраза">
        {selected.map((id) => <button className="lesson-option" key={id} lang="et" disabled={locked}
          onClick={() => setSelected((previous) => previous.filter((part) => part !== id))}>{exercise.options.find((option) => option.id === id)?.text}</button>)}
      </div>}
      <div className={exercise.kind === 'word_order' ? 'lesson-bank' : 'lesson-options'}>
        {exercise.options.map(({ id, text }) => <button className="lesson-option" key={id}
          aria-pressed={exercise.kind === 'word_order' ? undefined : selected.includes(id)}
          data-result={locked && exercise.kind !== 'word_order' ? (id === exercise.correct ? 'correct' : selected.includes(id) ? 'incorrect' : undefined) : undefined}
          disabled={locked || (exercise.kind === 'word_order' && selected.includes(id))}
          onClick={() => setSelected((previous) => exercise.kind === 'word_order' ? [...previous, id] : [id])}>{text}</button>)}
      </div>
    </>}
    <ReaderAction target={actionTarget}>
    {locked ? <>
      <div className={`lesson-feedback lesson-feedback--${result ? 'correct' : 'incorrect'}`} role="status"><strong>{result ? 'Верно!' : 'Неверно'}</strong><p>{exercise.explanation}</p></div>
      <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={onContinue}>Продолжить</button>
    </> : <button className="tactile-button tactile-button--primary tactile-button--wide" disabled={!ready} onClick={submit}>Проверить</button>}
    </ReaderAction>
  </div>
}
