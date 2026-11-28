import type { FillBlank, MultipleChoice, WordOrderExercise } from './engine.ts'

const options = (texts: readonly string[]) => [...new Set(texts)].map((text) => ({ id: text, text }))
const question = (page: number, exercise: number, item: number, prompt: string, explanation: string, subsection?: number) => ({
  id: `l2-ex${exercise}${subsection ? `-${subsection}` : ''}-q${item}`,
  source: { page, exercise, subsection, item, key: 215 }, prompt, explanation,
})

function choices(page: number, number: number, rows: [string, string[]][], promptLanguage: 'ru' | 'et', subsection?: number): MultipleChoice[] {
  const bank = rows.flatMap(([, answers]) => answers)
  return rows.map(([prompt, answers], index) => ({
    ...question(page, number, index + 1, prompt, answers.join(' / '), subsection),
    kind: 'multiple_choice', promptLanguage, optionLanguage: promptLanguage === 'ru' ? 'et' : 'ru',
    instruction: 'Выберите перевод', presentation: { kind: 'speech', silent: true },
    correct: answers[0], accepted: answers, options: options(bank),
  }))
}

export const phraseChoices = choices(18, 4, [
  ['Извините!', ['Vabandage!']], ['Ничего.', ['Pole midagi.']], ['Пожалуйста.', ['Palun.']],
  ['Не стоит благодарности.', ['Pole tänu väärt.']], ['Большое спасибо.', ['Suur tänu!', 'Aitäh!', 'Suur aitäh!']],
  ['Благодарю.', ['Tänan!']], ['Простите.', ['Vabandust!', 'Vabandage!']],
  // Page 215 interchanges items 8 and 9. Use the approved correspondences on page 17.
  ['На здоровье!', ['Võta heaks!', 'Võtke heaks!']], ['Будьте здоровы!', ['Tervist!']],
  ['Приятного аппетита!', ['Head isu!']],
], 'ru', 1)

export const verbTranslations = choices(19, 5, [
  ['oskama', ['уметь']], ['olla', ['быть']], ['osata', ['уметь']], ['võtta', ['брать']],
  ['tegema', ['делать']], ['näha', ['видеть']], ['nägema', ['видеть']], ['olema', ['быть']],
  ['andma', ['дать']], ['anda', ['дать']], ['teha', ['делать']], ['võtma', ['брать']],
], 'et')

export const translationsOfPairs = choices(20, 7, [
  ['быть', ['olema – olla']], ['делать', ['tegema – teha']], ['видеть', ['nägema – näha']],
  ['говорить', ['rääkima – rääkida']], ['уметь', ['oskama – osata']], ['брать', ['võtma – võtta']],
  ['давать', ['andma – anda']],
], 'ru', 1)

export const infinitivePairs = {
  ...question(20, 6, 1, 'Ühendage! Соедините.', 'Соедините MA- и DA-инфинитивы.'),
  kind: 'matching_pairs' as const,
  pairs: [
    ['tegema', 'teha'], ['osata', 'oskama'], ['nägema', 'näha'], ['olema', 'olla'],
    ['anda', 'andma'], ['rääkima', 'rääkida'], ['võtma', 'võtta'],
  ].map(([left, right], index) => ({ id: `pair-${index + 1}`, left, right })),
}

export const people = ['Ma', 'Sa', 'Ta', 'Me', 'Te', 'Nad']
const verb = {
  tegema: ['teen', 'teed', 'teeb', 'teeme', 'teete', 'teevad', 'tee'],
  oskama: ['oskan', 'oskad', 'oskab', 'oskame', 'oskate', 'oskavad', 'oska'],
  nägema: ['näen', 'näed', 'näeb', 'näeme', 'näete', 'näevad', 'näe'],
  andma: ['annan', 'annad', 'annab', 'anname', 'annate', 'annavad', 'anna'],
  rääkima: ['räägin', 'räägid', 'räägib', 'räägime', 'räägite', 'räägivad', 'räägi'],
  olema: ['olen', 'oled', 'on', 'oleme', 'olete', 'on', 'ole'],
  'aru saama': ['saan aru', 'saad aru', 'saab aru', 'saame aru', 'saate aru', 'saavad aru', 'saa aru'],
}

