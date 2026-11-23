import type { TakkuClient } from './supabase'

export type AuthIntent = 'signup' | 'signin'
type Auth = Pick<TakkuClient['auth'], 'signInWithOtp' | 'signInWithOAuth' | 'signOut'>
type AuthError = { code?: string; status?: number }

export const callbackError = 'Не удалось завершить вход. Откройте ссылку в том же браузере или запросите новую.'

export function authRedirectUrl(href: string): string {
  const url = new URL(href)
  url.search = ''
  url.hash = ''
  return url.href
}

export function isAuthReturn(href: string): boolean {
  const url = new URL(href)
  const hash = new URLSearchParams(url.hash.slice(1))
  return url.searchParams.has('code') || url.searchParams.has('error_code') ||
    url.searchParams.has('error_description') || hash.has('error_code') || hash.has('error_description')
}

export function clearAuthReturn(href: string): string {
  const url = new URL(href)
  for (const key of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key)
  const hash = new URLSearchParams(url.hash.slice(1))
  if (hash.has('error_code') || hash.has('error_description')) url.hash = ''
  return url.href
}

export function sendEmailLink(auth: Auth, email: string, intent: AuthIntent, href: string) {
  return auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: intent === 'signup', emailRedirectTo: authRedirectUrl(href) },
  })
}

export function signInWithGoogle(auth: Auth, href: string) {
  return auth.signInWithOAuth({ provider: 'google', options: { redirectTo: authRedirectUrl(href) } })
}

export function signOutHere(auth: Auth) {
  return auth.signOut({ scope: 'local' })
}

export function authErrorMessage(error: AuthError, action: 'email' | 'google' | 'logout'): string {
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
    return 'Слишком много запросов. Подождите немного и попробуйте снова.'
  }
  if (error.code === 'email_address_invalid' || error.code === 'validation_failed') {
    return 'Проверьте адрес электронной почты и попробуйте снова.'
  }
  if (action === 'google') return 'Не удалось начать вход через Google. Попробуйте ещё раз.'
  if (action === 'logout') return 'Не удалось выйти из аккаунта. Попробуйте ещё раз.'
  return 'Не удалось отправить ссылку. Проверьте адрес и попробуйте снова.'
}
