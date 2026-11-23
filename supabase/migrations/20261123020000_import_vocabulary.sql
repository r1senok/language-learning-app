begin;

create function public.import_vocabulary_batch(p_words jsonb, p_expected text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan jsonb;
  fingerprint text;
  item jsonb;
  word_id uuid;
  source_id uuid;
  linked integer := 0;
  affected integer;
begin
  if jsonb_typeof(p_words) is distinct from 'array' then
    raise exception 'Expected an array of words' using errcode = '22023';
  end if;
  if jsonb_array_length(p_words) not between 1 and 500 then
    raise exception 'Expected 1 to 500 words' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_words) as input(word)
    group by lower(normalize(btrim(word->>'estonian')))
    having count(*) > 1
  ) then
    raise exception 'Duplicate lemmas in input' using errcode = '22023';
  end if;

  if p_expected is not null then
    -- There is no unique lemma constraint. Keep matching and inserting atomic
    -- with respect to regular catalog editors as well as other imports.
    lock table public.vocabulary_entries, public.vocabulary_translations,
      public.sources, public.vocabulary_sources in share row exclusive mode;
  end if;

  with inputs as (
    select value as word, ordinality as position
    from jsonb_array_elements(p_words) with ordinality
  ), candidates as (
    select i.*,
      coalesce(existing.rows, '[]'::jsonb) as existing_words,
      coalesce(sources.rows, '[]'::jsonb) as existing_sources
    from inputs i
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'entry', to_jsonb(w), 'glosses', t.glosses,
        'links', (select jsonb_agg(l.source_id order by l.source_id)
          from public.vocabulary_sources l where l.vocabulary_id = w.id)
      ) order by w.id) as rows
      from public.vocabulary_entries w
      left join public.vocabulary_translations t on t.vocabulary_id = w.id and t.language_code = 'ru'
      where w.language_code = 'et'
        and lower(normalize(btrim(w.lemma))) = lower(normalize(i.word->>'estonian'))
    ) existing on true
    left join lateral (
      select jsonb_agg(to_jsonb(s) order by s.id) as rows
      from public.sources s
      where s.book_id is null and s.lesson_id is null and s.citation = i.word->>'source'
        and s.page_label is not distinct from i.word->>'page'
    ) sources on true
  )
  select jsonb_agg(jsonb_build_object(
    'word', word, 'matches', existing_words, 'sources', existing_sources,
    'action', case
      when jsonb_array_length(existing_words) = 0 then 'new'
      when jsonb_array_length(existing_words) > 1 then 'multiple_existing_entries'
      when not (existing_words #>> '{0,entry,is_published}')::boolean then 'existing_draft'
      when lower(normalize(regexp_replace(btrim((
        select string_agg(value, ', ' order by ordinality)
        from jsonb_array_elements_text(nullif(existing_words #> '{0,glosses}', 'null'::jsonb))
          with ordinality
      )), '[[:space:]]+', ' ', 'g'))) is distinct from lower(normalize(regexp_replace(word->>'russian', '[[:space:]]+', ' ', 'g')))
        then 'different_or_missing_russian_translation'
      else 'existing'
    end
  ) order by position) into plan from candidates;

  fingerprint := encode(sha256(convert_to(plan::text, 'UTF8')), 'hex');
  if p_expected is not null and p_expected <> fingerprint then
    return jsonb_build_object('status', 'stale');
  end if;

  if p_expected is not null then
    for item in select value from jsonb_array_elements(plan) loop
      if item->>'action' = 'new' then
        insert into public.vocabulary_entries (language_code, lemma, hint_emojis, is_published)
        values ('et', item #>> '{word,estonian}',
          array(select jsonb_array_elements_text(item #> '{word,emojis}')), true)
        returning id into word_id;
        insert into public.vocabulary_translations (vocabulary_id, language_code, glosses)
        values (word_id, 'ru', array[item #>> '{word,russian}']);
      elsif item->>'action' = 'existing' then
        word_id := (item #>> '{matches,0,entry,id}')::uuid;
      else
        continue;
      end if;

      select id into source_id from public.sources
        where book_id is null and lesson_id is null and is_published
          and citation = item #>> '{word,source}'
          and page_label is not distinct from item #>> '{word,page}'
        order by id limit 1;
      if source_id is null then
        insert into public.sources (citation, page_label, is_published)
        values (item #>> '{word,source}', item #>> '{word,page}', true)
        returning id into source_id;
      end if;

      insert into public.vocabulary_sources (vocabulary_id, source_id)
      values (word_id, source_id) on conflict do nothing;
      get diagnostics affected = row_count;
      linked := linked + affected;
    end loop;
  end if;

  return (select jsonb_build_object(
    'status', case when p_expected is null then 'preview' else 'committed' end,
    'fingerprint', fingerprint,
    'total', count(*),
    'new_words', count(*) filter (where value->>'action' = 'new'),
    'existing_words', count(*) filter (where value->>'action' = 'existing'),
    'conflicting_words', count(*) filter (where value->>'action' not in ('new', 'existing')),
    'conflicts', coalesce(jsonb_agg(jsonb_build_object(
      'word', value #>> '{word,estonian}', 'reason', value->>'action'
    )) filter (where value->>'action' not in ('new', 'existing')), '[]'::jsonb),
    'new_source_links', linked
  ) from jsonb_array_elements(plan));
end;
$$;

revoke all on function public.import_vocabulary_batch(jsonb, text) from public, anon, authenticated;
grant execute on function public.import_vocabulary_batch(jsonb, text) to service_role;

commit;
