import { useEffect, useState, useSyncExternalStore } from 'react'
import { CloudSync, cloudTransport } from './services/cloudSync'
import { readSavedGuestProgress } from './services/localProgress'
import type { TakkuClient } from './services/supabase'
import type { Word } from './types'

const noSubscription = () => () => {}
const emptyView = () => null

function browserStorage() {
  try { return window.localStorage } catch { return undefined }
}

export function useCloudProgress(client: TakkuClient | null, userId: string | undefined, bundled: Word[]) {
  // The parent keys this subtree by user ID. Each instance holds one account only.
  const [sync] = useState(() => client && userId
    ? new CloudSync(userId, cloudTransport(client, userId), browserStorage(), readSavedGuestProgress(bundled), bundled)
    : null)
  const view = useSyncExternalStore(sync?.subscribe ?? noSubscription, sync?.getView ?? emptyView)

  useEffect(() => {
    if (!sync) return
    const refresh = () => { if (document.visibilityState === 'visible') void sync.refresh() }
    void sync.start()
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(refresh, 15000)
    return () => {
      sync.stop()
      window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(interval)
    }
  }, [sync])

  return { sync, view }
}
