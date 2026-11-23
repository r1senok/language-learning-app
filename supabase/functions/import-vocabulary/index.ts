import { createHandler } from './handler.mjs'

Deno.serve(createHandler({
  token: Deno.env.get('TAKKU_IMPORT_TOKEN'),
  url: Deno.env.get('SUPABASE_URL'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}))
