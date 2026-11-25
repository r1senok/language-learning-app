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
  { key: 'hommik', et: 'hommik', ru: 'утро', forms: 'hommik, -u, -ut' },
  { key: 'paev', et: 'päev', ru: 'день', forms: 'päev, päeva, päeva', note: 'Произносим удлинённо.' },
  { key: 'ohtu', et: 'õhtu', ru: 'вечер', forms: 'õhtu, -, -t' },
  { key: 'aeg', et: 'aeg', ru: 'время', forms: 'aeg, aja, -a' },
  { key: 'oo', et: 'öö', ru: 'ночь', forms: 'öö, -, -d' },
  { key: 'hea', et: 'hea', ru: 'хороший', forms: 'hea, -, -d' },
  { key: 'koik', et: 'kõik', ru: 'всё', forms: 'kõik, kõige, -e' },
  { key: 'kuulama', et: 'kuulama', ru: 'слушать', forms: 'kuula/ma, -ta, -n' },
] as const

export const newWordExercises = words.map((word, index) => {
  const options = Array.from({ length: 4 }, (_, offset) => {
    const item = words[(index + offset - (index % 4) + words.length) % words.length]
    return { id: item.et, text: item.ru }
  })
  return { id: `new-word-${word.key}`, kind: 'multiple_choice' as const, prompt: word.et, word,
    options, correct: word.et, explanation: word.ru }
})

export const legacyGreetingIds = ['greeting-listen', 'greeting-morning', 'greeting-meaning', 'greeting-reply']
