import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { emptySession, enqueue, grade } from '../../domain/study/session'
import type { StudyDecision, StudySession, StudyWord } from '../../domain/study/session'
import { createStudyRepository } from '../../infrastructure/indexed-db/study-repository'

const repository = createStudyRepository()

interface StudyContextValue {
  session: StudySession
  ready: boolean
  busy: boolean
  error: string | null
  retry: () => void
  add: (words: readonly StudyWord[]) => Promise<boolean>
  restore: (word: StudyWord) => Promise<boolean>
  answer: (entryId: string, turn: number, decision: StudyDecision) => Promise<boolean>
}

const StudyContext = createContext<StudyContextValue | null>(null)

export function StudyProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const writing = useRef(false)

  useEffect(() => {
    let active = true
    repository.read().then(
      (value) => { if (active) setSession(value) },
      () => { if (active) setError('Не удалось открыть локальный прогресс.') },
    )
    return () => { active = false }
  }, [attempt])

  async function update(change: (current: StudySession) => StudySession) {
    if (!session || writing.current) return false

    writing.current = true
    setBusy(true)
    setError(null)
    try {
      setSession(await repository.update(change))
      return true
    } catch {
      setError('Не удалось сохранить прогресс. Попробуйте ещё раз.')
      return false
    } finally {
      writing.current = false
      setBusy(false)
    }
  }

  return (
    <StudyContext.Provider value={{
      session: session ?? emptySession,
      ready: session !== null,
      busy,
      error,
      retry: () => {
        setError(null)
        setAttempt((value) => value + 1)
      },
      add: (words) => update((current) => enqueue(current, words)),
      restore: (word) => update((current) => enqueue(current, [word], true)),
      answer: (id, turn, decision) => update((current) => grade(current, id, turn, decision)),
    }}>
      {children}
    </StudyContext.Provider>
  )
}

export function useStudy() {
  const context = useContext(StudyContext)
  if (!context) throw new Error('StudyProvider is required')
  return context
}

export function StudyStorageNotice() {
  const { ready, error, retry } = useStudy()

  if (error) {
    return (
      <div className="empty-state my-4" role="alert">
        <p>{error}</p>
        {!ready && <button className="action-button mt-2" onClick={retry}>Повторить</button>}
      </div>
    )
  }
  if (!ready) return <p className="my-4 text-muted" role="status">Загружаем прогресс…</p>
  return null
}
