import type { Option } from './engine.ts'

export function shuffledWordBank(questionId: string, options: Option[], answer: string[]) {
  // The stable question ID keeps the same order after a reload.
  let seed = 2166136261
  for (const letter of questionId) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619)
  const shuffled = [...options]
  const labels = new Map(options.map(({ id, text }) => [id, text]))
  const expected = answer.map((id) => labels.get(id))
  const isStraightAnswer = () => shuffled.length > 2 &&
    (shuffled.every(({ text }, i) => text === expected[i]) ||
      shuffled.every(({ text }, i) => text === expected[expected.length - 1 - i]))
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      const j = Math.floor(seed / 2 ** 32 * (i + 1))
      const option = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = option
    }
    if (!isStraightAnswer()) break
  }
  return shuffled
}
