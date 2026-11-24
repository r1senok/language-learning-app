import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Icon } from '../Icon'
import { lessons } from './course'
import { completion, hasScore } from './engine'
import { firstIncompleteStep, lessonSteps } from './readerContent'
import { LessonReader } from './LessonReader'
import { useLessonProgress } from './useLessonProgress'

export function Lessons({ client, userId, onReaderChange }: {
  client?: SupabaseClient | null; userId?: string; onReaderChange: (active: boolean) => void
}) {
  const { progress, save, syncError, storageError, current } = useLessonProgress(client, userId)
  const [screen, setScreen] = useState<'course' | 'lesson'>('course')
  const completed = hasScore(progress.best, completion)
  const heading = lessons[0]!
  const canResume = Boolean(progress.stepId || Object.keys(progress.attempt).length && firstIncompleteStep(progress.attempt))
  const action = canResume ? 'Продолжить урок' : completed ? 'Повторить урок' : 'Начать'

  function open() {
    const saved = current()
    const step = lessonSteps.find((item) => item.id === saved.stepId) ?? firstIncompleteStep(saved.attempt)
    const replay = !step && saved.stepId !== '@result'
    save({ ...saved, attempt: replay ? {} : saved.attempt, stepId: saved.stepId === '@result' ? '@result' : step?.id ?? lessonSteps[0].id })
    setScreen('lesson')
    onReaderChange(true)
  }

  function close() {
    setScreen('course')
    onReaderChange(false)
  }

  const warnings = <>
    {storageError && <p role="status" className="lesson-feedback">Хранилище устройства недоступно. Обновление страницы может сбросить текущую попытку.</p>}
    {syncError && !storageError && <p role="status" className="lesson-feedback">Облако пока недоступно. Урок сохраняется на этом устройстве.</p>}
  </>
  if (screen === 'lesson') return <LessonReader title={heading[0]} steps={lessonSteps} progress={progress}
    current={current} save={save} onClose={close} cloud={Boolean(userId)} warnings={warnings} />

  return <section className="screen lessons" aria-labelledby="lessons-heading">
    {warnings}
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
      onClick={open}>
      {action}
    </button>
    <ol className="course-lessons">{lessons.map((lesson, index) => <li key={index}>
      {index === 0 ? <button className="course-lesson course-lesson--available" onClick={open}>
        <span className="course-lesson__index">1</span>
        <span><strong lang="et">{heading[0]}</strong><small>{heading[1]} · {completed ? 'Пройден' : 'Текущий урок'}</small></span>
        <Icon name={completed ? 'check' : 'book'} />
      </button> : <div className="course-lesson">
        <span className="course-lesson__index">{index + 1}</span>
        <span><strong lang={lesson ? 'et' : undefined}>{lesson?.[0] ?? `Урок ${index + 1}`}</strong><small>{lesson ? `${lesson[1]} · ` : ''}Скоро</small></span>
        <Icon name="lock" />
      </div>}
    </li>)}</ol>
  </section>
}
