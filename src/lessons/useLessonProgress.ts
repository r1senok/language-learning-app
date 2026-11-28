import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { lessonStorageKey, mergeLessonCloudResults, readLessonProgress } from './lessonModel'
import type { LessonDefinition } from './lessonModel'
import type { LessonProgress } from './engine'

type ProgressByLesson = Record<string, LessonProgress>

export function useLessonProgress(lessons: readonly LessonDefinition[], client?: SupabaseClient | null, userId?: string) {
  const [progress, setProgress] = useState<ProgressByLesson>(() => Object.fromEntries(lessons.map((lesson) => [
    lesson.id, readLessonProgress(lesson, { getItem: (key) => localStorage.getItem(key) }, userId),
  ])))
  const [syncErrors, setSyncErrors] = useState<Record<string, boolean>>({})
  const [storageErrors, setStorageErrors] = useState<Record<string, boolean>>({})
  const latest = useRef(progress)
  const requestSync = useRef<(lesson: LessonDefinition) => void>(() => {})

  const persist = useCallback((lessonId: string, next: LessonProgress) => {
    latest.current = { ...latest.current, [lessonId]: next }
    setProgress(latest.current)
    try {
      localStorage.setItem(lessonStorageKey(lessonId, userId), JSON.stringify(next))
      setStorageErrors((errors) => errors[lessonId] ? { ...errors, [lessonId]: false } : errors)
    } catch {
      setStorageErrors((errors) => errors[lessonId] ? errors : { ...errors, [lessonId]: true })
    }
  }, [userId])

  useEffect(() => {
    if (!client || !userId) return
    let disposed = false
    const running = new Set<string>()

    async function sync(lesson: LessonDefinition) {
      if (!client || disposed || running.has(lesson.id)) return
      running.add(lesson.id)
      try {
        for (const [exercise, score] of Object.entries(latest.current[lesson.id].pending)) {
          if (disposed) return
          const { error } = await client.rpc('save_lesson_result', {
            account: userId, lesson: lesson.id, exercise, result: score,
          })
          if (error) throw error
          if (disposed) return
          const current = latest.current[lesson.id]
          if (current.pending[exercise] === score) {
            const pending = { ...current.pending }
            delete pending[exercise]
            persist(lesson.id, { ...current, pending })
          }
        }
        const { data, error } = await client.from('lesson_results').select('exercise_id,score')
          .eq('user_id', userId).eq('lesson_id', lesson.id)
        if (error) throw error
        if (disposed) return
        const current = latest.current[lesson.id]
        const merged = mergeLessonCloudResults(lesson, current, data ?? [])
        if (JSON.stringify(merged) !== JSON.stringify(current)) persist(lesson.id, merged)
        setSyncErrors((errors) => errors[lesson.id] ? { ...errors, [lesson.id]: false } : errors)
      } catch {
        if (!disposed) setSyncErrors((errors) => errors[lesson.id] ? errors : { ...errors, [lesson.id]: true })
      } finally {
        running.delete(lesson.id)
      }
    }

    const syncAll = () => { for (const lesson of lessons) void sync(lesson) }
    requestSync.current = (lesson) => { void sync(lesson) }
    const timer = window.setInterval(syncAll, 10_000)
    window.addEventListener('online', syncAll)
    window.addEventListener('focus', syncAll)
    syncAll()
    return () => {
      disposed = true
      requestSync.current = () => {}
      window.clearInterval(timer)
      window.removeEventListener('online', syncAll)
      window.removeEventListener('focus', syncAll)
    }
  }, [client, userId, lessons, persist])

  return { progress, syncErrors, storageErrors,
    save(lesson: LessonDefinition, next: LessonProgress) {
      persist(lesson.id, next)
      requestSync.current(lesson)
    },
    current: (lessonId: string) => latest.current[lessonId],
  }
}
