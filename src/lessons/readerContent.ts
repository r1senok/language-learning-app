import { exercises } from './course.ts'
import { phraseTranslation, pronounPractice, olemaPractice, negativePractice, sentenceTranslation } from './tereLessonContent.ts'
import { hasScore } from './engine.ts'
import { keyPhrases, legacyGreetingIds, newWordExercises } from './greetingsContent.ts'
import type { Exercise, Scores } from './engine.ts'

export type TheoryPanel =
  | { kind: 'phrases'; items: { et: string; ru: string; icon?: string }[] }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][]; accent: number; estonianColumns?: number[] }
  | { kind: 'examples'; items: { before: string; accent: string; after: string; ru: string }[] }
  | { kind: 'tip'; text: string }
export type ReaderStep = { id: string; title: string; page: string } & (
  { kind: 'theory'; panels: TheoryPanel[] } | { kind: 'practice'; exercises: Exercise[] }
)

function practice(...ids: string[]) {
  return ids.map((id) => exercises.find((exercise) => exercise.id === id)!)
}

export const lessonSteps: ReaderStep[] = [
  { id: 'greetings-theory', kind: 'theory', title: 'Знакомство с фразами', page: '13',
    panels: [{ kind: 'phrases', items: keyPhrases }] },
  { id: 'greetings-practice', kind: 'practice', title: 'Изучение новых слов', page: '13', exercises: newWordExercises },
  { id: 'phrase-translation', kind: 'practice', title: 'Перевод фраз', page: '14', exercises: phraseTranslation },
  { id: 'pronouns-theory', kind: 'theory', title: 'MA, SA, TA, ME, TE, NAD — Я, ты, он, она, мы, вы, они', page: '14', panels: [
    { kind: 'tip', text: 'Личные местоимения в эстонском языке имеют две формы: длинную и короткую.' },
    { kind: 'table', title: 'Полные и краткие формы', headers: ['Полная форма', 'Краткая', 'Перевод'], accent: 1,
      rows: [['Mina', 'Ma', 'Я'], ['Sina', 'Sa', 'Ты'], ['Tema', 'Ta', 'Он / она'], ['Meie', 'Me', 'Мы'], ['Teie', 'Te', 'Вы'], ['Nemad', 'Nad', 'Они']] },
    { kind: 'tip', text: 'Местоимения ОН и ОНА переводятся на эстонский язык одним словом tema (ta).' },
  ] },
  { id: 'pronouns-practice', kind: 'practice', title: 'Практика местоимений', page: '14–15',
    exercises: pronounPractice },
  { id: 'olema-theory', kind: 'theory', title: 'MA OLEN NAINE, SA OLED MEES… — Я женщина, ты мужчина…', page: '15', panels: [
    { kind: 'tip', text: 'В русском языке глагол быть в настоящем времени опускается. Русские не говорят: Я есть женщина или Он есть мужчина, а просто: Я женщина, Он мужчина.' },
    { kind: 'tip', text: 'В эстонском языке, как и во многих европейских языках, глагол быть (olema) в настоящем времени употребляется. Его надо выучить, как Отче наш!' },
    { kind: 'examples', items: [
      { before: 'Ma ', accent: 'olen', after: ' mees.', ru: 'Я (есть) мужчина.' },
      { before: 'Sa ', accent: 'oled', after: ' mees.', ru: 'Ты (есть) мужчина.' },
      { before: 'Ta ', accent: 'on', after: ' mees.', ru: 'Он (есть) мужчина.' },
      { before: 'Me ', accent: 'oleme', after: ' mehed.', ru: 'Мы (есть) мужчины.' },
      { before: 'Te ', accent: 'olete', after: ' mehed.', ru: 'Вы (есть) мужчины.' },
      { before: 'Nad ', accent: 'on', after: ' mehed.', ru: 'Они (есть) мужчины.' },
      { before: 'Kes ta ', accent: 'on', after: '?', ru: 'Кто он (она)?' },
      { before: 'Ta ', accent: 'on', after: ' õpetaja.', ru: 'Он (она) учитель.' },
      { before: 'Kes sa ', accent: 'oled', after: '?', ru: 'Кто ты?' },
      { before: 'Ma ', accent: 'olen', after: ' õpilane.', ru: 'Я ученик.' },
    ] },
    { kind: 'table', title: 'SPIKKER — ШПАРГАЛКА', headers: ['Местоимение', 'Форма', 'Перевод'], accent: 1,
      rows: [['Ma', 'OLEN', 'Я (есть)'], ['Sa', 'OLED', 'Ты (есть)'], ['Ta', 'ON', 'Он, она (есть)'],
        ['Me', 'OLEME', 'Мы (есть)'], ['Te', 'OLETE', 'Вы (есть)'], ['Nad', 'ON', 'Они (есть)']] },
  ] },
  { id: 'olema-practice', kind: 'practice', title: 'Выбираем форму olema', page: '15',
    exercises: olemaPractice },
  { id: 'negation-theory', kind: 'theory', title: 'MA EI OLE NAINE, SA EI OLE MEES…', page: '16', panels: [
    { kind: 'tip', text: 'Сказать он не мужчина, она не женщина можно двумя способами. Надо всего лишь добавить ei ole или pole.' },
    { kind: 'table', title: 'EI OLE — НЕ (ЕСТЬ) — POLE', headers: ['EI OLE', 'НЕ (ЕСТЬ)', 'POLE'], accent: 2, estonianColumns: [0, 2],
      rows: [
        ['Ma / Sa / Ta → ei ole naine', 'Я / Ты / Он, она → не женщина', 'Mina / Sina / Tema → pole naine'],
        ['Me / Te / Nad → ei ole naised', 'Мы / Вы / Они → не женщины', 'Meie / Teie / Nemad → pole naised'],
      ] },
  ] },
  { id: 'negation-practice', kind: 'practice', title: 'Отрицание и закрепление', page: '16',
    exercises: negativePractice },
  { id: 'sentence-translation', kind: 'practice', title: 'Перевод предложений', page: '16', exercises: sentenceTranslation },
]

export function stepExercises(step: ReaderStep, attempt: Scores) {
  if (step.kind !== 'practice') return []
  // A completed checkpoint from the previous lesson version remains completed.
  if (step.id === 'greetings-practice' && legacyGreetingIds.every((id) => hasScore(attempt, id)) &&
      !step.exercises.some(({ id }) => hasScore(attempt, id))) return practice(...legacyGreetingIds)
  return step.exercises
}

export function firstIncompleteStep(attempt: Scores, steps = lessonSteps) {
  if (!Object.keys(attempt).length) return steps[0]
  return steps.find((step) => stepExercises(step, attempt).some(({ id }) => !hasScore(attempt, id)))
}
