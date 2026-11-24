import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Icon } from '../Icon'
import { useStudyPronunciation } from '../useStudyPronunciation'
import { blocks, exercises, lessons } from './course'
import { answerIsCorrect, completion, hasScore, markAnswer, nextExercise } from './engine'
import type { Exercise } from './engine'
import { useLessonProgress } from './useLessonProgress'

function ExerciseCard({ exercise, onAnswer, onContinue }: {
  exercise: Exercise; onAnswer: (answer: string[]) => void; onContinue: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [left, setLeft] = useState(-1)
  const [matches, setMatches] = useState<Record<number, string>>({})
  const [result, setResult] = useState<boolean>()
  const { pronounce, speechMessage } = useStudyPronunciation()
  const [requestedAudio, setRequestedAudio] = useState(false)
  const [revealedTranscript, setRevealedTranscript] = useState(false)
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
    <h3>{exercise.prompt}</h3>
    {exercise.kind === 'listening_choice' && exercise.audio && <>
      <button className="lesson-option" onClick={() => { setRequestedAudio(true); pronounce(exercise.audio!) }}>Прослушать</button>
      {speechMessage && <p role="status">{speechMessage}</p>}
      {requestedAudio && speechMessage && <button className="lesson-option" onClick={() => setRevealedTranscript(true)}>Показать текст фразы</button>}
      {revealedTranscript && <p lang="et">{exercise.audio}</p>}
    </>}
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
          disabled={locked || (exercise.kind === 'word_order' && selected.includes(id))}
          onClick={() => setSelected((previous) => exercise.kind === 'word_order' ? [...previous, id] : [id])}>{text}</button>)}
      </div>
    </>}
    {locked ? <>
      <div className="lesson-feedback" role="status"><strong>{result ? 'Верно!' : 'Попробуй вспомнить в следующий раз'}</strong><p>{exercise.explanation}</p></div>
      <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={onContinue}>Продолжить</button>
    </> : <button className="tactile-button tactile-button--primary tactile-button--wide" disabled={!ready} onClick={submit}>Проверить</button>}
  </div>
}

export function Lessons({ client, userId }: { client?: SupabaseClient | null; userId?: string }) {
  const { progress, save, syncError, storageError, current } = useLessonProgress(client, userId)
  const [screen, setScreen] = useState<'course' | 'lesson' | 'result'>('course')
  const [active, setActive] = useState<Exercise>()
  const upcoming = nextExercise(exercises, progress.attempt)
  const completed = hasScore(progress.best, completion)
  const step = active && exercises.findIndex(({ id }) => id === active.id)
  const block = active && blocks.find(({ exercises }) => exercises.includes(active))
  const [theoryPassed, setTheoryPassed] = useState(false)

  function open(replay = false) {
    if (replay) save({ ...current(), attempt: {} })
    const next = replay ? exercises[0] : nextExercise(exercises, current().attempt)
    setActive(next)
    setTheoryPassed(false)
    setScreen(next ? 'lesson' : 'result')
  }

  function advance() {
    const next = nextExercise(exercises, current().attempt)
    if (!next) setScreen('result')
    if (next && block && !block.exercises.includes(next)) setTheoryPassed(false)
    setActive(next)
  }

  const heading = lessons[0]!
  const score = Object.values(progress.attempt).reduce((sum, value) => sum + value, 0)
  return <section className="screen lessons" aria-labelledby="lessons-heading">
    {storageError && <p role="status" className="lesson-feedback">Хранилище устройства недоступно. Обновление страницы может сбросить текущую попытку.</p>}
    {syncError && !storageError && <p role="status" className="lesson-feedback">Облако пока недоступно. Урок сохраняется на этом устройстве.</p>}
    {screen === 'course' ? <>
      <div className="course-hero">
        <div><span className="soft-badge">A0–A1</span><h1 id="lessons-heading">Tere! — Eesti Start</h1>
          <p>Первые фразы, местоимения и короткие диалоги на эстонском.</p></div>
        <img src="/takku-dachshund.png" alt="" />
      </div>
      <div className="course-progress">
        <label htmlFor="course-completion">Пройдено {Number(completed)} из {lessons.length} уроков</label>
        <progress id="course-completion" value={Number(completed)} max={lessons.length} />
      </div>
      <button className="tactile-button tactile-button--primary tactile-button--wide"
        onClick={() => open(completed && (!upcoming || Object.keys(progress.attempt).length === 0))}>
        {Object.keys(progress.attempt).length > 0 && upcoming ? 'Продолжить урок' : completed ? 'Повторить урок' : 'Начать'}
      </button>
      <ol className="course-lessons">{lessons.map((lesson, index) => <li key={index}>
        {index === 0 ? <button className="course-lesson course-lesson--available" onClick={() => open(completed && (!upcoming || Object.keys(progress.attempt).length === 0))}>
          <span className="course-lesson__index">1</span>
          <span><strong lang="et">{heading[0]}</strong><small>{heading[1]} · {completed ? 'Пройден' : 'Текущий урок'}</small></span>
          <Icon name={completed ? 'check' : 'book'} />
        </button> : <div className="course-lesson">
          <span className="course-lesson__index">{index + 1}</span>
          <span><strong lang={lesson ? 'et' : undefined}>{lesson?.[0] ?? `Урок ${index + 1}`}</strong><small>{lesson ? `${lesson[1]} · ` : ''}Скоро</small></span>
          <Icon name="lock" />
        </div>}
      </li>)}</ol>
    </> : <>
      <button className="lesson-option lesson-back" onClick={() => setScreen('course')}>← К курсу</button>
      <h1 id="lessons-heading" lang="et">{heading[0]}</h1>
      {screen === 'result' ? <div className="lesson-panel">
        <h2>Урок завершён</h2>
        <p>Верных ответов в этой попытке: {score} из {exercises.length}.</p>
        <p>Лучший результат: {progress.best[completion] ?? 0}%.</p>
        <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => open(true)}>Пройти ещё раз</button>
      </div> : block && active && <>
        <label htmlFor="lesson-completion">Задание {(step ?? 0) + 1} из {exercises.length}</label>
        <progress id="lesson-completion" value={Object.keys(progress.attempt).length} max={exercises.length} />
        <div className="lesson-panel">
          <h2>{block.title}</h2>
          {theoryPassed ? <ExerciseCard key={active.id} exercise={active} onAnswer={(answer) => {
            const next = markAnswer(current(), active, answer, exercises, Boolean(userId))
            save(next)
          }} onContinue={advance} /> : <>
            <p>{block.theory}</p>
            <ul>{block.examples.map((example) => <li key={example}>{example}</li>)}</ul>
            <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => setTheoryPassed(true)}>К упражнениям</button>
          </>}
        </div>
      </>}
    </>}
  </section>
}