function gap(page: number, number: number, item: number, prompt: string, correct: string, bank: readonly string[], context?: string, subsection?: number): FillBlank {
  const [before, after = ''] = prompt.split('…')
  return {
    ...question(page, number, item, prompt, correct, subsection),
    kind: 'fill_blank', correct, sentence: { before, after }, options: options(bank), context,
  }
}

function forms(number: number, name: keyof typeof verb, order: number[], context: string) {
  return order.slice(1).map((person, index) => gap(21, number, index + 2, `${people[person]} ….`, verb[name][person], verb[name], context))
}

export const tegemaForms = forms(8, 'tegema', [0, 1, 2, 3, 4, 5], 'делать – делать – делаю · tegema – teha – teen')
export const oskamaForms = forms(9, 'oskama', [4, 5, 0, 1, 2, 3], 'уметь – уметь – умею · oskama – osata – oskan')
export const nagemaForms = forms(10, 'nägema', [0, 1, 2, 3, 4, 5], 'видеть – видеть – вижу · nägema – näha – näen')
export const andmaForms = forms(11, 'andma', [2, 1, 0, 3, 4, 5], 'давать – давать – даю · andma – anda – annan')

export function sentenceOrder(id: string, prompt: string, answers: string[], source: WordOrderExercise['source'], context?: string): WordOrderExercise {
  const bank: WordOrderExercise['options'] = []
  const orders = answers.map((answer) => {
    const used = new Set<string>()
    return answer.split(' ').map((text) => {
      const token = bank.find((entry) => entry.text === text && !used.has(entry.id)) ?? { id: `token-${bank.length + 1}`, text }
      if (!bank.includes(token)) bank.push(token)
      used.add(token.id)
      return token.id
    })
  })
  return { id, source, prompt, explanation: answers.join(' / '), context, silent: true,
    kind: 'word_order', options: bank, order: orders[0], alternativeOrders: orders.slice(1) }
}

function translation(page: number, number: number, rows: [string, string][], subsection?: number, start = 1, context?: string) {
  return rows.map(([ru, et], index) => {
    const { id, source } = question(page, number, index + start, ru, et, subsection)
    return sentenceOrder(id, ru, [et], source, context)
  })
}

export const aruTranslation = translation(21, 12, [
  ['Они понимают.', 'Nad saavad aru.'], ['Ты понимаешь.', 'Sa saad aru.'], ['Мы понимаем.', 'Me saame aru.'],
  ['Он, она понимает.', 'Ta saab aru.'], ['Вы понимаете.', 'Te saate aru.'],
], undefined, 2, 'понимать – понимать – понимаю · aru saama – aru saada – saan aru')

const personalForms: [keyof typeof verb, string, string, string][] = [
  ['oskama', 'oskama – osata – oskan', 'nad', 'oskavad'],
  ['rääkima', 'rääkima – rääkida – räägin', 'te', 'räägite'],
  ['tegema', 'tegema – teha – teen', 'me', 'teeme'],
  ['olema', 'olema – olla – olen', 'sa', 'oled'],
  ['nägema', 'nägema – näha – näen', 'tema', 'näeb'],
  ['aru saama', 'aru saama – aru saada – saan aru', 'mina', 'saan aru'],
]
export const personalGaps = personalForms.map(([name, cue, subject, answer], index) =>
  gap(22, 13, index + 2, `${subject} ….`, answer, verb[name], cue))

export const affirmativeTranslations = translation(22, 14, [
  ['Ты делаешь.', 'Sa teed.'], ['Он умеет.', 'Ta oskab.'], ['Вы понимаете.', 'Te saate aru.'],
  ['Я даю.', 'Ma annan.'], ['Они говорят.', 'Nad räägivad.'], ['Он ученик.', 'Ta on õpilane.'],
], 1)

export const negativeTegema = people.slice(1).map((subject, index) =>
  gap(23, 15, index + 2, `${subject} ….`, 'ei tee', ['ei tee', ...verb.tegema.slice(0, 6)], 'делать – делать – делаю · tegema – teha – teen'))

