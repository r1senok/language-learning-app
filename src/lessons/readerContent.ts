import { exercises } from './course.ts'
import { pronounBookExercises } from './pronounExercises.ts'
import { hasScore } from './engine.ts'
import { keyPhrases, legacyGreetingIds, newWordExercises } from './greetingsContent.ts'
import type { Exercise, Scores } from './engine.ts'

export type TheoryPanel =
  | { kind: 'phrases'; items: { et: string; ru: string; icon?: string }[] }
  | { kind: 'table'; title: string; headers: string[]; rows: string[][]; accent: number }
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
  { id: 'pronouns-theory', kind: 'theory', title: 'Личные местоимения', page: '14', panels: [
    { kind: 'table', title: 'Полные и краткие формы', headers: ['Полная форма', 'Краткая', 'Перевод'], accent: 1,
      rows: [['Mina', 'Ma', 'Я'], ['Sina', 'Sa', 'Ты'], ['Tema', 'Ta', 'Он / она'], ['Meie', 'Me', 'Мы'], ['Teie', 'Te', 'Вы'], ['Nemad', 'Nad', 'Они']] },
    { kind: 'tip', text: 'Краткая форма удобна в нейтральной речи. Полная помогает подчеркнуть, о ком речь. Tema и ta означают и «он», и «она».' },
  ] },
  { id: 'pronouns-practice', kind: 'practice', title: 'Практика местоимений', page: '14–15',
    exercises: [...practice('pronoun-pairs', 'pronoun-meaning', 'pronoun-blank', 'pronoun-pair'), ...pronounBookExercises] },
  { id: 'olema-theory', kind: 'theory', title: 'Глагол olema', page: '15', panels: [
    { kind: 'tip', text: 'В русском «я дома» обходится без «есть». В эстонском глагол olema в такой фразе выражен явно.' },
    { kind: 'table', title: 'Настоящее время', headers: ['Местоимение', 'Форма olema', 'Перевод'], accent: 1,
      rows: [['ma', 'olen', 'я'], ['sa', 'oled', 'ты'], ['ta', 'on', 'он / она'], ['me', 'oleme', 'мы'], ['te', 'olete', 'вы'], ['nad', 'on', 'они']] },
    { kind: 'examples', items: [
      { before: 'Ma ', accent: 'olen', after: ' kodus.', ru: 'Я дома.' },
      { before: 'Nad ', accent: 'on', after: ' koolis.', ru: 'Они в школе.' },
    ] },
  ] },
  { id: 'olema-practice', kind: 'practice', title: 'Выбираем форму olema', page: '15',
    exercises: practice('olema-blank', 'olema-agreement', 'olema-build', 'olema-translate') },
  { id: 'negation-theory', kind: 'theory', title: 'Отрицание: ei ole и pole', page: '16', panels: [
    { kind: 'examples', items: [
      { before: 'Ma ', accent: 'olen', after: ' õpetaja.', ru: 'Я учитель.' },
      { before: 'Ma ', accent: 'ei ole', after: ' õpetaja.', ru: 'Я не учитель.' },
      { before: 'Ma ', accent: 'pole', after: ' õpetaja.', ru: 'Я не учитель.' },
    ] },
    { kind: 'tip', text: 'Ei ole и pole выражают одно и то же отрицание. Они сохраняют форму при смене лица: ma pole, sa pole, nad pole.' },
  ] },
  { id: 'negation-practice', kind: 'practice', title: 'Отрицание и закрепление', page: '16',
    exercises: practice('negative-build', 'negative-choice', 'negative-blank', 'negative-review') },
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
