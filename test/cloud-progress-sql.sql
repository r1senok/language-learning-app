-- Run after both migrations in a disposable local Supabase-compatible database.
begin;
create function pg_temp.ok(condition boolean, description text) returns void language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Failed: %', description; end if;
end;
$$;
create function pg_temp.denied(statement text) returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Unexpected permission: %', statement;
exception when insufficient_privilege then null;
end;
$$;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
insert into public.vocabulary_entries (id, language_code, lemma, is_published) values
  ('00000000-0000-4000-8000-000000000011', 'et', 'tere', true),
  ('00000000-0000-4000-8000-000000000012', 'et', 'saladus', false);
insert into public.vocabulary_translations values
  ('00000000-0000-4000-8000-000000000011', 'ru', array['привет']),
  ('00000000-0000-4000-8000-000000000012', 'ru', array['секрет']);

set local role anon;
select pg_temp.denied($q$select public.read_takku_progress('00000000-0000-4000-8000-000000000001')$q$);
select pg_temp.denied($q$select public.write_takku_progress(null,null,null,false,'[]','[]')$q$);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001"}';
select pg_temp.denied('select * from takku_private.progress_operations');
select pg_temp.denied('select * from takku_private.personal_word_keys');
select pg_temp.denied('select takku_private.progress_snapshot(auth.uid())');
select pg_temp.denied($q$select public.read_takku_progress('00000000-0000-4000-8000-000000000002')$q$);

select public.read_takku_progress(auth.uid())->>'version' as empty_version \gset
select public.write_takku_progress(auth.uid(),'00000000-0000-4000-8000-000000000101',:'empty_version',true,
  '[{"id":"00000000-0000-4000-8000-000000000021","legacy_id":1,"lemma":"oma","translation":"свой","grammatical_forms":{},"hint_emojis":[]}]',
  '[{"id":"00000000-0000-4000-8000-000000000011","kind":"catalog","stage":1,"queue_position":0},
    {"id":"00000000-0000-4000-8000-000000000021","kind":"personal","stage":1,"queue_position":1}]') as saved \gset
select pg_temp.ok((:'saved'::jsonb->>'acknowledged')::boolean and (:'saved'::jsonb->>'imported')::boolean,
  'import acknowledged atomically');
select pg_temp.ok(jsonb_array_length(:'saved'::jsonb->'progress') = 2 and
  (:'saved'::jsonb#>>'{personal,0,client_key}') = '00000000-0000-4000-8000-000000000021',
  'personal mapping and progress persisted');
select :'saved'::jsonb->>'version' as version, :'saved'::jsonb#>>'{personal,0,id}' as personal_id \gset

select pg_temp.ok((public.write_takku_progress(auth.uid(),'00000000-0000-4000-8000-000000000101',:'empty_version',true,'[]','[]')->>'acknowledged')::boolean,
  'lost response can be retried after version changed');
select pg_temp.ok(not (public.write_takku_progress(auth.uid(),'00000000-0000-4000-8000-000000000102',:'version',true,'[]','[]')->>'acknowledged')::boolean,
  'a second device cannot import again');
select pg_temp.ok(not (public.write_takku_progress(auth.uid(),'00000000-0000-4000-8000-000000000103',:'empty_version',false,'[]','[]')->>'acknowledged')::boolean,
  'stale device receives current version without writes');

select public.write_takku_progress(auth.uid(),'00000000-0000-4000-8000-000000000104',:'version',false,'[]',
  jsonb_build_array(
    jsonb_build_object('id', :'personal_id', 'kind', 'personal', 'revision', 1, 'stage', 1, 'queue_position', 0),
    jsonb_build_object('id', '00000000-0000-4000-8000-000000000011', 'kind', 'catalog', 'revision', 1, 'stage', 2, 'queue_position', 1)
  )) as reordered \gset
select pg_temp.ok((:'reordered'::jsonb->>'acknowledged')::boolean and
  (select count(*) = 2 and bool_and(revision=2) from public.vocabulary_progress),
  'queue swap is atomic and revisions advance');

select pg_temp.denied(format($q$select public.write_takku_progress(auth.uid(),
  '00000000-0000-4000-8000-000000000105',%L,false,'[]',
  '[{"id":"00000000-0000-4000-8000-000000000012","kind":"catalog","stage":3}]')$q$,
  :'reordered'::jsonb->>'version'));

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002"}';
select pg_temp.ok(jsonb_array_length(public.read_takku_progress(auth.uid())->'progress') = 0,
  'second account has its own snapshot');
select pg_temp.denied($q$select public.write_takku_progress('00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000106','',false,'[]','[]')$q$);
select pg_temp.denied(format($q$select public.write_takku_progress(auth.uid(),
  '00000000-0000-4000-8000-000000000107',%L,false,'[]',
  '[{"id":"%s","kind":"personal","stage":3}]')$q$, public.read_takku_progress(auth.uid())->>'version', :'personal_id'));
select pg_temp.ok((select count(*)=0 from public.personal_words) and
  (select count(*)=0 from public.vocabulary_progress), 'direct RLS remains scoped');
rollback;
