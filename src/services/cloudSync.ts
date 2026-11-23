import type { StoredProgress } from '../types'

export type CloudSyncStatus = 'unconfigured' | 'offline' | 'syncing' | 'synced' | 'error'

export type CloudProgressAdapter = {
  load(userId: string): Promise<StoredProgress>
  merge(userId: string, local: StoredProgress, remote: StoredProgress): Promise<StoredProgress>
  save(userId: string, progress: StoredProgress): Promise<void>
}

export const cloudCapability = {
  configured: false,
  status: 'unconfigured' as CloudSyncStatus,
  message: 'Supabase не подключён. Гостевой прогресс продолжает храниться на этом устройстве.',
}

export const supabaseSetup = [
  'Подключить проект Supabase в Figma Make.',
  'Включить Email OTP или Magic Link в Authentication → Providers.',
  'Создать таблицу прогресса и политики Row Level Security для auth.uid().',
  'Повторно открыть приложение и проверить регистрацию, вход и синхронизацию.',
]

// A connected project supplies the concrete adapter. Until then, this module
// deliberately exposes no simulated authentication or successful sync state.
