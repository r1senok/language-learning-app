import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { authErrorMessage, sendEmailLink, signInWithGoogle } from './services/auth'
import type { AuthIntent } from './services/auth'
import type { TakkuClient } from './services/supabase'

type Method = 'email' | 'google'

export function AuthDialog({ intent, client, ready, onClose, closeIcon, children }: {
  intent: AuthIntent
  client: TakkuClient | null
  ready: boolean
  onClose: () => void
  closeIcon: ReactNode
  children: ReactNode
}) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState<Method | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const submitting = useRef(false)

  async function start(method: Method) {
    if (!client || submitting.current) return
    submitting.current = true
    setPending(method)
    setSent(false)
    setError('')
    let redirecting = false

    try {
      if (method === 'email') {
        const { error: failure } = await sendEmailLink(client.auth, email, intent, window.location.href)
        if (failure) setError(authErrorMessage(failure, method))
        else setSent(true)
      } else {
        const { data, error: failure } = await signInWithGoogle(client.auth, window.location.href)
        if (failure || !data.url) setError(authErrorMessage(failure ?? {}, method))
        else redirecting = true
      }
    } catch {
      setError(authErrorMessage({}, method))
    } finally {
      if (!redirecting) {
        submitting.current = false
        setPending(null)
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void start('email')
  }

  return <div className="modal-backdrop" onPointerDown={onClose}>
    <form className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"
      onPointerDown={(event) => event.stopPropagation()} onSubmit={submit}
      onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
      <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">{closeIcon}</button>
      <div className="auth-modal__icon">{children}</div>
      <span className="eyebrow">{intent === 'signup' ? 'НОВЫЙ АККАУНТ' : 'С ВОЗВРАЩЕНИЕМ'}</span>
      <h2 id="auth-modal-title">{intent === 'signup' ? 'Создать аккаунт' : 'Войти в Takku'}</h2>
      <p>{ready && !client ? 'Вход сейчас недоступен. Можно продолжить в гостевом режиме.'
        : 'Войдите через Google или получите одноразовую ссылку на почту.'}</p>
      <label className="auth-email"><span>EMAIL</span><input type="email" autoComplete="email" required
        disabled={!ready || !client || pending !== null} value={email} placeholder="name@example.com"
        onChange={(event) => { setEmail(event.target.value); setSent(false); setError('') }} /></label>
      <button className="tactile-button tactile-button--primary tactile-button--wide"
        type="submit" disabled={!ready || !client || pending !== null || sent}>
        {pending === 'email' ? 'Отправляем ссылку…' : 'Продолжить с Email'}
      </button>
      <button className="profile-secondary" type="button" disabled={!ready || !client || pending !== null}
        onClick={() => void start('google')}>
        {pending === 'google' ? 'Переходим в Google…' : 'Продолжить с Google'}
      </button>
      {sent && <p role="status">Запрос отправлен. Проверьте входящие и папку «Спам». Откройте ссылку в этом же браузере.</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  </div>
}
