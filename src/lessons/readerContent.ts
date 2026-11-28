import { exercises, lessonId } from './course.ts'
import { defineLesson } from './lessonModel.ts'
import { restoreFirstLessonProgress } from './tereLessonCompatibility.ts'
import { bookId, legacyPronounExercises, phraseTranslation, pronounPractice, olemaPractice, negativePractice, sentenceTranslation } from './tereLessonContent.ts'
import { hasScore } from './engine.ts'
import { keyPhrases, legacyGreetingIds, newWordExercises } from './greetingsContent.ts'
import type { Exercise, Scores } from './engine.ts'

export type BilingualExample = { before: string; accent: string; after: string; ru: string }

export type DialogueLine = BilingualExample & { side: 'left' | 'right'; audioSrc?: string }

export type TheoryText = string | { text: string; emphasis?: 'form' | 'strong'; lang?: string }[]

export type TheoryPanel =
  | { kind: 'content-group'; panels: TheoryPanel[]; tone?: 'theory'; padding?: 'none' | 'compact' | 'default'; edgeToEdge?: boolean }
  | { kind: 'heading'; label?: string; title: string; subtitle?: string }
  | { kind: 'paragraph'; text: TheoryText }
  | { kind: 'note'; text: TheoryText }
  | { kind: 'phrases'; items: { et: string; ru: string; icon?: string }[] }
  | { kind: 'table'; title?: string; headers?: string[]; rows: TheoryText[][]; accent?: number; estonianColumns?: number[]; roomy?: boolean; scrollable?: boolean }
  | { kind: 'example'; item: BilingualExample }
  | { kind: 'example-group'; items: BilingualExample[]; tableHeaders?: [string, string] }
  | { kind: 'dialogue-group'; dialogues: DialogueLine[][] }
function practice(...ids: string[]) {
  return ids.map((id) => exercises.find((exercise) => exercise.id === id)!)
}

const pronounRows: [string, string, string][] = [
  ['Mina', 'Ma', 'Я'], ['Sina', 'Sa', 'Ты'], ['Tema', 'Ta', 'Он / она'],
  ['Meie', 'Me', 'Мы'], ['Teie', 'Te', 'Вы'], ['Nemad', 'Nad', 'Они'],
]

const olemaForms = [
  { subject: 'Ma', verb: 'olen', russian: 'Я', role: 'mees', russianRole: 'мужчина' },
  { subject: 'Sa', verb: 'oled', russian: 'Ты', role: 'mees', russianRole: 'мужчина' },
  { subject: 'Ta', verb: 'on', russian: 'Он', role: 'mees', russianRole: 'мужчина' },
  { subject: 'Me', verb: 'oleme', russian: 'Мы', role: 'mehed', russianRole: 'мужчины' },
  { subject: 'Te', verb: 'olete', russian: 'Вы', role: 'mehed', russianRole: 'мужчины' },
  { subject: 'Nad', verb: 'on', russian: 'Они', role: 'mehed', russianRole: 'мужчины' },
]

