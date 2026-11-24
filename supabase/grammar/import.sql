-- Replace [] with the reviewed JSON array, preserving the $grammar$ delimiters.
-- preview is the default. commit fills empty fields. rollback_preview and rollback
-- accept ONLY the rollback_batch returned by the corresponding commit.
begin isolation level serializable;

with config(mode, payload) as (
  values ('preview', $grammar$
[]
$grammar$::jsonb)
),
raw as (
  select value as item, ordinality as line
  from config cross join lateral jsonb_array_elements(payload) with ordinality
),
parsed as (
  select line, item, case when item->>'id' ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (item->>'id')::uuid end as id,
    item->>'lemma' as lemma, item->'russian_glosses' as glosses,
    item->'before'->>'part_of_speech' as before_pos,
    item->'before'->'grammatical_forms' as before_forms,
    item->'after'->>'part_of_speech' as after_pos,
    item->'after'->'grammatical_forms' as after_forms
  from raw
),
review as (
  select p.*, c.mode, v.part_of_speech as current_pos,
    v.grammatical_forms as current_forms,
    coalesce(to_jsonb(t.glosses), '[]'::jsonb) as current_glosses,
    case
      when c.mode not in ('preview', 'commit', 'rollback_preview', 'rollback') then 'invalid_mode'
      when p.item->>'status' in ('needs_review', 'unverified', 'source_conflict') then p.item->>'status'
      when p.id is null or nullif(btrim(p.lemma), '') is null
        or jsonb_typeof(p.glosses) is distinct from 'array'
        or (c.mode in ('rollback_preview', 'rollback')
            and coalesce(p.item->>'write_xid', '') !~ '^[0-9]+$')
        or p.item->>'status' is distinct from 'verified'
        or nullif(btrim(p.item->>'reviewed_by'), '') is null
        or nullif(btrim(p.item->>'reviewed_on'), '') is null
        or jsonb_typeof(p.item->'sources') is distinct from 'array'
        or p.item->'sources' = '[]'::jsonb
        or not exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(p.item->'sources') = 'array'
            then p.item->'sources' else '[]'::jsonb end) source
          where source->>'kind' in ('tere', 'sonaveeb', 'keeleoppija_sonaveeb', 'ekilex')
            and nullif(btrim(source->>'reference'), '') is not null
        )
        or coalesce(jsonb_typeof(p.item->'before'->'part_of_speech'), '') not in ('null', 'string')
        or jsonb_typeof(p.before_forms) is distinct from 'object'
        or jsonb_typeof(p.item->'after'->'part_of_speech') is distinct from 'string'
        or p.after_pos not in ('noun', 'adjective', 'verb', 'pronoun', 'numeral', 'adverb',
                              'conjunction', 'adposition', 'particle', 'interjection', 'phrase', 'determiner')
        or jsonb_typeof(p.after_forms) is distinct from 'object'
        or not p.after_forms @> p.before_forms
        or (p.before_pos is not null and p.before_pos is distinct from p.after_pos)
        or exists (
          select 1 from jsonb_each(case when jsonb_typeof(p.after_forms) = 'object'
            then p.after_forms else '{}'::jsonb end) f
          where case
            when p.before_forms ? f.key then p.before_forms->f.key is distinct from f.value
            else not (case
              when p.after_pos in ('noun', 'adjective') then f.key in ('nimetav', 'omastav', 'osastav')
              when p.after_pos = 'verb' then f.key in ('ma_infinitive', 'da_infinitive', 'present_1sg', 'past_1sg')
              else false end)
              or jsonb_typeof(f.value) <> 'string' or nullif(btrim(f.value #>> '{}'), '') is null
            end
        ) then 'invalid_row'
      when count(*) over (partition by p.id) > 1 then 'duplicate_id'
      when v.id is null or v.language_code <> 'et' or not v.is_published then 'not_published_et'
      when v.lemma is distinct from p.lemma
        or coalesce(to_jsonb(t.glosses), '[]'::jsonb) is distinct from p.glosses then 'identity_changed'
      when v.part_of_speech is not distinct from p.after_pos and v.grammatical_forms = p.after_forms
        and c.mode in ('preview','commit') then 'already_applied'
      when v.part_of_speech is not distinct from p.before_pos and v.grammatical_forms = p.before_forms
        and c.mode in ('rollback_preview','rollback') then 'already_rolled_back'
      when c.mode in ('rollback_preview','rollback')
        and v.xmin::text is distinct from p.item->>'write_xid' then 'row_updated_after_import'
      when (c.mode in ('preview','commit') and v.part_of_speech is not distinct from p.before_pos
            and v.grammatical_forms = p.before_forms)
        or (c.mode in ('rollback_preview','rollback') and v.part_of_speech is not distinct from p.after_pos
            and v.grammatical_forms = p.after_forms) then 'ready'
      else 'values_changed'
    end as result
  from parsed p cross join config c
  left join public.vocabulary_entries v on v.id = p.id
  left join public.vocabulary_translations t on t.vocabulary_id = p.id and t.language_code = 'ru'
),
changed as (
  update public.vocabulary_entries v set
    part_of_speech = case when r.mode = 'rollback' then r.before_pos else r.after_pos end,
    grammatical_forms = case when r.mode = 'rollback' then r.before_forms else r.after_forms end
  from review r
  where r.mode in ('commit', 'rollback') and r.result = 'ready' and v.id = r.id
    and v.part_of_speech is not distinct from r.current_pos and v.grammatical_forms = r.current_forms
    and not exists (select 1 from review where result not in ('ready','already_applied','already_rolled_back'))
  returning r.line, r.mode, r.item, v.xmin::text as write_xid
)
select c.mode, count(r.line) as batch_size,
  count(*) filter (where r.result = 'ready') as ready,
  count(*) filter (where r.result in ('already_applied','already_rolled_back')) as already_done,
  count(*) filter (where r.result not in ('ready','already_applied','already_rolled_back')) as blocked,
  count(x.line) as written,
  coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'lemma', r.lemma, 'result', r.result, 'written', x.line is not null,
    'current', jsonb_build_object('part_of_speech', r.current_pos, 'grammatical_forms', r.current_forms,
                                  'russian_glosses', r.current_glosses),
    'before', r.item->'before', 'after', r.item->'after', 'notes', r.item->'notes'
  ) order by r.line) filter (where r.line is not null), '[]'::jsonb) as detail,
  coalesce(jsonb_agg(x.item || jsonb_build_object('write_xid', x.write_xid) order by x.line) filter (where x.mode = 'commit'), '[]'::jsonb) as rollback_batch
from config c left join review r on true left join changed x on x.line = r.line
group by c.mode;

commit;
