import { defineLesson } from './lessonModel.ts'
import type { TheoryPanel, TheoryText } from './readerContent.ts'
import type { WordIntro } from './engine.ts'
import {
  affirmativeTranslations, andmaForms, aruTranslation, checkpointDialogues, checkpointGaps, infinitivePairs,
  mixedGaps, mixedTegema, mixedTranslations, nagemaForms, negativeTegema, negativeTranslations,
  oskamaForms, people, personalGaps, phraseChoices, tegemaForms, translationsOfPairs, verbTranslations,
} from './tereLessonTwoPractice.ts'

const bookId = 'tere-a1'
const phrases = [
  ['Aitäh!', 'Спасибо.'], ['Tänan!', 'Благодарю.'], ['Suur tänu!', 'Большое спасибо.'], ['Suur aitäh!', 'Большое спасибо.'],
  ['Palun!', 'Пожалуйста.'], ['Pole tänu väärt.', 'Не стоит благодарности. Не за что!'],
  ['Vabanda! / Vabandage!', 'Извини! / Извините!'], ['Vabandust!', 'Прости! / Простите!'],
  ['Anna / Andke andeks!', 'Прости! / Простите!'], ['Pole midagi.', 'Ничего.'],
  ['Võta / võtke heaks!', 'На здоровье! (ед. ч.) / На здоровье! (мн. ч.)'],
  ['Head isu!', 'Приятного аппетита!'], ['Tervist!', 'Будь / Будьте здоровы!'], ['Tore!', 'Здорово!'],
]

export const lessonTwoVocabulary = [
  ['suur', 'большой', 'suur, -e, -t', 'c65c1483-31cf-4fc0-849e-89ca39d8b251'],
  ['andma', 'давать', 'and/ma, -a, annan', '3f88560e-f7f1-4424-ab32-3127aa93b9c5'],
  ['võtma', 'брать', 'võt/ma, -ta, -an', '72badb21-429d-4525-9e00-b11dbcca6001'],
  ['tore', 'здорово', 'tore, -da, -dat', '1e17ae4a-6c3c-4da8-b9ac-9ec856047e71'],
  ['tänu', 'благодарность', 'tänu, -, -', '19c4f744-c73c-404a-9af3-a339fbcb7676'],
  ['midagi', 'что-нибудь', 'midagi', 'bc9771f9-6e64-45de-94fe-13e3d5c8dded'],
  ['isu', 'аппетит', 'isu, -, -', 'f30100da-393f-4c5d-adea-54b029e85d70'],
]
const words: WordIntro[] = lessonTwoVocabulary.map(([et, ru, forms, catalogId], index) => ({
  id: `l2-word-${et.normalize('NFD').replace(/\p{Diacritic}/gu, '')}`, kind: 'word_intro', prompt: et,
  explanation: ru, word: { et, ru, forms, catalogId }, source: { page: 17, item: index + 1 },
}))

const text = (value: string): TheoryPanel => ({ kind: 'paragraph', text: value })
const note = (value: string): TheoryPanel => ({ kind: 'note', text: value })
const group = (...panels: TheoryPanel[]): TheoryPanel => ({ kind: 'content-group', tone: 'theory', edgeToEdge: true, panels })
const table = (rows: TheoryText[][], headers?: string[], estonianColumns?: number[]): TheoryPanel =>
  ({ kind: 'table', rows, headers, estonianColumns })
const highlight = (before: string, form: string, after = ''): TheoryText =>
  [{ text: before }, { text: form, emphasis: 'form' }, { text: after }]
const heading = (title: string, subtitle: string): TheoryPanel => ({ kind: 'heading', title, subtitle })
const present = ['räägin', 'räägid', 'räägib', 'räägime', 'räägite', 'räägivad']
const endings = ['-N', '-D', '-B', '-ME', '-TE', '-VAD']

