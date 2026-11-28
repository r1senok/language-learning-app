import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Word } from '../types'
import { LearningPath } from './LearningPath'
import { lessons } from './course'
import { completion, hasScore } from './engine'
import { publishedLessons, stageQuestionProgress } from './readerContent'
import { openLesson, partExercises } from './lessonModel'
import { LessonReader } from './LessonReader'
import { useLessonProgress } from './useLessonProgress'

export function Lessons({ client, userId, onReaderChange, studyWord, catalogWords }: {
  client?: SupabaseClient | null; userId?: string; onReaderChange: (active: boolean) => void; studyWord: (catalogId: string) => boolean; catalogWords: Word[]
}) {
  const { progress, save, syncErrors, storageErrors, current } = useLessonProgress(publishedLessons, client, userId)
  const [activeLessonId, setActiveLessonId] = useState<string>()
  const activeLesson = publishedLessons.find(({ id }) => id === activeLessonId)
  const pathLessons = lessons.map((entry, index) => {
    const number = index + 1
    const lesson = publishedLessons.find((item) => item.number === number)
    const saved = lesson && progress[lesson.id]
    const questions = lesson && saved ? lesson.parts.flatMap((part) => partExercises(part, saved.attempt)) : []
    const questionProgress = saved && stageQuestionProgress(questions, saved.attempt)
    const percentage = questionProgress ? Math.floor(questionProgress.completed / questionProgress.total * 100) : 0
    return { number, title: entry?.[1] ?? `Урок ${number}`, available: Boolean(lesson),
      completed: Boolean(saved && hasScore(saved.best, completion)), progress: percentage,
      started: Boolean(saved && (saved.stepId || Object.keys(saved.attempt).length)) }
  })

  function open(number: number) {
    const lesson = publishedLessons.find((item) => item.number === number)
    if (!lesson) return
    save(lesson, openLesson(lesson, current(lesson.id)))
    setActiveLessonId(lesson.id)
    onReaderChange(true)
  }

  function close() {
    setActiveLessonId(undefined)
    onReaderChange(false)
  }

  const storageError = activeLesson ? storageErrors[activeLesson.id] : Object.values(storageErrors).some(Boolean)
  const syncError = activeLesson ? syncErrors[activeLesson.id] : Object.values(syncErrors).some(Boolean)
  const warnings = <>
    {storageError && <p role="status" className="lesson-feedback">Хранилище устройства недоступно. Обновление страницы может сбросить текущую попытку.</p>}
    {syncError && !storageError && <p role="status" className="lesson-feedback">Облако пока недоступно. Урок сохраняется на этом устройстве.</p>}
  </>
  if (activeLesson) return <LessonReader key={activeLesson.id} lesson={activeLesson} progress={progress[activeLesson.id]}
    current={() => current(activeLesson.id)} save={(next) => save(activeLesson, next)}
    onClose={close} studyWord={studyWord} catalogWords={catalogWords} cloud={Boolean(userId)} warnings={warnings} />

  return <section className="learning-path-screen" aria-labelledby="lessons-heading">
    <h1 className="sr-only" id="lessons-heading">Главная</h1>
    {warnings}
    <LearningPath lessons={pathLessons} onOpen={open} />
  </section>
}
