const tokenUrl = 'https://oauth2.googleapis.com/token'
const scope = 'https://www.googleapis.com/auth/cloud-platform'

function base64url(value) {
  return btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function googleAccessToken(credentials, request) {
  const { client_email, private_key } = JSON.parse(credentials)
  const keyBytes = Uint8Array.from(
    atob(private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '')),
    (character) => character.charCodeAt(0),
  )
  const key = await crypto.subtle.importKey('pkcs8', keyBytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'])
  const encode = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)))
  const now = Math.floor(Date.now() / 1000)
  const claim = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: client_email, scope, aud: tokenUrl, iat: now, exp: now + 3600,
  })}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(claim))
  const response = await request(tokenUrl, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${claim}.${base64url(new Uint8Array(signature))}`,
    }),
  })
  if (!response.ok) throw new Error('Google OAuth rejected the server account')
  const { access_token } = await response.json()
  if (typeof access_token !== 'string') throw new Error('Google OAuth returned no token')
  return access_token
}
