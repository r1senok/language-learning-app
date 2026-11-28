import { lessonId } from './course.ts'
import { keyPhrases } from './greetingsContent.ts'
import { pronounBookExercises } from './pronounExercises.ts'
import type { BookChoice, BookOrder, Exercise } from './engine.ts'

export const bookId = 'tere-a1'
export const deferredExercises = [
  [13, 1, 'audio'], [13, 2, 'partner'], [14, 3, 'ambiguous-key'], [14, 4, 'audio'],
  [14, 5, 'audio-part-2'], [15, 10, 'audio'], [16, 15, 'audio'], [16, 16, 'audio-part-2'], [16, 17, 'external-qr'],
].map(([page, number, reason]) => ({ bookId, lessonId, page, number, reason, status: 'deferred' as const }))

const long = ['mina', 'sina', 'tema', 'meie', 'teie', 'nemad']
const short = ['ma', 'sa', 'ta', 'me', 'te', 'nad']
const olema = ['olen', 'oled', 'on', 'oleme', 'olete', 'ole']
const pairRows = short.map((prompt, i) => [prompt, long[i]] as const)
const pairOptions = ['nemad', 'tema', 'meie', 'sina', 'mina', 'teie']

function metadata(page: number, number: number, question: number, total: number, heading: string,
  language: 'ru' | 'et', mode?: 'translate' | 'match' | 'gap' | 'order') {
  return { bookId, lessonId, page, number, question, total, heading, language, mode, answerSource: 'vastused-215' as const }
}

function gap(page: number, number: number, rows: [string, string][], options: string[]): BookChoice[] {
  return rows.map(([prompt, correct], index) => ({
    id: `exercise-${number}-${index + 1}`, kind: 'multiple_choice', prompt, correct,
    options: options.map((text) => ({ id: text, text })), explanation: '',
    book: metadata(page, number, index + 1, rows.length, 'Заполните пропуск', 'et', 'gap'),
  }))
}

const translationRows: [string, string, string?][] = [
  ['Добрый вечер!', 'Tere õhtust!'], ['До свидания!', 'Head aega!'], ['Спокойной ночи!', 'Head ööd!'],
  ['Всего доброго!', 'Kõike head!'], ['Здравствуйте!', 'Tere!'], ['Доброе утро!', 'Tere hommikust!'],
  ['Привет!', 'Tervist!'], ['Добрый день!', 'Tere päevast!'], ['До встречи!', 'Kohtumiseni!', 'Nägemiseni!'],
  ['Пока!', 'Nägemist!'], ['Хорошего дня!', 'Head päeva!'], ['Хорошего вечера!', 'Head õhtut!'],
]
const neutralDistractors = keyPhrases.filter(({ et }) =>
  !['Tere!', 'Tervist!', 'Head aega!', 'Nägemist!', 'Nägemiseni!'].includes(et)).map(({ et }) => et)

export const phraseTranslation: BookChoice[] = translationRows.map(([prompt, correct, alternate], index) => {
  const accepted = alternate ? [correct, alternate] : [correct]
  const distractors = neutralDistractors.filter((text) => !accepted.includes(text))
  const choices = [...accepted, ...distractors.slice(0, 4 - accepted.length)]
  const offset = index % choices.length
  return { id: `exercise-5-${index + 1}`, kind: 'multiple_choice', prompt, correct, accepted,
    options: [...choices.slice(offset), ...choices.slice(0, offset)].map((text) => ({ id: text, text })), explanation: '',
    instruction: 'Выберите перевод',
    showCorrectAnswer: false,
    book: metadata(14, 5, index + 1, translationRows.length, 'Переведите', 'ru', 'translate') }
})

const matching = (number: 6 | 7): BookChoice[] => pairRows.map(([prompt, correct], index) => ({
  id: `exercise-${number}-${index + 1}`, kind: 'multiple_choice', prompt, correct, explanation: '',
  options: pairOptions.map((text) => ({ id: text, text })),
  book: metadata(14, number, index + 1, pairRows.length, number === 7 ? 'Соедините' : 'Выберите полную форму', 'et', 'match'),
}))

