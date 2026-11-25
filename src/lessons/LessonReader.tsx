import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { completion, hasScore, markAnswer } from './engine'
import type { Exercise, LessonProgress } from './engine'
import { firstIncompleteStep, stepExercises } from './readerContent'
import type { ReaderStep, TheoryPanel } from './readerContent'
import { ExerciseCard } from './ExerciseCard'
import { NewWordCard } from './NewWordCard'
import { newWordExercises } from './greetingsContent'

function TheoryCard({ panel }: { panel: TheoryPanel }) {
  if (panel.kind === 'tip') return <aside className="reader-tip">{panel.text}</aside>
  if (panel.kind === 'table') return <table className="reader-table">
    <caption>{panel.title}</caption>
    <thead><tr>{panel.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{panel.rows.map((row) => <tr key={row[0]}>
      {row.map((value, index) => <td key={index} lang={index < 2 ? 'et' : undefined}>
        {index === panel.accent ? <strong className="reader-accent">{value}</strong> : value}
      </td>)}
    </tr>)}</tbody>
  </table>
  if (panel.kind === 'examples') return <div className="reader-examples">{panel.items.map(({ before, accent, after, ru }) =>
    <div className="reader-example" key={before + accent + after}>
      <p lang="et">{before}<strong className="reader-accent">{accent}</strong>{after}</p>
      <p>{ru}</p>
    </div>)}</div>
  return <div className="reader-phrases">{panel.items.map(({ et, ru, icon }) => <article className="reader-phrase" key={et}>
    {icon && <span className="reader-phrase__scene" aria-hidden="true">{icon}</span>}
    <div><h3 lang="et">{et}</h3><p>{ru}</p></div>
  </article>)}</div>
}

export function LessonReader({ title, steps, progress, current, save, onClose, cloud, warnings }: {
  title: string; steps: ReaderStep[]; progress: LessonProgress; current: () => LessonProgress; save: (progress: LessonProgress) => void
  onClose: () => void; cloud: boolean; warnings: ReactNode
}) {
  const [answered, setAnswered] = useState<Exercise>()
  const reader = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const exercises = steps.flatMap((step) => stepExercises(step, progress.attempt))
  const last = steps.length
  const result = progress.stepId === '@result'
  const step = steps.find((item) => item.id === progress.stepId) ?? firstIncompleteStep(progress.attempt, steps) ?? steps[last - 1]
  const index = steps.indexOf(step)
  const active = answered ?? stepExercises(step, progress.attempt).find(({ id }) => !hasScore(progress.attempt, id))
  const newWord = active && newWordExercises.find(({ id }) => id === active.id)
  const keyPhrasesStep = !result && step.id === 'greetings-theory'
  const wordNumber = newWord ? newWordExercises.indexOf(newWord) + 1 : 0
  const displayed = result ? last : index + 1

  useLayoutEffect(() => {
    reader.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step.id, result, newWord?.id])

  function navigate(stepId: string, replay = false) {
    setAnswered(undefined)
    const previous = current()
    save({ ...previous, stepId, attempt: replay ? {} : previous.attempt })
  }

  function next() {
    if (active) return
    const incomplete = index + 1 === last ? firstIncompleteStep(current().attempt, steps) : undefined
    if (incomplete) {
      navigate(incomplete.id)
      return
    }
    navigate(steps[index + 1]?.id ?? '@result')
  }

  function close() {
    if (result) save({ ...current(), stepId: undefined })
    onClose()
  }

  const score = exercises.reduce((sum, { id }) => sum + (progress.attempt[id] ?? 0), 0)
  return <section ref={reader} className={`lesson-reader${keyPhrasesStep ? ' lesson-reader--key-phrases' : newWord && !result ? ' lesson-reader--new-word' : ''}`} aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') close() }}>
    <header className="reader-bar">
      <div className="reader-bar__inner">
        <button className="lesson-option" onClick={close} aria-label={newWord && !result ? 'Закрыть урок' : undefined}>{newWord && !result ? '×' : '← К курсу'}</button>
        <label htmlFor="reader-progress">{newWord && !result ? `Слово ${wordNumber} из ${newWordExercises.length}` : `Шаг ${displayed} из ${last}`}</label>
        <progress id="reader-progress" value={newWord && !result ? newWordExercises.filter(({ id }) => hasScore(progress.attempt, id)).length : result ? last : index} max={newWord && !result ? newWordExercises.length : last} />
      </div>
    </header>
    <div className="reader-content">
      {warnings}
      <h1 id="reader-heading" lang="et" ref={heading} tabIndex={-1}>{title}</h1>
      {result ? <div className="reader-panel">
        <h2>Урок завершён</h2>
        <p>Верных ответов в этой попытке: {score} из {exercises.length}.</p>
        <p>Лучший результат: {progress.best[completion] ?? 0}%.</p>
        <button className="tactile-button tactile-button--primary tactile-button--wide"
          onClick={() => navigate(steps[0].id, true)}>Пройти ещё раз</button>
      </div> : <>
        <section className="reader-panel" aria-labelledby="reader-step-heading">
          {!newWord && <span className="reader-source">TERE! A1 · с. {step.page}</span>}
          <h2 id="reader-step-heading" className={newWord ? 'sr-only' : undefined}>{step.title}</h2>
          {step.kind === 'theory' ? <>
            {step.panels.map((panel, panelIndex) => <TheoryCard key={panelIndex} panel={panel} />)}
          </> : newWord ? <NewWordCard key={newWord.id} exercise={newWord} onAnswer={(answer) => {
            setAnswered(newWord)
            save(markAnswer(current(), newWord, answer, exercises, cloud))
          }} onContinue={() => {
            if (newWordExercises.every(({ id }) => hasScore(current().attempt, id))) navigate(steps[index + 1].id)
            else setAnswered(undefined)
          }} /> : active ? <ExerciseCard key={active.id} exercise={active} onAnswer={(answer) => {
            setAnswered(active)
            save(markAnswer(current(), active, answer, exercises, cloud))
          }} onContinue={() => setAnswered(undefined)} /> : <p>Упражнения этого шага завершены.</p>}
        </section>
        {!newWord && <nav className={keyPhrasesStep ? "reader-sticky-action" : "reader-actions"} aria-label="Шаги урока">
          {!keyPhrasesStep && <button className="lesson-option" disabled={index === 0} onClick={() => navigate(steps[index - 1].id)}>Назад</button>}
          <button className="tactile-button tactile-button--primary" disabled={Boolean(active)} onClick={next}>Продолжить</button>
        </nav>}
      </>}
    </div>
  </section>
}
