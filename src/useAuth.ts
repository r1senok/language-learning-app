import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { callbackError, clearAuthReturn, isAuthReturn } from './services/auth'
import type { TakkuClient } from './services/supabase'

export function useAuth(clientPromise: Promise<TakkuClient | null>, returning: boolean) {
  const [client, setClient] = useState<TakkuClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [returnError, setReturnError] = useState('')

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined

    async function observeSession() {
      try {
        const supabase = await clientPromise
        if (!active) return
        setClient(supabase)
        if (!supabase) {
          if (returning) setReturnError(callbackError)
          return
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
          if (active) setSession(next)
        })
        unsubscribe = () => subscription.unsubscribe()

        const initialization = returning ? await supabase.auth.initialize() : null
        const { data, error } = await supabase.auth.getSession()
        if (active) {
          setSession(data.session)
          if (returning && (initialization?.error || error || !data.session)) setReturnError(callbackError)
        }
      } catch {
        if (active && returning) setReturnError(callbackError)
      } finally {
        if (active) {
          setReady(true)
          if (returning && isAuthReturn(window.location.href)) {
            window.history.replaceState(window.history.state, '', clearAuthReturn(window.location.href))
          }
        }
      }
    }

    void observeSession()
    return () => {
      active = false
      unsubscribe?.()
    }
  }, [clientPromise, returning])

  return { client, session, ready, returnError }
}