const infinitives = [
  heading('MA- ja DA-INFINITIIV (rääkima – rääkida, oskama – osata, tegema – teha)', 'MA- и DA-инфинитив (говорить, уметь, делать)'),
  group(
    text('Инфинитив отвечает на вопрос: что делать? или что сделать? Например: говорить, уметь, делать и т.п.'),
    text('Каждый глагол в эстонском языке имеет две начальные формы: так называемый MA-инфинитив и DA-инфинитив.'),
    text('MA-инфинитив всегда заканчивается на -MA: rääkima (говорить), oskama (уметь), tegema (делать).'),
    table([['-MA', highlight('rääki', 'ma')], ['-MA', highlight('oska', 'ma')], ['-MA', highlight('tege', 'ma')]], undefined, [1]),
    text('DA-инфинитив может заканчиваться на: -DA, -TA, -A. Например, rääkida (говорить), osata (уметь), teha (делать).'),
    table([['-DA', highlight('rääki', 'da')], ['-TA', highlight('osa', 'ta')], ['-A', highlight('teh', 'a')]], undefined, [1]),
    note('При этом эти два инфинитива переводятся всегда только одним словом! Например, rääkima – rääkida (говорить), oskama – osata (уметь), tegema – teha (делать).'),
    table([['говорить', 'rääkima – rääkida'], ['уметь', 'oskama – osata'], ['делать', 'tegema – teha']], undefined, [1]),
    text('В словаре глаголы всегда даются в MA-инфинитиве.'),
    table([['rääki', 'ma'], ['rääki', 'da'], ['räägi', 'n']], ['основа', 'окончание'], [0, 1]),
    note('В эстонском языке очень важны 3 основные формы глагола:'),
    text('MA-инфинитив (rääkima – говорить)'),
    text('DA-инфинитив (rääkida – говорить)'),
    text('«Я» форма (ma räägin – я говорю).'),
    text('Из этих трех форм впоследствии придется образовывать другие грамматические категории. Например, прошедшее время, повелительное наклонение и т.п. Поэтому в учебнике мы будем всегда давать 3 формы глагола, а вам придется их выучить!'),
    table([[highlight('rääki', 'ma'), highlight('rääki', 'da'), highlight('räägi', 'n')]], ['MA-форма', 'DA-форма', '«Я» форма'], [0, 1, 2]),
  ),
  table([
    ['oska/ma, osata, -n', 'уметь, уметь, умею / знать, знать, знаю'], ['tegema, teha, teen', 'делать, делать, делаю'],
    ['nägema, näha, näen', 'видеть, видеть, вижу'], ['rääki/ma, -da, räägin', 'говорить, говорить, говорю'],
  ], undefined, [0]),
]

const threeForms = table([['говорить', 'говорить', 'говорю'], ['rääkima', 'rääkida', highlight('räägi', 'n')]], ['-ma', '-da', '«Я»'], [0, 1, 2])
const affirmative = [
  heading('MA RÄÄGIN, SA RÄÄGID, TA RÄÄGIB…', 'Я говорю, ты говоришь, он говорит…'),
  group(
    text('Как сказать Я говорю, ты говоришь, он говорит…? В эстонском языке, как и в русском, меняется окончание.'),
    threeForms,
    table(people.map((person, index) => [
      `${person} räägi + ${endings[index]}`,
      highlight(`${person} räägi`, present[index].slice('räägi'.length), '.'),
      ['Я говорю.', 'Ты говоришь.', 'Он, она говорит.', 'Мы говорим.', 'Вы говорите.', 'Они говорят.'][index],
    ]), undefined, [0, 1]),
    text('Некоторые глаголы в эстонском языке состоят из двух частей. Например, понимать:'),
    text('MA-инфинитив – aru saama'),
    text('DA-инфинитив – aru saada'),
    text('«Я» форма – saan aru'),
    text('Иногда между двумя частями такого глагола может стоять другое слово. Например, Ma saan hästi aru. Я хорошо понимаю.'),
    table([['aru saama – aru saada – saan aru', 'понимать – понимать – понимаю']], undefined, [0]),
    table(people.map((person, index) => [
      highlight(`${person} saa`, ['n', 'd', 'b', 'me', 'te', 'vad'][index], ' aru.'),
      ['Я понимаю.', 'Ты понимаешь.', 'Он, она понимает.', 'Мы понимаем.', 'Вы понимаете.', 'Они понимают.'][index],
    ]), undefined, [0]),
  ),
  table([['aru saama, aru saada, saan aru', 'понимать'], ['hästi', 'хорошо']], undefined, [0]),
]
const negative = [
  heading('MA EI RÄÄGI, SA EI RÄÄGI, TA EI RÄÄGI…', 'Я не говорю, ты не говоришь, он не говорит…'),
  group(
    text('Выразить отрицание в эстонском языке очень просто.'),
    text('Добавьте отрицательную частицу EI (НЕ) к «Я» форме и откиньте окончание!'),
    threeForms,
    table(people.map((person, index) => [
      highlight(`${person} `, 'ei räägi', '.'),
      ['Я не говорю.', 'Ты не говоришь.', 'Он (она) не говорит.', 'Мы не говорим.', 'Вы не говорите.', 'Они не говорят.'][index],
    ]), undefined, [0]),
    note('говорю · RÄÄGIN → EI + RÄÄGI = EI RÄÄGI · не говорю'),
  ),
]

