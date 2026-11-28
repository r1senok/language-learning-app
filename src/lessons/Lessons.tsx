import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Word } from '../types'
import { LearningPath } from './LearningPath'
import { lessons } from './course'
import { completion, hasScore } from './engine'
import { publishedLessons, stageQuestionProgress } from './readerContent'
import { masteredScores } from './reviewQueue'
import { learningPath } from './learningPath'
import type { LessonDefinition } from './lessonModel'
import { openLesson, partExercises } from './lessonModel'
import { LessonReader } from './LessonReader'
import { useLessonProgress } from './useLessonProgress'

export function Lessons({ client, userId, onReaderChange, studyWord, catalogWords }: {
  client?: SupabaseClient | null; userId?: string; onReaderChange: (active: boolean) => void; studyWord: (catalogId: string) => boolean; catalogWords: Word[]
}) {
  const { progress, save, syncErrors, storageErrors, current } = useLessonProgress(publishedLessons, client, userId)
  const [activeLessonId, setActiveLessonId] = useState<string>()
  const activeLesson = publishedLessons.find(({ id }) => id === activeLessonId)
  const checkpoint = publishedLessons.find((lesson) => lesson.checkpointTitle)

  function pathNode(number: number, title: string, lesson?: LessonDefinition) {
    const saved = lesson && progress[lesson.id]
    const questions = lesson && saved ? lesson.parts.flatMap((part) => partExercises(part, saved.attempt)) : []
    const questionProgress = saved && stageQuestionProgress(questions, lesson?.repeatErrors ? masteredScores(saved) : saved.attempt)
    const percentage = questionProgress ? Math.floor(questionProgress.completed / questionProgress.total * 100) : 0
    return { number, title, available: Boolean(lesson), checkpointId: lesson?.checkpointTitle ? lesson.id : undefined,
      subtitle: lesson?.checkpointSubtitle, completed: Boolean(saved && hasScore(saved.best, completion)), progress: percentage,
      started: Boolean(saved && (saved.stepId || Object.keys(saved.attempt).length)) }
  }

  const pathLessons = lessons.flatMap((entry, index) => {
    const number = index + 1
    const lesson = publishedLessons.find((item) => !item.checkpointTitle && item.number === number)
    const node = pathNode(number, entry?.[1] ?? `Урок ${number}`, lesson)
    return checkpoint?.number === number && checkpoint.checkpointTitle
      ? [node, pathNode(number, checkpoint.checkpointTitle, checkpoint)]
      : [node]
  })

  function open(key: number | string) {
    const node = learningPath(pathLessons).find(({ number, checkpointId }) => (checkpointId ?? number) === key)
    if (!node || !node.available || node.status === 'locked') return
    const lesson = publishedLessons.find((item) => item.checkpointTitle ? item.id === key : item.number === key)
    if (!lesson) return
    const saved = current(lesson.id)
    save(lesson, lesson.repeatErrors && node.completed && !saved.stepId
      ? { ...saved, stepId: '@result' }
      : openLesson(lesson, saved))
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