const legacyMatchingSeven = matching(7)
export const legacyPronounExercises = [...matching(6), ...legacyMatchingSeven]

export const pronounMatching = {
  id: 'exercise-7-matching', kind: 'matching_pairs', prompt: 'Сопоставьте пары', explanation: '',
  instruction: 'Сопоставьте короткую и полную формы',
  columnLabels: { left: 'Короткие формы', right: 'Полные формы' },
  book: metadata(14, 7, 1, 1, 'Соедините', 'et', 'match'),
  pairs: legacyMatchingSeven.map(({ id, prompt, correct }) => ({ id, left: prompt, right: correct })),
} satisfies Exercise

export const pronounPractice = [pronounMatching, ...pronounBookExercises]
export const olemaPractice = [
  ...gap(15, 11, [
    ['Ma … õpetaja.', 'olen'], ['Sa … õpetaja.', 'oled'], ['Ta … õpetaja.', 'on'],
    ['Me … õpetajad (учителя).', 'oleme'], ['Te … õpetajad (учителя).', 'olete'], ['Nad … õpetajad (учителя).', 'on'],
  ], olema.filter((word) => word !== 'ole')),
  ...gap(15, 12, [
    ['… oleme sekretärid (секретари).', 'me'], ['… olen inimene.', 'ma'], ['… on inimesed (люди).', 'nad'],
    ['… oled õpilane.', 'sa'], ['… on sekretär.', 'ta'], ['… olete õpilased (ученики).', 'te'],
  ], short),
]

export const negativePractice = [
  ...gap(16, 13, [
    ['Te ei … õpetaja.', 'ole'], ['Sa ei … mees.', 'ole'], ['Me ei … sekretärid.', 'ole'],
    ['Nad ei … õpilased (ученики).', 'ole'], ['Ma ei … Anneli.', 'ole'], ['Ta ei … Rein.', 'ole'],
  ], olema),
  ...gap(16, 14, [
    ['Mina … õpilane.', 'olen'], ['Nad … õpilased.', 'on'], ['Me ei … õpetajad (учителя).', 'ole'],
    ['Ta … õpilane.', 'on'], ['Teie ei … mehed (мужчины).', 'ole'], ['Me … õpilased (ученики).', 'oleme'],
    ['Sa … õpilane.', 'oled'], ['Teie ei … õpetajad (учителя).', 'ole'], ['Teie … õpilased.', 'olete'],
    ['Kes nad …?', 'on'], ['Sina ei … õpetaja.', 'ole'], ['Nemad … õpilased (ученики).', 'on'],
    ['Tema ei … Mart.', 'ole'], ['Kes te …?', 'olete'], ['Kas sa …?', 'oled'],
  ], olema),
]

const sentenceRows: [string, string][] = [
  ['Она ученица.', 'Ta on õpilane.'], ['Кто вы?', 'Kes te olete?'], ['Он не Индрек.', 'Ta ei ole Indrek.'],
  ['Он ученик.', 'Ta on õpilane.'], ['Я не секретарь.', 'Ma ei ole sekretär.'], ['Кто ты?', 'Kes sa oled?'],
  ['Я человек.', 'Ma olen inimene.'], ['Я не Катрин.', 'Ma ei ole Katrin.'],
  ['Она женщина.', 'Ta on naine.'], ['Ты не мужчина!', 'Sa ei ole mees!'],
]
export const sentenceTranslation: BookOrder[] = sentenceRows.map(([prompt, correct], index) => {
  const options = correct.split(' ').map((text, position) => ({ id: String(position), text }))
  return { id: `exercise-16-${index + 1}`, kind: 'word_order', prompt, explanation: correct, exampleAudio: correct,
    options, order: options.map(({ id }) => id),
    book: metadata(16, 16, index + 1, sentenceRows.length, 'Переведите', 'ru', 'order') }
})
