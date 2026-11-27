import type { Option } from './engine.ts'

export function shuffledOptions<T>(items: readonly T[], key: string, pickIndex = (value: number, size: number) => Math.floor(value / 2 ** 32 * size)) {
  let seed = 2166136261
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619)
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = pickIndex(seed, i + 1)
    const item = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = item
  }
  return shuffled
}

export function shuffledWordBank(questionId: string, options: Option[], answer: string[], attemptSeed = '') {
  const labels = new Map(options.map(({ id, text }) => [id, text]))
  const expected = answer.map((id) => labels.get(id))
  const isStraightAnswer = (bank: Option[]) => bank.length === expected.length && bank.length > 2 &&
    (bank.every(({ text }, i) => text === expected[i]) ||
      bank.every(({ text }, i) => text === expected[expected.length - 1 - i]))
  let bank = shuffledOptions(options, `${attemptSeed}:${questionId}`)
  for (let retry = 0; retry < 12 && isStraightAnswer(bank); retry++) {
    bank = shuffledOptions(options, `${attemptSeed}:${questionId}:${retry}`)
  }
  return bank
}
