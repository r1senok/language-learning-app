-- Read only. Download the result as CSV from Supabase SQL Editor.
select v.id, v.lemma, coalesce(to_jsonb(t.glosses), '[]'::jsonb) as russian_glosses,
       v.part_of_speech, v.grammatical_forms
from public.vocabulary_entries v
left join public.vocabulary_translations t
  on t.vocabulary_id = v.id and t.language_code = 'ru'
where v.is_published and v.language_code = 'et'
order by v.lemma, v.id;
