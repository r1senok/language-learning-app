-- Run on staging first. The IDs below are taken from grammar/review/working-647.json.
-- A conflicting lemma aborts the whole transaction for manual reconciliation.
begin;

create temporary table lesson_two_catalog (
  id uuid primary key, lemma text not null, gloss text not null, part_of_speech text not null, forms jsonb not null
) on commit drop;

insert into lesson_two_catalog values
  ('c65c1483-31cf-4fc0-849e-89ca39d8b251', 'suur', 'большой', 'adjective', '{"nimetav":"suur","omastav":"suure","osastav":"suurt"}'),
  ('3f88560e-f7f1-4424-ab32-3127aa93b9c5', 'andma', 'давать', 'verb', '{"ma_infinitive":"andma","da_infinitive":"anda","present_1sg":"annan"}'),
  ('72badb21-429d-4525-9e00-b11dbcca6001', 'võtma', 'брать', 'verb', '{"ma_infinitive":"võtma","da_infinitive":"võtta","present_1sg":"võtan"}'),
  ('1e17ae4a-6c3c-4da8-b9ac-9ec856047e71', 'tore', 'здорово', 'adjective', '{"nimetav":"tore","omastav":"toreda","osastav":"toredat"}'),
  ('19c4f744-c73c-404a-9af3-a339fbcb7676', 'tänu', 'благодарность', 'noun', '{"nimetav":"tänu","omastav":"tänu","osastav":"tänu"}'),
  ('bc9771f9-6e64-45de-94fe-13e3d5c8dded', 'midagi', 'что-нибудь', 'pronoun', '{}'),
  ('f30100da-393f-4c5d-adea-54b029e85d70', 'isu', 'аппетит', 'noun', '{"nimetav":"isu","omastav":"isu","osastav":"isu"}');

lock table public.vocabulary_entries, public.vocabulary_translations in share row exclusive mode;

do $$
begin
  if exists (
    select 1
    from lesson_two_catalog s
    join public.vocabulary_entries e on e.id = s.id or (e.language_code = 'et' and e.lemma = s.lemma)
    where e.id <> s.id or e.lemma <> s.lemma or e.language_code <> 'et'
  ) then
    raise exception 'Lesson 2 catalog ID/lemma conflict. Reconcile existing rows before publishing.';
  end if;
end $$;

insert into public.vocabulary_entries (id, language_code, lemma, part_of_speech, grammatical_forms, is_published)
select id, 'et', lemma, part_of_speech, forms, true
from lesson_two_catalog
on conflict (id) do nothing;

insert into public.vocabulary_translations (vocabulary_id, language_code, glosses)
select id, 'ru', array[gloss] from lesson_two_catalog
on conflict (vocabulary_id, language_code) do nothing;

update public.vocabulary_entries e
set is_published = true
from lesson_two_catalog s
where e.id = s.id and not e.is_published;

commit;
