import { createTtsHandler } from './handler.mjs'

Deno.serve(createTtsHandler({
  adminToken: Deno.env.get('TAKKU_TTS_ADMIN_TOKEN'),
  url: Deno.env.get('SUPABASE_URL'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  credentials: Deno.env.get('TAKKU_GOOGLE_TTS_SERVICE_ACCOUNT'),
  voice: Deno.env.get('TAKKU_TTS_VOICE'),
}))
