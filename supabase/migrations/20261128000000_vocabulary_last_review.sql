begin;

-- Additive metadata. Existing stages and their queue positions are preserved.
alter table public.vocabulary_progress add column last_reviewed_at timestamptz;

create or replace function takku_private.progress_snapshot(p_user uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'imported', exists (select 1 from takku_private.progress_imports where user_id = p_user),
    'personal', coalesce((
      select jsonb_agg((to_jsonb(w) - 'user_id') || jsonb_build_object('client_key', k.client_key) order by w.id)
      from public.personal_words w
      left join takku_private.personal_word_keys k on k.personal_word_id = w.id and k.user_id = w.user_id
      where w.user_id = p_user
        and w.language_code = 'et' and w.translation_language_code = 'ru'
    ), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', coalesce(v.vocabulary_id, v.personal_word_id),
        'kind', case when v.vocabulary_id is null then 'personal' else 'catalog' end,
        'stage', v.stage, 'queue_position', v.queue_position, 'revision', v.revision,
        'last_reviewed_at', v.last_reviewed_at
      ) order by v.id)
      from public.vocabulary_progress v where v.user_id = p_user
        and v.language_code = 'et' and v.translation_language_code = 'ru'
    ), '[]'::jsonb)
  );
$$;
create or replace function public.write_takku_progress(
  p_user uuid, p_operation uuid, p_version text, p_decide_import boolean,
  p_personal jsonb, p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
  item record;
  affected integer;
  word_id uuid;
  id_map jsonb := '{}'::jsonb;
begin
  if p_user is null or p_user is distinct from (select auth.uid()) then
    raise exception 'Account mismatch' using errcode = '42501';
  end if;
  if p_operation is null or p_decide_import is null
    or jsonb_typeof(p_personal) is distinct from 'array'
    or jsonb_typeof(p_progress) is distinct from 'array' then
    raise exception 'Invalid progress operation' using errcode = '22023';
  end if;

  -- Serialize complete queue updates for one account without blocking others.
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 7116));
  snapshot := public.read_takku_progress(p_user, p_operation);
  if (snapshot->>'acknowledged')::boolean
    or p_version is distinct from snapshot->>'version'
    or (p_decide_import and (snapshot->>'imported')::boolean) then
    return snapshot;
  end if;

  for item in select * from jsonb_to_recordset(p_personal) as x(
    id uuid, legacy_id bigint, lemma text, translation text, part_of_speech text,
    grammatical_forms jsonb, hint_emojis text[]
  ) loop
    select personal_word_id into word_id from takku_private.personal_word_keys
      where user_id = p_user and client_key = item.id;
    if not found then
      insert into public.personal_words
        (user_id, legacy_id, language_code, translation_language_code, lemma, translation,
         part_of_speech, grammatical_forms, hint_emojis)
      values (p_user, item.legacy_id, 'et', 'ru', item.lemma, item.translation,
        item.part_of_speech, item.grammatical_forms, item.hint_emojis)
      returning id into word_id;
      insert into takku_private.personal_word_keys values (p_user, item.id, word_id);
    end if;
    id_map := id_map || jsonb_build_object(item.id::text, word_id);
  end loop;

  set constraints public.vocabulary_progress_queue_unique deferred;
  for item in select * from jsonb_to_recordset(p_progress) as x(
    id uuid, kind text, stage smallint, queue_position integer, revision bigint, last_reviewed_at timestamptz
  ) loop
    if item.id is null or item.kind is null or item.kind not in ('personal', 'catalog') then
      raise exception 'Invalid word reference' using errcode = '22023';
    end if;

    word_id := item.id;
    if item.kind = 'personal' then
      word_id := coalesce((id_map->>item.id::text)::uuid, item.id);
    end if;
    if item.revision is null then
      if item.kind = 'catalog' and not exists (
        select 1 from public.vocabulary_entries w
        join public.vocabulary_translations t on t.vocabulary_id = w.id and t.language_code = 'ru'
        where w.id = word_id and w.is_published and w.language_code = 'et'
      ) or item.kind = 'personal' and not exists (
        select 1 from public.personal_words w where w.id = word_id and w.user_id = p_user
          and w.language_code = 'et' and w.translation_language_code = 'ru'
      ) then
        raise exception 'Word is unavailable' using errcode = '42501';
      end if;
      insert into public.vocabulary_progress
        (user_id, vocabulary_id, personal_word_id, language_code, translation_language_code,
         stage, queue_position, client_id, client_updated_at, last_reviewed_at)
      values (p_user, case when item.kind = 'catalog' then word_id end,
        case when item.kind = 'personal' then word_id end, 'et', 'ru',
        item.stage, item.queue_position, p_operation::text, statement_timestamp(), item.last_reviewed_at);
    else
      update public.vocabulary_progress
        set stage = item.stage, queue_position = item.queue_position,
            last_reviewed_at = coalesce(greatest(last_reviewed_at, item.last_reviewed_at), last_reviewed_at),
            client_id = p_operation::text, client_updated_at = statement_timestamp()
        where user_id = p_user and language_code = 'et' and translation_language_code = 'ru'
          and revision = item.revision and (
            (item.kind = 'catalog' and vocabulary_id = word_id)
            or (item.kind = 'personal' and personal_word_id = word_id)
          );
      get diagnostics affected = row_count;
      if affected <> 1 then
        raise exception 'Progress changed concurrently' using errcode = '40001';
      end if;
    end if;
  end loop;
  set constraints public.vocabulary_progress_queue_unique immediate;

  if p_decide_import then
    insert into takku_private.progress_imports values (p_user);
  end if;
  insert into takku_private.progress_operations values (p_user, p_operation);
  return public.read_takku_progress(p_user, p_operation);
end;
$$;

commit;
