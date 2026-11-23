-- Run the entire file in Supabase SQL Editor. FALSE previews; TRUE applies.
-- Source: TERE! sõnastik, page 20 (takku_tere_page20_words.json).
create or replace function pg_temp.import_tere_page20(apply_import boolean)
returns jsonb
language plpgsql
set search_path = ''
as $import$
declare
  payload constant jsonb := $words$[
    {"estonian": "aadress", "russian": "адрес", "emoji": "🏠"},
    {"estonian": "aasta", "russian": "год", "emoji": "📅"},
    {"estonian": "aastaaeg", "russian": "время года", "emoji": "🍂"},
    {"estonian": "abielus", "russian": "женат, замужем", "emoji": "💍"},
    {"estonian": "abikaasa", "russian": "супруг, супруга", "emoji": "💑"},
    {"estonian": "aeg", "russian": "время", "emoji": "⏰"},
    {"estonian": "aga", "russian": "но", "emoji": "↔️"},
    {"estonian": "ainult", "russian": "только", "emoji": "☝️"},
    {"estonian": "aku", "russian": "аккумулятор", "emoji": "🔋"},
    {"estonian": "ala", "russian": "участок, территория", "emoji": "🗺️"},
    {"estonian": "alati", "russian": "всегда", "emoji": "♾️"},
    {"estonian": "algama", "russian": "начинаться", "emoji": "▶️"},
    {"estonian": "allkiri", "russian": "подпись", "emoji": "✍️"},
    {"estonian": "allahindlus", "russian": "уценка, скидка", "emoji": "🏷️"},
    {"estonian": "alles", "russian": "только", "emoji": "⌛"},
    {"estonian": "amet", "russian": "должность", "emoji": "💼"},
    {"estonian": "andma", "russian": "давать", "emoji": "🤲"},
    {"estonian": "apelsin", "russian": "апельсин", "emoji": "🍊"},
    {"estonian": "aprill", "russian": "апрель", "emoji": "🗓️"},
    {"estonian": "apteek", "russian": "аптека", "emoji": "💊"},
    {"estonian": "arbuus", "russian": "арбуз", "emoji": "🍉"},
    {"estonian": "argipäev", "russian": "будни", "emoji": "📆"},
    {"estonian": "armas", "russian": "милый", "emoji": "🥰"},
    {"estonian": "armastama", "russian": "любить", "emoji": "❤️"},
    {"estonian": "arst", "russian": "врач", "emoji": "🩺"},
    {"estonian": "aru saama", "russian": "понимать", "emoji": "💡"},
    {"estonian": "arvama", "russian": "считать, думать", "emoji": "🤔"},
    {"estonian": "arve", "russian": "счёт", "emoji": "🧾"},
    {"estonian": "arvuti", "russian": "компьютер", "emoji": "💻"},
    {"estonian": "asuma", "russian": "находиться", "emoji": "📍"},
    {"estonian": "august", "russian": "август", "emoji": "🗓️"},
    {"estonian": "auto", "russian": "машина", "emoji": "🚗"},
    {"estonian": "autojuht", "russian": "водитель", "emoji": "🚘"},
    {"estonian": "automaatpesula", "russian": "автоматическая мойка", "emoji": "🚿"},
    {"estonian": "banaan", "russian": "банан", "emoji": "🍌"},
    {"estonian": "beebi", "russian": "младенец", "emoji": "👶"},
    {"estonian": "bussijaam", "russian": "автобусный вокзал", "emoji": "🚌"},
    {"estonian": "detsember", "russian": "декабрь", "emoji": "❄️"},
    {"estonian": "direktor", "russian": "директор", "emoji": "👔"},
    {"estonian": "doktor", "russian": "доктор", "emoji": "🩺"},
    {"estonian": "dokument", "russian": "документ", "emoji": "📄"},
    {"estonian": "edasi ütlema", "russian": "передавать (на словах)", "emoji": "🗣️"},
    {"estonian": "eelkooliealine", "russian": "дошкольник", "emoji": "🧒"},
    {"estonian": "(ees)nimi", "russian": "имя", "emoji": "🏷️"},
    {"estonian": "ega", "russian": "отрицательная частица: ни, не", "emoji": "🚫"},
    {"estonian": "eile", "russian": "вчера", "emoji": "⬅️"},
    {"estonian": "eksabikaasa", "russian": "бывший супруг, бывшая супруга", "emoji": "💔"},
    {"estonian": "eksima", "russian": "ошибаться", "emoji": "❌"},
    {"estonian": "elanik", "russian": "житель", "emoji": "🏘️"},
    {"estonian": "elukoht", "russian": "местожительство", "emoji": "🏡"},
    {"estonian": "ema", "russian": "мама", "emoji": "👩"},
    {"estonian": "enam-vähem", "russian": "более или менее", "emoji": "⚖️"},
    {"estonian": "enne", "russian": "раньше, до", "emoji": "⏮️"},
    {"estonian": "e-post", "russian": "электронная почта", "emoji": "📧"},
    {"estonian": "eraldi", "russian": "отдельно", "emoji": "↔️"},
    {"estonian": "esmaspäev", "russian": "понедельник", "emoji": "📅"},
    {"estonian": "et", "russian": "что", "emoji": "💬"},
    {"estonian": "ettekandja", "russian": "официант, официантка", "emoji": "🍽️"},
    {"estonian": "ettevaatust", "russian": "осторожно", "emoji": "⚠️"},
    {"estonian": "finantsdirektor", "russian": "финансовый директор", "emoji": "💼"},
    {"estonian": "firma", "russian": "фирма", "emoji": "🏢"},
    {"estonian": "forell", "russian": "форель", "emoji": "🐟"},
    {"estonian": "gaas", "russian": "газ", "emoji": "🔥"},
    {"estonian": "gümnaasium", "russian": "гимназия", "emoji": "🏫"},
    {"estonian": "haige", "russian": "больной", "emoji": "🤒"},
    {"estonian": "haigla", "russian": "больница", "emoji": "🏥"},
    {"estonian": "hakkliha", "russian": "фарш", "emoji": "🥩"},
    {"estonian": "hakkama", "russian": "начинать", "emoji": "▶️"},
    {"estonian": "hall", "russian": "серый", "emoji": "🩶"},
    {"estonian": "halvasti", "russian": "плохо", "emoji": "👎"},
    {"estonian": "hapukoor", "russian": "сметана", "emoji": "🥛"},
    {"estonian": "haridus", "russian": "образование", "emoji": "🎓"},
    {"estonian": "harjutus", "russian": "упражнение", "emoji": "📝"},
    {"estonian": "harva", "russian": "редко", "emoji": "🕰️"},
    {"estonian": "hea meelega", "russian": "с удовольствием", "emoji": "😊"},
    {"estonian": "hea", "russian": "хороший", "emoji": "👍"},
    {"estonian": "heeringas", "russian": "селёдка", "emoji": "🐟"},
    {"estonian": "helistama", "russian": "звонить", "emoji": "📞"},
    {"estonian": "hetk", "russian": "момент, мгновение", "emoji": "⏱️"},
    {"estonian": "hetkel", "russian": "в данный момент", "emoji": "⌚"},
    {"estonian": "hiline", "russian": "поздний", "emoji": "🌙"},
    {"estonian": "hiljem", "russian": "позже", "emoji": "⏳"},
    {"estonian": "hind", "russian": "цена", "emoji": "💶"},
    {"estonian": "hoidma", "russian": "хранить", "emoji": "📦"},
    {"estonian": "homme", "russian": "завтра", "emoji": "➡️"},
    {"estonian": "hommik", "russian": "утро", "emoji": "🌅"},
    {"estonian": "hotell", "russian": "отель", "emoji": "🏨"},
    {"estonian": "hästi", "russian": "хорошо", "emoji": "👌"},
    {"estonian": "ID-kaart", "russian": "идентификационная карта", "emoji": "🪪"},
    {"estonian": "iga päev", "russian": "каждый день", "emoji": "📆"},
    {"estonian": "inimene", "russian": "человек", "emoji": "🧍"},
    {"estonian": "isa", "russian": "папа", "emoji": "👨"},
    {"estonian": "ise", "russian": "сам(а)", "emoji": "🙋"},
    {"estonian": "isiklik", "russian": "личный", "emoji": "🔐"},
    {"estonian": "isikukood", "russian": "личный код", "emoji": "🔢"},
    {"estonian": "isikutunnistus", "russian": "удостоверение личности", "emoji": "🪪"},
    {"estonian": "istuma", "russian": "сидеть", "emoji": "🪑"},
    {"estonian": "isu", "russian": "аппетит", "emoji": "🍽️"},
    {"estonian": "ja", "russian": "и, да", "emoji": "➕"},
    {"estonian": "jaam", "russian": "вокзал", "emoji": "🚉"},
    {"estonian": "jaanuar", "russian": "январь", "emoji": "❄️"},
    {"estonian": "jah", "russian": "да", "emoji": "✅"}
  ]$words$;
  item record;
  page_id uuid;
  word_id uuid;
  matches uuid[];
  current_glosses text[];
  current_published boolean;
  new_count integer := 0;
  reused_count integer := 0;
  linked_count integer := 0;
  affected integer;
  conflicts jsonb := '[]';
