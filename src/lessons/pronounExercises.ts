import { lessonId } from './course.ts'
import type { BookChoice, Option } from './engine.ts'

const translations = [
  ['Я', 'mina'], ['Он', 'tema'], ['Ты', 'sina'], ['Они', 'nemad'], ['Вы', 'teie'], ['Мы', 'meie'],
] as const
const forms = [
  ['sina', 'sa'], ['tema', 'ta'], ['meie', 'me'], ['teie', 'te'], ['mina', 'ma'], ['nemad', 'nad'],
] as const

function shuffleForQuestion(options: Option[], id: string) {
  let seed = [...id].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261)
  const shuffled = [...options]
  for (let position = shuffled.length - 1; position > 0; position--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const swap = seed % (position + 1)
    ;[shuffled[position], shuffled[swap]] = [shuffled[swap], shuffled[position]]
  }
  return shuffled
}

function questions(number: number, rows: readonly (readonly [string, string])[], choices: readonly string[],
  optionCount: number, heading: string, language: 'ru' | 'et'): BookChoice[] {
  return rows.map(([prompt, correct], index) => {
    const id = `exercise-${number}-${index + 1}`
    const options = choices.map((text) => ({ id: text, text }))
    const variants = optionCount === choices.length ? options : shuffleForQuestion(
      [{ id: correct, text: correct }, ...shuffleForQuestion(options.filter((option) => option.id !== correct), id)
        .slice(0, optionCount - 1)], `${id}-options`)
    return { id, kind: 'multiple_choice', prompt, correct, options: variants, explanation: '',
      book: { bookId: 'tere-a1', answerSource: 'vastused-215', lessonId, number, question: index + 1, total: rows.length, page: 15, heading, language } }
  })
}

export const pronounBookExercises = [
  ...questions(8, translations, translations.map(([, translation]) => translation), 4, 'Выберите правильный перевод', 'ru'),
  ...questions(9, forms, ['ma', 'sa', 'ta', 'me', 'te', 'nad'], 6, 'Выберите короткую форму', 'et'),
]
