import assert from 'node:assert/strict'
import { test } from 'node:test'
import { authErrorMessage, authRedirectUrl, clearAuthReturn, isAuthReturn, sendEmailLink, signInWithGoogle, signOutHere } from '../src/services/auth.ts'
import { createSupabaseClient, isPublishableKey } from '../src/services/supabase.ts'

test('signup allows account creation and sign-in uses an existing account', async () => {
  const sent = []
  const auth = { signInWithOtp: async (request) => { sent.push(request); return { error: null } } }
  const href = 'https://takku.example/?code=old#state'
  await sendEmailLink(auth, ' learner@example.test ', 'signup', href)
  await sendEmailLink(auth, 'learner@example.test', 'signin', href)
  assert.deepEqual(sent, [true, false].map((shouldCreateUser) => ({
    email: 'learner@example.test',
    options: { shouldCreateUser, emailRedirectTo: 'https://takku.example/' },
  })))
})

test('Google returns to the same site and logout is scoped to the local session', async () => {
  const auth = {
    signInWithOAuth: async (request) => request,
    signOut: async (request) => request,
  }
  assert.deepEqual(await signInWithGoogle(auth, 'https://takku.example/path?next=https://other.example'), {
    provider: 'google',
    options: { redirectTo: 'https://takku.example/path' },
  })
  assert.deepEqual(await signOutHere(auth), { scope: 'local' })
  assert.equal(authRedirectUrl('https://takku.example//other.example?code=old'), 'https://takku.example//other.example')
})

test('detects and clears callback parameters while preserving unrelated location state', () => {
  const success = 'https://takku.example/?source=email&code=one-time#anchor'
  assert.equal(isAuthReturn(success), true)
  assert.equal(clearAuthReturn(success), 'https://takku.example/?source=email#anchor')
  const failure = 'https://takku.example/#error_code=otp_expired&error_description=expired'
  assert.equal(isAuthReturn(failure), true)
  assert.equal(clearAuthReturn(failure), 'https://takku.example/')
  assert.equal(isAuthReturn('https://takku.example/#anchor'), false)
})

test('authentication errors render actionable messages instead of raw provider responses', () => {
  assert.match(authErrorMessage({ status: 429, message: 'private provider detail' }, 'email'), /Подождите/)
  assert.match(authErrorMessage({ code: 'email_address_invalid' }, 'email'), /адрес/)
  assert.match(authErrorMessage({}, 'google'), /Google/)
  assert.match(authErrorMessage({}, 'logout'), /выйти/)
})

test('browser configuration accepts publishable keys and rejects private keys', async () => {
  assert.equal(isPublishableKey('sb_publishable_fixture'), true)
  assert.equal(isPublishableKey('sb_secret_fixture'), false)
  assert.equal(isPublishableKey('eyJfake.jwt.value'), false)
  assert.equal(await createSupabaseClient('https://takku.example', 'sb_secret_fixture'), null)
})
