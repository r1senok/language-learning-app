begin;

-- Membership is provisioned through the SQL Editor or another trusted database role.
create schema takku_private;
revoke all on schema takku_private from public, anon, authenticated;

create table takku_private.catalog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
revoke all on takku_private.catalog_admins from public, anon, authenticated;

create function takku_private.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from takku_private.catalog_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function takku_private.is_catalog_admin() from public, anon, authenticated;
grant usage on schema takku_private to authenticated;
grant execute on function takku_private.is_catalog_admin() to authenticated;

create table public.languages (
  code text primary key check (code ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
  name text not null check (btrim(name) <> '')
);
insert into public.languages (code, name) values ('et', 'Eesti'), ('ru', 'Русский');

create table public.vocabulary_entries (
  id uuid primary key default gen_random_uuid(),
  legacy_id bigint unique check (legacy_id between 1 and 9007199254740991),
  language_code text not null references public.languages (code),
  lemma text not null check (btrim(lemma) <> ''),
  part_of_speech text,
  grammatical_forms jsonb not null default '{}' check (jsonb_typeof(grammatical_forms) = 'object'),
  hint_emojis text[] not null default '{}' check (
    cardinality(hint_emojis) = 0 or (
      array_ndims(hint_emojis) = 1 and cardinality(hint_emojis) between 1 and 3
      and array_position(hint_emojis, null) is null
      and array_position(hint_emojis, '') is null
    )
  ),
  is_published boolean not null default false,
  unique (id, language_code)
);

-- One row per target language. The array preserves the display order of glosses.
create table public.vocabulary_translations (
  vocabulary_id uuid not null references public.vocabulary_entries (id) on delete cascade,
  language_code text not null references public.languages (code),
  glosses text[] not null check (
    array_ndims(glosses) = 1 and cardinality(glosses) > 0
    and array_position(glosses, null) is null
    and array_position(glosses, '') is null
  ),
  primary key (vocabulary_id, language_code)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (btrim(name) <> ''),
  is_published boolean not null default false
);

create table public.vocabulary_categories (
  vocabulary_id uuid not null references public.vocabulary_entries (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (vocabulary_id, category_id)
);
create index vocabulary_categories_category_idx on public.vocabulary_categories (category_id);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  language_code text not null references public.languages (code),
  title text not null check (btrim(title) <> ''),
  edition text,
  is_published boolean not null default false
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  position integer not null check (position > 0),
  title text not null check (btrim(title) <> ''),
  is_published boolean not null default false,
  unique (book_id, position),
  unique (book_id, id)
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books (id) on delete restrict,
  lesson_id uuid,
  page_label text,
  citation text,
  is_published boolean not null default false,
  foreign key (book_id, lesson_id) references public.lessons (book_id, id) on delete restrict,
  check (lesson_id is null or book_id is not null),
  check (book_id is not null or nullif(btrim(citation), '') is not null)
);
create index sources_book_lesson_idx on public.sources (book_id, lesson_id);

create table public.vocabulary_sources (
  vocabulary_id uuid not null references public.vocabulary_entries (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  primary key (vocabulary_id, source_id)
);
create index vocabulary_sources_source_idx on public.vocabulary_sources (source_id);

create table public.personal_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  legacy_id bigint check (legacy_id between 1 and 9007199254740991),
  language_code text not null references public.languages (code),
  translation_language_code text not null references public.languages (code),
  lemma text not null check (btrim(lemma) <> ''),
  translation text not null check (btrim(translation) <> ''),
  part_of_speech text,
  grammatical_forms jsonb not null default '{}' check (jsonb_typeof(grammatical_forms) = 'object'),
  hint_emojis text[] not null default '{}' check (
    cardinality(hint_emojis) = 0 or (
      array_ndims(hint_emojis) = 1 and cardinality(hint_emojis) between 1 and 3
      and array_position(hint_emojis, null) is null
      and array_position(hint_emojis, '') is null
    )
  ),
  check (language_code <> translation_language_code),
  unique (user_id, legacy_id),
  unique (user_id, id, language_code, translation_language_code)
);

-- A row tracks exactly one catalog word or one personal word.
-- Stages are 0 (new/reset), 1 (forward), 2 (reverse), 3 (learned).
create table public.vocabulary_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  vocabulary_id uuid,
  personal_word_id uuid,
  language_code text not null,
  translation_language_code text not null,
  stage smallint not null default 0 check (stage between 0 and 3),
  queue_position integer check (queue_position >= 0),
  client_id text not null check (btrim(client_id) <> ''),
  client_updated_at timestamptz not null,
  server_updated_at timestamptz not null default statement_timestamp(),
  revision bigint not null default 1,
  check (num_nonnulls(vocabulary_id, personal_word_id) = 1),
  check (language_code <> translation_language_code),
  check ((stage in (1, 2)) = (queue_position is not null)),
  foreign key (vocabulary_id, language_code)
    references public.vocabulary_entries (id, language_code) on delete restrict,
  foreign key (vocabulary_id, translation_language_code)
    references public.vocabulary_translations (vocabulary_id, language_code) on delete restrict,
  foreign key (user_id, personal_word_id, language_code, translation_language_code)
    references public.personal_words (user_id, id, language_code, translation_language_code) on delete cascade,
  unique (user_id, vocabulary_id, translation_language_code),
  unique (user_id, personal_word_id),
  constraint vocabulary_progress_queue_unique
    unique (user_id, language_code, translation_language_code, queue_position) deferrable initially immediate
);
create index vocabulary_progress_vocab_idx on public.vocabulary_progress (vocabulary_id);

