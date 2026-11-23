export function isPublishableKey(key: string): boolean {
  return /^sb_publishable_[A-Za-z0-9_-]+$/.test(key.trim())
}

export async function createSupabaseClient(url?: string, publishableKey?: string) {
  if (!url?.trim() || !publishableKey || !isPublishableKey(publishableKey)) return null

  try {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(url.trim(), publishableKey.trim(), {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  } catch {
    return null
  }
}

export type TakkuClient = NonNullable<Awaited<ReturnType<typeof createSupabaseClient>>>
