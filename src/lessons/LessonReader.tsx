import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '../Icon'
import { useStudyPronunciation } from '../useStudyPronunciation'
import { completion, hasScore, markAnswer } from './engine'
import type { Exercise, LessonProgress } from './engine'
import { firstIncompleteStep } from './readerContent'
import type { ReaderStep, TheoryPanel } from './readerContent'
import { ExerciseCard } from './ExerciseCard'

function TheoryCard({ panel, speak }: { panel: TheoryPanel; speak: (text: string) => void }) {
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
      <button className="sound-button" type="button" aria-label={`Прослушать: ${before + accent + after}`}
        onClick={() => speak(before + accent + after)}><Icon name="volume" /></button>
    </div>)}</div>
  return <div className="reader-phrases">{panel.items.map(({ et, ru, icon }) => <article className="reader-phrase" key={et}>
    {icon && <span className="reader-phrase__scene" aria-hidden="true">{icon}</span>}
    <div><h3 lang="et">{et}</h3><p>{ru}</p></div>
    <button className="sound-button" type="button" aria-label={`Прослушать: ${et}`}
      onClick={() => speak(et.split(' / ').join(' '))}><Icon name="volume" /></button>
  </article>)}</div>
}

export function LessonReader({ title, steps, progress, current, save, onClose, cloud, warnings }: {
  title: string; steps: ReaderStep[]; progress: LessonProgress; current: () => LessonProgress; save: (progress: LessonProgress) => void
  onClose: () => void; cloud: boolean; warnings: ReactNode
}) {
  const [answered, setAnswered] = useState<Exercise>()
  const reader = useRef<HTMLElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const { pronounce, speechMessage, stop } = useStudyPronunciation()
  const exercises = steps.flatMap((step) => step.kind === 'practice' ? step.exercises : [])
  const last = steps.length
  const result = progress.stepId === '@result'
  const step = steps.find((item) => item.id === progress.stepId) ?? firstIncompleteStep(progress.attempt, steps) ?? steps[last - 1]
  const index = steps.indexOf(step)
  const active = answered ?? (step.kind === 'practice' ? step.exercises.find(({ id }) => !hasScore(progress.attempt, id)) : undefined)
  const displayed = result ? last : index + 1

  useLayoutEffect(() => {
    reader.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [step.id, result])

  function navigate(stepId: string, replay = false) {
    setAnswered(undefined)
    stop()
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
    stop()
    if (result) save({ ...current(), stepId: undefined })
    onClose()
  }

  const score = exercises.reduce((sum, { id }) => sum + (progress.attempt[id] ?? 0), 0)
  return <section ref={reader} className="lesson-reader" aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') close() }}>
    <header className="reader-bar">
      <div className="reader-bar__inner">
        <button className="lesson-option" onClick={close}>← К курсу</button>
        <label htmlFor="reader-progress">Шаг {displayed} из {last}</label>
        <progress id="reader-progress" value={result ? last : index} max={last} />
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
          <span className="reader-source">TERE! A1 · с. {step.page}</span>
          <h2 id="reader-step-heading">{step.title}</h2>
          {step.kind === 'theory' ? <>
            {speechMessage && <p className="reader-tip" role="status">{speechMessage}</p>}
            {step.panels.map((panel, panelIndex) => <TheoryCard key={panelIndex} panel={panel} speak={pronounce} />)}
          </> : active ? <ExerciseCard key={active.id} exercise={active} onAnswer={(answer) => {
            setAnswered(active)
            save(markAnswer(current(), active, answer, exercises, cloud))
          }} onContinue={() => setAnswered(undefined)} /> : <p>Упражнения этого шага завершены.</p>}
        </section>
        <nav className="reader-actions" aria-label="Шаги урока">
          <button className="lesson-option" disabled={index === 0} onClick={() => navigate(steps[index - 1].id)}>Назад</button>
          <button className="tactile-button tactile-button--primary" disabled={Boolean(active)} onClick={next}>Продолжить</button>
        </nav>
      </>}
    </div>
  </section>
}