begin
  if apply_import then
    -- The catalog has no unique lemma constraint. Serialize the lookup and
    -- insert against other catalog writers for the duration of this statement.
    lock table public.vocabulary_entries, public.vocabulary_translations, public.sources
      in share row exclusive mode;
  end if;

  if not exists (select 1 from public.languages where code = 'et')
    or not exists (select 1 from public.languages where code = 'ru') then
    raise exception 'Apply the initial Takku schema before running this import';
  end if;

  for item in select * from jsonb_to_recordset(payload) as x(estonian text, russian text, emoji text)
  loop
    word_id := null;
    select array_agg(w.id order by w.id) into matches
    from public.vocabulary_entries w
    where w.language_code = 'et'
      and lower(normalize(btrim(w.lemma))) = lower(normalize(btrim(item.estonian)));

    if cardinality(matches) > 1 then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object('word', item.estonian, 'reason', 'multiple_existing_entries'));
      continue;
    elsif cardinality(matches) = 1 then
      word_id := matches[1];
      select w.is_published, t.glosses into current_published, current_glosses
      from public.vocabulary_entries w
      left join public.vocabulary_translations t on t.vocabulary_id = w.id and t.language_code = 'ru'
      where w.id = word_id;

      if not current_published or lower(normalize(regexp_replace(
        btrim(array_to_string(current_glosses, ', ')), '[[:space:]]+', ' ', 'g'
      ))) is distinct from lower(normalize(regexp_replace(btrim(item.russian), '[[:space:]]+', ' ', 'g'))) then
        conflicts := conflicts || jsonb_build_array(jsonb_build_object('word', item.estonian,
          'reason', case when not current_published then 'existing_draft' else 'different_or_missing_russian_translation' end));
        continue;
      end if;

      reused_count := reused_count + 1;
      if apply_import then
        update public.vocabulary_entries set hint_emojis = array[item.emoji]
        where id = word_id and cardinality(hint_emojis) = 0;
      end if;
    else
      new_count := new_count + 1;
      if apply_import then
        insert into public.vocabulary_entries (language_code, lemma, hint_emojis, is_published)
        values ('et', item.estonian, array[item.emoji], true)
        returning id into word_id;

        -- Preserve source punctuation and keep compound translations verbatim.
        insert into public.vocabulary_translations (vocabulary_id, language_code, glosses)
        values (word_id, 'ru', array[item.russian]);
      end if;
    end if;

    if apply_import then
      if page_id is null then
        select s.id into page_id from public.sources s
        where s.book_id is null and s.lesson_id is null and s.page_label = '20'
          and s.citation = 'TERE! sõnastik, page 20'
        order by s.is_published desc, s.id limit 1;
        if page_id is null then
          insert into public.sources (page_label, citation, is_published)
          values ('20', 'TERE! sõnastik, page 20', true) returning id into page_id;
        else
          update public.sources set is_published = true where id = page_id and not is_published;
        end if;
      end if;

      insert into public.vocabulary_sources (vocabulary_id, source_id)
      values (word_id, page_id) on conflict do nothing;
      get diagnostics affected = row_count;
      linked_count := linked_count + affected;
    end if;
  end loop;

  return jsonb_build_object(
    'applied', apply_import,
    'total', jsonb_array_length(payload),
    'new_words', new_count,
    'existing_words', reused_count,
    'conflicting_words', jsonb_array_length(conflicts),
    'conflicts', conflicts,
    'new_source_links', linked_count
  );
end;
$import$;

-- Change FALSE to TRUE only after reviewing the preview counts.
select pg_temp.import_tere_page20(false) as import_summary;