create function takku_private.stamp_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := statement_timestamp();
  if tg_op = 'INSERT' then
    new.revision := 1;
  else
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;
revoke all on function takku_private.stamp_progress() from public, anon, authenticated;
create trigger vocabulary_progress_stamp
before insert or update on public.vocabulary_progress
for each row execute function takku_private.stamp_progress();

-- Photo object keys and extracted material are admin-only. A private Storage
-- bucket and its policies can be provisioned when the upload workflow is built.
create table public.vocabulary_import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  source_id uuid references public.sources (id) on delete restrict,
  input_kind text not null check (input_kind in ('photo', 'json')),
  object_key text,
  status text not null default 'draft'
    check (status in ('draft', 'processing', 'review', 'published', 'failed')),
  created_at timestamptz not null default statement_timestamp(),
  check (input_kind <> 'photo' or nullif(btrim(object_key), '') is not null)
);

create table public.vocabulary_import_items (
  job_id uuid not null references public.vocabulary_import_jobs (id) on delete cascade,
  row_number integer not null check (row_number > 0),
  raw_data jsonb not null check (jsonb_typeof(raw_data) = 'object'),
  edited_data jsonb check (jsonb_typeof(edited_data) = 'object'),
  validation_errors jsonb not null default '[]' check (jsonb_typeof(validation_errors) = 'array'),
  vocabulary_id uuid references public.vocabulary_entries (id) on delete set null,
  primary key (job_id, row_number)
);

