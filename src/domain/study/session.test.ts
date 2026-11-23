import { describe, expect, it } from 'vitest'
import { emptySession, enqueue, grade } from './session'

const word = (entryId: string) => ({ entryId, studyLanguageCode: 'et', translationLanguageCode: 'ru' })

describe('study session', () => {
  it('adds new words once and advances a known word through both directions', () => {
    const initial = enqueue(emptySession, [word('a'), word('b'), word('a')])
    expect(initial.queue).toEqual(['a', 'b'])
    expect(initial.progress.a.state).toBe('forward')

    const reverse = grade(initial, 'a', initial.turn, 'know')
    expect(reverse.queue).toEqual(['b', 'a'])
    expect(reverse.progress.a.state).toBe('reverse')
    expect(enqueue(reverse, [word('a')])).toBe(reverse)

    const next = grade(reverse, 'b', reverse.turn, 'know')
    const learned = grade(next, 'a', next.turn, 'know')
    expect(learned.queue).toEqual(['b'])
    expect(learned.progress.a.state).toBe('learned')
    expect(enqueue(learned, [word('a')])).toBe(learned)

    const restored = enqueue(learned, [word('a'), word('a'), word('c')], true)
    expect(restored.queue).toEqual(['b', 'a'])
    expect(restored.progress.a.state).toBe('forward')
  })

  it('reshuffles misses and puts a different card first when possible', () => {
    const start = enqueue(emptySession, ['a', 'b', 'c', 'd'].map(word))
    const missed = grade(start, 'a', start.turn, 'unknown', () => 0)
    expect(missed.queue).toEqual(['c', 'a', 'd', 'b'])
    expect(missed.progress.a.state).toBe('forward')
  })

  it('resets a reverse miss even when there is only one card', () => {
    const start = enqueue(emptySession, [word('a')])
    const reverse = grade(start, 'a', start.turn, 'know')
    expect(grade(reverse, 'a', start.turn, 'know')).toBe(reverse)

    const missed = grade(reverse, 'a', reverse.turn, 'unknown')
    expect(missed.queue).toEqual(['a'])
    expect(missed.progress.a.state).toBe('forward')
  })

  it('ignores grades for a word that is not first in the queue', () => {
    const start = enqueue(emptySession, [word('a'), word('b')])
    expect(grade(start, 'b', start.turn, 'know')).toBe(start)
  })
})
