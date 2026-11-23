import { createClient } from '@supabase/supabase-js'

export interface SupabaseConfig {
  url: string
  publishableKey: string
}

export function createSupabaseClient(config?: SupabaseConfig) {
  if (!config) return null

  return createClient(config.url, config.publishableKey)
}