-- Explicit grants also work in projects that disable automatic Data API grants.
do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'languages', 'vocabulary_entries', 'vocabulary_translations', 'categories',
    'vocabulary_categories', 'books', 'lessons', 'sources', 'vocabulary_sources',
    'vocabulary_import_jobs', 'vocabulary_import_items'
  ]
  loop
    execute format('alter table public.%I enable row level security', relation_name);
    execute format('revoke all on public.%I from public, anon, authenticated', relation_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', relation_name);
    execute format(
      'create policy catalog_admin on public.%I for all to authenticated using ((select takku_private.is_catalog_admin())) with check ((select takku_private.is_catalog_admin()))',
      relation_name
    );
  end loop;
end;
$$;

-- Editors archive entries rather than probing private progress through
-- referential-integrity errors on DELETE or changes to referenced keys.
revoke update, delete on public.languages from authenticated;
grant update (name) on public.languages to authenticated;
revoke update, delete on public.vocabulary_entries, public.vocabulary_translations from authenticated;
grant update (legacy_id, lemma, part_of_speech, grammatical_forms, hint_emojis, is_published)
  on public.vocabulary_entries to authenticated;
grant update (glosses) on public.vocabulary_translations to authenticated;

-- The creator and creation timestamp come from database defaults. A client
-- cannot impersonate another creator or test arbitrary auth.users IDs.
revoke insert, update on public.vocabulary_import_jobs from authenticated;
grant insert (source_id, input_kind, object_key, status),
  update (source_id, input_kind, object_key, status)
  on public.vocabulary_import_jobs to authenticated;

grant select on public.languages, public.vocabulary_entries, public.vocabulary_translations,
  public.categories, public.vocabulary_categories, public.books, public.lessons,
  public.sources, public.vocabulary_sources to anon;

create policy public_languages on public.languages for select to anon, authenticated using (true);
create policy published_words on public.vocabulary_entries for select to anon, authenticated using (is_published);
create policy published_categories on public.categories for select to anon, authenticated using (is_published);
create policy published_books on public.books for select to anon, authenticated using (is_published);

create policy published_translations on public.vocabulary_translations
for select to anon, authenticated using (
  exists (select 1 from public.vocabulary_entries w where w.id = vocabulary_id and w.is_published)
);

create policy published_category_links on public.vocabulary_categories
for select to anon, authenticated using (
  exists (select 1 from public.vocabulary_entries w where w.id = vocabulary_id and w.is_published)
  and exists (select 1 from public.categories c where c.id = category_id and c.is_published)
);

create policy published_lessons on public.lessons for select to anon, authenticated using (
  is_published and exists (select 1 from public.books b where b.id = book_id and b.is_published)
);

create policy published_sources on public.sources for select to anon, authenticated using (
  is_published
  and (book_id is null or exists (
    select 1 from public.books b where b.id = sources.book_id and b.is_published
  ))
  and (lesson_id is null or exists (
    select 1 from public.lessons l where l.id = sources.lesson_id and l.is_published
  ))
);

create policy published_source_links on public.vocabulary_sources
for select to anon, authenticated using (
  exists (select 1 from public.vocabulary_entries w where w.id = vocabulary_id and w.is_published)
  and exists (select 1 from public.sources s where s.id = source_id and s.is_published)
);

alter table public.personal_words enable row level security;
alter table public.vocabulary_progress enable row level security;
revoke all on public.personal_words, public.vocabulary_progress from public, anon, authenticated;
grant select, delete on public.personal_words, public.vocabulary_progress to authenticated;
grant
  insert (legacy_id, language_code, translation_language_code, lemma, translation,
    part_of_speech, grammatical_forms, hint_emojis),
  update (legacy_id, language_code, translation_language_code, lemma, translation,
    part_of_speech, grammatical_forms, hint_emojis)
on public.personal_words to authenticated;
grant
  insert (vocabulary_id, personal_word_id, language_code, translation_language_code,
    stage, queue_position, client_id, client_updated_at),
  update (stage, queue_position, client_id, client_updated_at)
on public.vocabulary_progress to authenticated;

create policy own_personal_words on public.personal_words for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy read_own_progress on public.vocabulary_progress for select to authenticated
using ((select auth.uid()) = user_id);

create policy delete_own_progress on public.vocabulary_progress for delete to authenticated
using ((select auth.uid()) = user_id);

-- The update grant excludes owner and word identity. Keep existing progress
-- writable after unpublishing so the owner can still reorder or reset a queue.
create policy update_own_progress on public.vocabulary_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy insert_own_progress on public.vocabulary_progress for insert to authenticated
with check (
  (select auth.uid()) = user_id and (
    (vocabulary_id is not null and exists (
      select 1 from public.vocabulary_entries w where w.id = vocabulary_id and w.is_published
    )) or
    (personal_word_id is not null and exists (
      select 1 from public.personal_words p where p.id = personal_word_id and p.user_id = (select auth.uid())
    ))
  )
);

commit;
