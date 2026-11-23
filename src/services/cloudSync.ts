import type { StoredProgress } from '../types'

export type CloudSyncStatus = 'unconfigured' | 'offline' | 'syncing' | 'synced' | 'error'

export type CloudProgressAdapter = {
  load(userId: string): Promise<StoredProgress>
  merge(userId: string, local: StoredProgress, remote: StoredProgress): Promise<StoredProgress>
  save(userId: string, progress: StoredProgress): Promise<void>
}
