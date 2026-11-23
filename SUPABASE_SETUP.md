# Takku Supabase setup

Cloud authentication and synchronization are intentionally disabled until a
Supabase project is connected in Figma Make. Guest learning remains fully
functional through local storage.

## 1. Connect and configure authentication

1. Connect the intended Supabase project from Figma Make.
2. In Supabase, open **Authentication → Providers → Email**.
3. Enable email OTP or magic-link authentication.
4. Add the deployed Takku URL and the Make preview URL under
   **Authentication → URL Configuration → Redirect URLs**.
5. Use only the project URL and public anon key in client configuration. Never
   expose a service-role key to the browser.

## 2. Progress schema and RLS

Run this in the Supabase SQL editor after connecting the project:

```sql
create table if not exists public.vocabulary_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocabulary_id bigint not null,
  stage smallint not null default 0 check (stage between 0 and 3),
  queue_position integer,
  client_id text not null,
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default now(),
  revision bigint not null default 1,
  primary key (user_id, vocabulary_id)
);

alter table public.vocabulary_progress enable row level security;

create policy "Users read their own vocabulary progress"
on public.vocabulary_progress for select
using (auth.uid() = user_id);

create policy "Users insert their own vocabulary progress"
on public.vocabulary_progress for insert
with check (auth.uid() = user_id);

create policy "Users update their own vocabulary progress"
on public.vocabulary_progress for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete their own vocabulary progress"
on public.vocabulary_progress for delete
using (auth.uid() = user_id);
```

Stages map directly to the existing learning state machine:

- `0`: New
- `1`: Estonian → Russian
- `2`: Russian → Estonian
- `3`: Learned

## 3. Required synchronization behavior

- Keep the local guest store as the offline source of pending changes.
- Scope authenticated local caches by Supabase user ID.
- On sign-in, compare each stable vocabulary ID using `client_updated_at`.
- The newest explicit change wins. If timestamps are equal, use the highest
  revision and then the highest stage as the deterministic tie-breaker.
- Rebuild the queue from non-null queue positions, deduplicate IDs, and append
  studying words missing a position.
- Ask before merging guest data into an account. Never silently replace either
  local or cloud data.
- After a successful merge, write the merged result to both cloud storage and
  the signed-in user's isolated local cache.
- On sign-out, remove the signed-in cache from active memory and restore the
  separate guest cache. Never show one user's cached data to another user.
- Failed requests remain queued locally and retry after the browser returns
  online.

## 4. Client integration boundary

Implement the `CloudProgressAdapter` contract in
`src/services/cloudSync.ts` only after Figma Make has generated the connected
Supabase project files. At that point, replace the current `unconfigured`
capability with real session, sync, error, and last-successful-sync state.
