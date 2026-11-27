import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Word } from '../types'
import { LearningPath } from './LearningPath'
import { lessons } from './course'
import { completion, hasScore, moveLessonStage } from './engine'
import { firstIncompleteStep, lessonSteps, stageQuestionProgress, stepExercises } from './readerContent'
import { LessonReader } from './LessonReader'
import { useLessonProgress } from './useLessonProgress'

export function Lessons({ client, userId, onReaderChange, studyWord, catalogWords }: {
  client?: SupabaseClient | null; userId?: string; onReaderChange: (active: boolean) => void; studyWord: (catalogId: string) => boolean; catalogWords: Word[]
}) {
  const { progress, save, syncError, storageError, current } = useLessonProgress(client, userId)
  const [screen, setScreen] = useState<'course' | 'lesson'>('course')
  const completed = hasScore(progress.best, completion)
  // Only lesson 1 has a published reader and its own saved progress.
  const lessonNumber = 1
  const canResume = Boolean(progress.stepId || Object.keys(progress.attempt).length)
  const questions = lessonSteps.flatMap((step) => stepExercises(step, progress.attempt))
  const questionProgress = stageQuestionProgress(questions, progress.attempt)
  const percentage = questionProgress ? Math.floor(questionProgress.completed / questionProgress.total * 100) : 0
  const pathLessons = lessons.map((lesson, index) => {
    const number = index + 1
    const available = number === lessonNumber
    return { number, title: lesson?.[1] ?? `Урок ${number}`, available,
      completed: available && completed, progress: available ? percentage : 0, started: available && canResume }
  })

  function open(number: number) {
    if (number !== lessonNumber) return
    const saved = current()
    const step = lessonSteps.find((item) => item.id === saved.stepId) ?? firstIncompleteStep(saved.attempt)
    const replay = !step && saved.stepId !== '@result'
    save(replay ? moveLessonStage(saved, lessonSteps[0].id, true) : { ...saved, stepId: saved.stepId === '@result' ? '@result' : step?.id ?? lessonSteps[0].id })
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
  if (screen === 'lesson') return <LessonReader lessonNumber={lessonNumber} steps={lessonSteps} progress={progress}
    current={current} save={save} onClose={close} studyWord={studyWord} catalogWords={catalogWords} cloud={Boolean(userId)} warnings={warnings} />

  return <section className="learning-path-screen" aria-labelledby="lessons-heading">
    <h1 className="sr-only" id="lessons-heading">Главная</h1>
    {warnings}
    <LearningPath lessons={pathLessons} onOpen={open} />
  </section>
}
