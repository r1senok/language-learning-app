-- Run after the migrations in a clean local database.
begin;
create function pg_temp.ok(condition boolean, description text)
returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Failed: %', description; end if;
end;
$$;

select pg_temp.ok(not has_function_privilege('anon', 'public.import_vocabulary_batch(jsonb,text)', 'execute')
  and not has_function_privilege('authenticated', 'public.import_vocabulary_batch(jsonb,text)', 'execute')
  and has_function_privilege('service_role', 'public.import_vocabulary_batch(jsonb,text)', 'execute'),
  'RPC is server-only');

insert into public.vocabulary_entries (id, language_code, lemma, hint_emojis, is_published) values
  ('00000000-0000-4000-8000-000000000021', 'et', 'koer', array['🐶'], true),
  ('00000000-0000-4000-8000-000000000022', 'et', 'kass', '{}', true);
insert into public.vocabulary_translations values
  ('00000000-0000-4000-8000-000000000021', 'ru', array['собака']),
  ('00000000-0000-4000-8000-000000000022', 'ru', array['кот']);

\set input '[{"estonian":"tere","russian":"привет","emojis":["👋"],"source":"TERE!","page":"20"},{"estonian":"koer","russian":"собака","emojis":["🐕"],"source":"TERE!","page":"20"},{"estonian":"kass","russian":"кошка","emojis":[],"source":"TERE!","page":"20"}]'

set local role service_role;
select public.import_vocabulary_batch(:'input')->>'fingerprint' as before_edit \gset
reset role;
select pg_temp.ok((select count(*) = 2 from public.vocabulary_entries)
  and (select count(*) = 0 from public.sources), 'preview does not write');
update public.vocabulary_entries set hint_emojis = array['🐩'] where lemma = 'koer';

set local role service_role;
select pg_temp.ok(public.import_vocabulary_batch(:'input', :'before_edit')->>'status' = 'stale',
  'changed existing metadata invalidates preview');
select public.import_vocabulary_batch(:'input') as preview \gset
select pg_temp.ok((:'preview'::jsonb->>'new_words')::int = 1
  and (:'preview'::jsonb->>'existing_words')::int = 1
  and (:'preview'::jsonb->>'conflicting_words')::int = 1, 'preview classifies words');
select :'preview'::jsonb->>'fingerprint' as confirmation \gset
select public.import_vocabulary_batch(:'input', :'confirmation') as committed \gset
select pg_temp.ok((:'committed'::jsonb->>'new_source_links')::int = 2
  and (:'committed'::jsonb->>'new_words')::int = 1, 'commit publishes and links only safe entries');
select pg_temp.ok(public.import_vocabulary_batch(:'input', :'confirmation')->>'status' = 'stale',
  'reusing confirmation after writes is rejected');

select public.import_vocabulary_batch(:'input')->>'fingerprint' as retry \gset
select public.import_vocabulary_batch(:'input', :'retry') as repeated \gset
select pg_temp.ok((:'repeated'::jsonb->>'new_words')::int = 0
  and (:'repeated'::jsonb->>'new_source_links')::int = 0, 'fresh rerun is idempotent');
set local role anon;
select pg_temp.ok((select count(*) = 1 from public.vocabulary_entries where lemma = 'tere' and is_published),
  'guest reads imported word');
select pg_temp.ok((select hint_emojis = array['🐩'] from public.vocabulary_entries where lemma = 'koer'),
  'existing emoji is preserved');
select pg_temp.ok((select glosses = array['кот'] from public.vocabulary_translations
  where vocabulary_id = '00000000-0000-4000-8000-000000000022'), 'conflicting translation is preserved');
rollback;
