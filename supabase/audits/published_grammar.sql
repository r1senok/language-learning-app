-- Read-only audit. Run both SELECT statements in Supabase SQL Editor.
select
  count(*) as published_estonian_words,
  count(*) filter (where grammatical_forms <> '{}'::jsonb) as with_nonempty_forms_object,
  count(*) filter (where nullif(btrim(part_of_speech), '') is not null) as with_part_of_speech
from public.vocabulary_entries
where is_published and language_code = 'et';

select coalesce(nullif(btrim(w.part_of_speech), ''), '(empty)') as part_of_speech,
  f.key as form_key, count(*) as published_words
from public.vocabulary_entries w
cross join lateral jsonb_object_keys(w.grammatical_forms) as f(key)
where w.is_published and w.language_code = 'et'
group by 1, 2
order by 1, 2;
