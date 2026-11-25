import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exercises, lessonId } from './course'
import { lessonSteps } from './readerContent'
import { newWordExercises } from './greetingsContent'
import { completion, loadLesson, resumeFromCloud } from './engine'
import type { LessonProgress, Scores } from './engine'

const exerciseIds = [...new Set([...exercises, ...newWordExercises, ...lessonSteps.flatMap((step) => step.kind === 'practice' ? step.exercises : [])].map(({ id }) => id))]

export function useLessonProgress(client?: SupabaseClient | null, userId?: string) {
  const key = `takku-lessons-v1:${userId ?? 'guest'}:${lessonId}`
  const [progress, setProgress] = useState(() => loadLesson(key, exerciseIds, { getItem: (name) => localStorage.getItem(name) }))
  const [syncError, setSyncError] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const latest = useRef(progress)
  const requestSync = useRef<() => void>(() => {})

  function save(next: LessonProgress) {
    latest.current = next
    setProgress(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  useEffect(() => {
    if (!client || !userId) return
    let disposed = false
    let running = false
    async function sync() {
      if (!client || disposed || running) return
      running = true
      try {
        for (const [exercise, score] of Object.entries(latest.current.pending)) {
          if (disposed) return
          const { error } = await client.rpc('save_lesson_result', {
            account: userId, lesson: lessonId, exercise, result: score,
          })
          if (error) throw error
          if (disposed) return
          if (latest.current.pending[exercise] === score) {
            const pending = { ...latest.current.pending }
            delete pending[exercise]
            save({ ...latest.current, pending })
          }
        }
        const { data, error } = await client.from('lesson_results').select('exercise_id,score').eq('user_id', userId).eq('lesson_id', lessonId)
        if (error) throw error
        if (disposed) return
        const remote: Scores = Object.fromEntries((data ?? [])
          .filter(({ exercise_id }) => exercise_id === completion || exerciseIds.includes(exercise_id))
          .map(({ exercise_id, score }) => [exercise_id, score]))
        const merged = resumeFromCloud(latest.current, remote)
        if (JSON.stringify(merged) !== JSON.stringify(latest.current)) save(merged)
        setSyncError(false)
      } catch {
        if (!disposed) setSyncError(true)
      } finally {
        running = false
      }
    }
    requestSync.current = sync
    const timer = window.setInterval(sync, 10_000)
    window.addEventListener('online', sync)
    window.addEventListener('focus', sync)
    void sync()
    return () => {
      disposed = true
      requestSync.current = () => {}
      window.clearInterval(timer)
      window.removeEventListener('online', sync)
      window.removeEventListener('focus', sync)
    }
  }, [client, userId, key])

  return { progress, save: (next: LessonProgress) => {
    save(next)
    requestSync.current()
  }, syncError, storageError, current: () => latest.current }
}