const negativePrompts: [string, string][][] = [
  [['Они не дают.', 'Nad'], ['Ты не даешь.', 'Sa'], ['Он, она не дает.', 'Ta'], ['Вы не даете.', 'Te'], ['Я не даю.', 'Ma']],
  [['Они не понимают.', 'Nad'], ['Мы не понимаем.', 'Me'], ['Я не понимаю.', 'Ma'], ['Он, она не понимает.', 'Ta'], ['Ты не понимаешь.', 'Sa']],
]
export const negativeTranslations = negativePrompts.flatMap((rows, group) => {
  const name = group === 0 ? 'andma' : 'aru saama'
  const answer = `ei ${verb[name][6]}`
  const cue = group === 0 ? 'давать – давать – даю · andma – anda – annan' :
    'понимать – понимать – понимаю · aru saama – aru saada – saan aru'
  return rows.map(([ru, subject], index) => gap(23, 16, index + 2, `${subject} ….`, answer, [answer, ...verb[name].slice(0, 6)], `${cue} · ${ru}`, group + 1))
})

export const mixedTegema = [
  ['Meie', 'teeme'], ['Tema ei', 'tee'], ['Nad', 'teevad'], ['Sa ei', 'tee'],
  ['Teie', 'teete'], ['Tema', 'teeb'], ['Sina', 'teed'],
].map(([subject, answer], index) => gap(23, 17, index + 2, `${subject} ….`, answer, verb.tegema))

const mixedRows: [string, keyof typeof verb, string, string][] = [
  ['Me ei ….', 'rääkima', 'räägi', 'rääkima – rääkida – räägin'],
  ['Nad ei ….', 'nägema', 'näe', 'nägema – näha – näen'],
  ['Kes te …?', 'olema', 'olete', 'olema – olla – olen'],
  ['Ma ei ….', 'oskama', 'oska', 'oskama – osata – oskan'],
  ['Sa ei ….', 'tegema', 'tee', 'tegema – teha – teen'],
  ['Ljuda ja Vasja ….', 'rääkima', 'räägivad', 'rääkima'],
  ['Kes ei …?', 'andma', 'anna', 'andma – anda – annan'],
]
export const mixedGaps = mixedRows.map(([prompt, name, answer, cue], index) =>
  gap(23, 18, index + 2, prompt, answer, verb[name], cue))

export const mixedTranslations = translation(23, 19, [
  ['Они не понимают.', 'Nad ei saa aru.'], ['Мы говорим.', 'Me räägime.'], ['Кто он?', 'Kes ta on?'],
  ['Вы не делаете.', 'Te ei tee.'], ['Кто не дает?', 'Kes ei anna?'], ['Я вижу.', 'Ma näen.'],
  ['Ты умеешь.', 'Sa oskad.'], ['Она говорит.', 'Ta räägib.'], ['Они делают.', 'Nad teevad.'],
  ['Вы даете.', 'Te annate.'],
], 1)

export const checkpointGaps = [
  ['Mina … naine.', 'olen'], ['Ta ei … Mart.', 'ole'], ['Kes nad …?', 'on'], ['Me … inimesed.', 'oleme'],
  ['Kes ta …?', 'on'], ['Mina ei … sekretär.', 'ole'], ['Ta … õpetaja.', 'on'],
  ['Ma … õpilane.', 'olen'], ['Me … mehed.', 'oleme'],
].map(([prompt, answer], index) => ({
  ...gap(24, 1, index + 2, prompt, answer, verb.olema), id: `review-01-02-ex1-q${index + 2}`,
}))

const dialogues: [string, string[]][][] = [
  [['Добрый вечер!', ['Tere õhtust!']], ['Здравствуйте!', ['Tere!']]],
  [['До свидания!', ['Head aega!']], ['Всего доброго!', ['Kõike head!']]],
  [['Пока!', ['Nägemist!']], ['Спокойной ночи!', ['Head ööd!']]],
  [['Доброе утро!', ['Tere hommikust!']], ['Привет!', ['Tervist!']]],
  [['До встречи!', ['Kohtumiseni!', 'Nägemiseni!']], ['Хорошего дня!', ['Head päeva!']]],
]
export const checkpointDialogues = dialogues.flatMap((lines, index) => lines.map(([ru, answers], line) =>
  sentenceOrder(`review-01-02-ex2-q${index + 1}-${line ? 'b' : 'a'}`, ru, answers,
    { page: 24, exercise: 2, item: index + 1, key: 215 }, `Диалог ${index + 1} · ${line ? 'B' : 'A'}`)))
