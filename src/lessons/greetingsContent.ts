// TERE! A1, page 13: introductory phrases and the blue vocabulary column.
export const keyPhrases = [
  { et: 'Tere!', ru: 'Здравствуй/-те!' },
  { et: 'Tervist!', ru: 'Здравствуй/-те! Привет!' },
  { et: 'Tere hommikust!', ru: 'Доброе утро!' },
  { et: 'Tere päevast!', ru: 'Добрый день!' },
  { et: 'Tere õhtust!', ru: 'Добрый вечер!' },
  { et: 'Head aega!', ru: 'До свидания!' },
  { et: 'Nägemiseni!', ru: 'До свидания!' },
  { et: 'Nägemist!', ru: 'Пока! До свидания!' },
  { et: 'Kohtumiseni!', ru: 'До встречи!' },
  { et: 'Kõike head!', ru: 'Всего доброго!' },
  { et: 'Head päeva!', ru: 'Хорошего дня!' },
  { et: 'Head ööd!', ru: 'Спокойной ночи!' },
  { et: 'Head õhtut!', ru: 'Хорошего вечера!' },
]

const words = [
  { key: 'hommik', et: 'hommik', catalogId: '7e9e6fde-75ff-4fff-94fb-54ced7bbaa43', ru: 'утро', forms: 'hommik, -u, -ut' },
  { key: 'paev', et: 'päev', catalogId: '21cdbbaf-48b7-4562-b948-1f6b8b908702', ru: 'день', forms: 'päev, päeva, päeva', note: 'Произносим удлинённо.' },
  { key: 'ohtu', et: 'õhtu', catalogId: '8ced276b-e680-4c97-8f7d-aa8333b0c8e7', ru: 'вечер', forms: 'õhtu, -, -t' },
  { key: 'aeg', et: 'aeg', catalogId: '0d36be86-ba0e-415f-ae0d-b4e5c777415a', ru: 'время', forms: 'aeg, aja, -a' },
  { key: 'oo', et: 'öö', catalogId: 'b46d3e0b-f035-43cf-b6fb-1d9d60ffe6cc', ru: 'ночь', forms: 'öö, -, -d' },
  { key: 'hea', et: 'hea', catalogId: '385a452b-701f-429b-95ab-b8f476646778', ru: 'хороший', forms: 'hea, -, -d' },
  { key: 'koik', et: 'kõik', catalogId: 'b567d610-b5d9-43df-96d9-803d400c7d12', ru: 'всё', forms: 'kõik, kõige, -e' },
  { key: 'kuulama', et: 'kuulama', catalogId: '088ee8bb-61cf-45bd-aeed-dc32ae7e5577', ru: 'слушать', forms: 'kuula/ma, -ta, -n' },
] as const

export const newWordExercises = words.map((word) => ({
  id: `new-word-${word.key}`, kind: 'word_intro' as const, prompt: word.et, word, explanation: word.ru,
}))

export const legacyGreetingIds = ['greeting-listen', 'greeting-morning', 'greeting-meaning', 'greeting-reply']