export const secondLesson = defineLesson({
  id: 'tere-a1-02', number: 2, bookId, repeatErrors: true,
  deferredSources: [
    { page: 17, medium: 'audio', resource: 8 }, { page: 17, exercise: '1', medium: 'audio', resource: 9 },
    { page: 17, exercise: '2', medium: 'unverified-answers' }, { page: 18, exercise: '3', medium: 'audio', resource: 10 },
    { page: 18, exercise: '4.2', medium: 'audio', resource: 63 }, { page: 18, medium: 'video', resource: 4 },
    { page: 20, exercise: '7.2', medium: 'audio', resource: 64 }, { page: 20, medium: 'video', resource: 5 },
    { page: 22, exercise: '14.2', medium: 'audio', resource: 65 }, { page: 22, medium: 'video', resource: 6 },
    { page: 23, exercise: '19.2', medium: 'audio', resource: 66 }, { page: 24, exercise: '20', medium: 'audio', resource: 11 },
    { page: 24, exercise: '21', medium: 'external-qr' },
  ],
  parts: [
    { partId: 'courtesy-phrases', page: '17', kind: 'theory', templateType: 'phrases', title: 'Palun ja aitäh!',
      presentation: { introLabel: 'Пожалуйста и спасибо!' }, panels: [{ kind: 'phrases', silent: true, items: phrases.map(([et, ru]) => ({ et, ru })) }] },
    { partId: 'courtesy-vocabulary', page: '17', kind: 'practice', templateType: 'word_intro', title: 'Новая лексика', exercises: words },
    { partId: 'ex04-1-translate-phrases', page: '18', kind: 'practice', templateType: 'multiple_choice', title: 'Переведите', exercises: phraseChoices },
    { partId: 'ma-da-infinitives', page: '18–19', kind: 'theory', templateType: 'theory', title: 'MA- и DA-инфинитив', panels: infinitives },
    { partId: 'ex05-translate-infinitives', page: '19', kind: 'practice', templateType: 'multiple_choice', title: 'Переведите глаголы', exercises: verbTranslations },
    { partId: 'ex06-match-infinitives', page: '20', kind: 'practice', templateType: 'matching_pairs', title: 'Соедините', exercises: [infinitivePairs] },
    { partId: 'ex07-1-select-infinitive-pairs', page: '20', kind: 'practice', templateType: 'multiple_choice', title: 'Переведите', exercises: translationsOfPairs },
    { partId: 'present-affirmative', page: '20–21', kind: 'theory', templateType: 'theory', title: 'Спряжение глаголов', panels: affirmative },
    { partId: 'ex08-tegema', page: '21', kind: 'practice', templateType: 'fill_blank', title: 'Tegema', exercises: tegemaForms, examples: ['Ma teen.'] },
    { partId: 'ex09-oskama', page: '21', kind: 'practice', templateType: 'fill_blank', title: 'Oskama', exercises: oskamaForms, examples: ['Te oskate.'] },
    { partId: 'ex10-nagema', page: '21', kind: 'practice', templateType: 'fill_blank', title: 'Nägema', exercises: nagemaForms, examples: ['Ma näen.'] },
    { partId: 'ex11-andma', page: '21', kind: 'practice', templateType: 'fill_blank', title: 'Andma', exercises: andmaForms, examples: ['Ta annab.'] },
    { partId: 'ex12-aru-saama', page: '21', kind: 'practice', templateType: 'word_order', title: 'Arusaamine', exercises: aruTranslation, examples: ['Я понимаю. — Ma saan aru.'] },
    { partId: 'ex13-choose-personal-form', page: '22', kind: 'practice', templateType: 'fill_blank', title: 'Формы глаголов', exercises: personalGaps, examples: ['andma – anda – annan – sa annad.'] },
    { partId: 'ex14-1-translate-affirmative', page: '22', kind: 'practice', templateType: 'word_order', title: 'Переведите', exercises: affirmativeTranslations },
    { partId: 'present-negative', page: '22', kind: 'theory', templateType: 'theory', title: 'Отрицание с ei', panels: negative },
    { partId: 'ex15-negative-tegema', page: '23', kind: 'practice', templateType: 'fill_blank', title: 'Tegema', exercises: negativeTegema, examples: ['Ma ei tee.'] },
    { partId: 'ex16-translate-negative', page: '23', kind: 'practice', templateType: 'fill_blank', title: 'Отрицание', exercises: negativeTranslations, examples: ['Мы не даем. — Me ei anna.', 'Вы не понимаете. — Te ei saa aru.'] },
    { partId: 'ex17-tegema-mixed', page: '23', kind: 'practice', templateType: 'fill_blank', title: 'Tegema', exercises: mixedTegema, examples: ['Mina teen.'] },
    { partId: 'ex18-mixed-gaps', page: '23', kind: 'practice', templateType: 'fill_blank', title: 'Формы глаголов', exercises: mixedGaps, examples: ['Kes saab aru (aru saama – aru saada – saan aru)?'] },
    { partId: 'ex19-1-translate-mixed', page: '23', kind: 'practice', templateType: 'word_order', title: 'Переведите', exercises: mixedTranslations },
  ],
  references: [
    { id: 'tere-a1-02-present-spikker', title: 'SPIKKER — ШПАРГАЛКА',
      exerciseIds: [...tegemaForms, ...oskamaForms, ...nagemaForms, ...andmaForms, ...aruTranslation, ...personalGaps].map(({ id }) => id),
      panels: [table(people.map((person, index) => [person, endings[index]]), undefined, [0, 1])] },
    { id: 'tere-a1-02-negative-spikker', title: 'SPIKKER — ШПАРГАЛКА',
      exerciseIds: [...negativeTegema, ...negativeTranslations, ...mixedTegema, ...mixedGaps].map(({ id }) => id),
      panels: [table(people.map((person) => [person, 'EI räägi Ø']), undefined, [0, 1])] },
  ],
})

export const reviewCheckpoint = defineLesson({
  id: 'tere-a1-review-01-02', number: 2, bookId, checkpointTitle: 'Закрепление 1–2',
  checkpointSubtitle: 'Повтори материал первых двух уроков', repeatErrors: true,
  parts: [
    { partId: 'review-ex01-olema', page: '24', title: 'Seda te juba oskate', kind: 'practice', templateType: 'fill_blank',
      examples: ['Kes sa oled?'], exercises: checkpointGaps },
    { partId: 'review-ex02-dialogues', page: '24', title: 'Tõlkige! Переведите.', kind: 'practice', templateType: 'word_order',
      exercises: checkpointDialogues },
  ],
})
