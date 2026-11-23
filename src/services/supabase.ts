export async function createCatalogClient(url?: string, publishableKey?: string) {
  if (!url?.trim() || !publishableKey?.trim()) return null

  try {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(url.trim(), publishableKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  } catch {
    return null
  }
}