const parts = [
  { partId: 'greetings-theory', kind: 'theory', templateType: 'phrases', title: 'Знакомство с фразами', page: '13',
    presentation: { introLabel: 'Начнём!' }, panels: [{ kind: 'phrases', items: keyPhrases }] },
  { partId: 'greetings-practice', kind: 'practice', templateType: 'word_intro', title: 'Изучение новых слов', page: '13', exercises: newWordExercises, legacyExercises: practice(...legacyGreetingIds) },
  { partId: 'phrase-translation', kind: 'practice', templateType: 'multiple_choice', title: 'Перевод фраз', page: '14', exercises: phraseTranslation },
  { partId: 'pronouns-theory', kind: 'theory', templateType: 'theory', title: 'MA, SA, TA, ME, TE, NAD — Я, ты, он, она, мы, вы, они', page: '14', presentation: { tone: 'theory' }, panels: [
    { kind: 'heading', label: 'Местоимения', title: 'MA, SA, TA, ME, TE, NAD', subtitle: 'Я, ты, он, она, мы, вы, они' },
    { kind: 'content-group', tone: 'theory', edgeToEdge: true, panels: [
      { kind: 'paragraph', text: 'Личные местоимения в эстонском языке имеют две формы: длинную и короткую.' },
      { kind: 'table', headers: ['Местоимение', 'Перевод'], estonianColumns: [0],
        rows: pronounRows.map(([long, short, translation]) =>
          [[{ text: long, emphasis: 'form' }, { text: ' / ' }, { text: short, emphasis: 'form' }], translation]) },
      { kind: 'note', text: [
        { text: 'Местоимения ОН и ОНА переводятся на эстонский язык одним словом ' },
        { text: 'tema', emphasis: 'strong', lang: 'et' }, { text: ' (ta)', lang: 'et' }, { text: '.' },
      ] },
    ] },
  ] },
  { partId: 'pronouns-practice', kind: 'practice', templateType: 'matching_pairs', title: 'Практика местоимений', page: '14–15',
    exercises: pronounPractice.slice(0, 1) },
  { partId: 'pronouns-choices', kind: 'practice', templateType: 'multiple_choice', title: 'Практика местоимений', page: '15',
    exercises: pronounPractice.slice(1) },
  { partId: 'olema-theory', kind: 'theory', templateType: 'theory', title: 'MA OLEN NAINE, SA OLED MEES… — Я женщина, ты мужчина…', page: '15', panels: [
    { kind: 'heading', label: 'Глагол olema', title: 'MA OLEN NAINE, SA OLED MEES…', subtitle: 'Я женщина, ты мужчина…' },
    { kind: 'content-group', tone: 'theory', edgeToEdge: true, panels: [
      { kind: 'paragraph', text: 'В русском языке глагол быть в настоящем времени опускается. Русские не говорят: Я есть женщина или Он есть мужчина, а просто: Я женщина, Он мужчина.' },
      { kind: 'paragraph', text: 'В эстонском языке, как и во многих европейских языках, глагол быть (olema) в настоящем времени употребляется. Его надо выучить, как Отче наш!' },
      { kind: 'example-group', tableHeaders: ['Местоимение', 'Перевод'],
        items: olemaForms.map(({ subject, verb, russian, role, russianRole }) => ({
          before: subject + ' ', accent: verb, after: ` ${role}.`, ru: `${russian} (есть) ${russianRole}.`,
        })) },
    ] },
    { kind: 'dialogue-group', dialogues: [
      [
        { side: 'left', before: 'Kes ta ', accent: 'on', after: '?', ru: 'Кто он (она)?' },
        { side: 'right', before: 'Ta ', accent: 'on', after: ' õpetaja.', ru: 'Он (она) учитель.' },
      ],
      [
        { side: 'left', before: 'Kes sa ', accent: 'oled', after: '?', ru: 'Кто ты?' },
        { side: 'right', before: 'Ma ', accent: 'olen', after: ' õpilane.', ru: 'Я ученик.' },
      ],
    ] },
  ] },
  { partId: 'olema-practice', kind: 'practice', templateType: 'fill_blank', title: 'Выбираем форму olema', page: '15',
    exercises: olemaPractice },
  { partId: 'negation-theory', kind: 'theory', templateType: 'theory', title: 'MA EI OLE NAINE, SA EI OLE MEES…', page: '16', panels: [
    { kind: 'heading', label: 'Отрицание', title: 'MA EI OLE NAINE, SA EI OLE MEES…' },
    { kind: 'content-group', tone: 'theory', edgeToEdge: true, panels: [
      { kind: 'paragraph', text: 'Сказать он не мужчина, она не женщина можно двумя способами. Надо всего лишь добавить ei ole или pole.' },
      { kind: 'table', title: 'EI OLE — НЕ (ЕСТЬ) — POLE', headers: ['EI OLE', 'НЕ (ЕСТЬ)', 'POLE'], estonianColumns: [0, 2], scrollable: true,
        rows: [
          [[{ text: 'Ma / Sa / Ta → ' }, { text: 'ei ole', emphasis: 'form' }, { text: ' naine' }],
            'Я / Ты / Он, она → не женщина',
            [{ text: 'Mina / Sina / Tema → ' }, { text: 'pole', emphasis: 'form' }, { text: ' naine' }]],
          [[{ text: 'Me / Te / Nad → ' }, { text: 'ei ole', emphasis: 'form' }, { text: ' naised' }],
            'Мы / Вы / Они → не женщины',
            [{ text: 'Meie / Teie / Nemad → ' }, { text: 'pole', emphasis: 'form' }, { text: ' naised' }]],
        ] },
    ] },
  ] },
  { partId: 'negation-practice', kind: 'practice', templateType: 'fill_blank', title: 'Отрицание и закрепление', page: '16',
    exercises: negativePractice },
  { partId: 'sentence-translation', kind: 'practice', templateType: 'word_order', title: 'Перевод предложений', page: '16', exercises: sentenceTranslation },
] satisfies Parameters<typeof defineLesson>[0]['parts']

export type ReferenceContent = {
  id: string
  title: string
  exerciseIds: string[]
  panels: TheoryPanel[]
}

export const lessonReferences: ReferenceContent[] = [{
  id: 'tere-a1-01-olema-spikker',
  title: 'SPIKKER — ШПАРГАЛКА',
  exerciseIds: olemaPractice.filter(({ book }) => book.number === 11 || book.number === 12).map(({ id }) => id),
  panels: [{ kind: 'content-group', tone: 'theory', padding: 'none', panels: [
    { kind: 'table', roomy: true, estonianColumns: [0],
      rows: olemaForms.map(({ subject, verb, russian }) =>
        [[{ text: subject + ' ' }, { text: verb, emphasis: 'form' }], `${russian} (есть)`]) },
  ] }],
}]

export function referencesForExercise(references: ReferenceContent[], exerciseId: string) {
  return references.filter(({ exerciseIds }) => exerciseIds.includes(exerciseId))
}

export const firstLesson = defineLesson({
  id: lessonId, number: 1, bookId, parts, references: lessonReferences,
  legacyExerciseIds: [...exercises, ...legacyPronounExercises].map(({ id }) => id),
  restoreProgress: restoreFirstLessonProgress,
})

export const publishedLessons = [firstLesson]

export function stageQuestionProgress(questions: Exercise[], attempt: Scores, activeId?: string) {
  const total = questions.length
  if (!total) return undefined
  const completed = questions.filter(({ id }) => hasScore(attempt, id)).length
  const question = activeId === undefined ? total : Math.min(total, completed + Number(!hasScore(attempt, activeId)))
  return { question, completed, total }
}
