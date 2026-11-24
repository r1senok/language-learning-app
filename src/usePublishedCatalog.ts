import { useCallback, useEffect, useState } from 'react'
import { loadPublishedCatalog } from './services/publishedCatalog'
import { catalogErrorReason } from './domain/catalogError'
import type { CatalogErrorReason } from './domain/catalogError'
import { legacyCatalogIds } from './domain/wordId'
import { createPublicCatalogClient } from './services/supabase'
import type { Word } from './types'

const client = createPublicCatalogClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

export type CatalogState =
  | { status: 'loading'; words?: Word[] }
  | { status: 'ready'; words: Word[] }
  | { status: 'error'; words?: Word[]; reason: CatalogErrorReason }

export function usePublishedCatalog() {
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const reload = useCallback(() => {
    setCatalog((previous) => ({ ...previous, status: 'loading' }))
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    const request = new AbortController()
    void client.then((supabase) => loadPublishedCatalog(supabase, legacyCatalogIds, request.signal))
      .then((words) => {
        if (!request.signal.aborted) setCatalog({ status: 'ready', words })
      })
      .catch((error: unknown) => {
        if (!request.signal.aborted) setCatalog((previous) => ({
          status: 'error', words: previous.words, reason: catalogErrorReason(error),
        }))
      })
    return () => request.abort()
  }, [attempt])

  return { catalog, reload }
}
