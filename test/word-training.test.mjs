import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyCloud, planAction, projectProgress } from '../src/domain/cloudProgress.ts'
import { reviewQueuedWord } from '../src/domain/learning.ts'
import { filterDictionary } from '../src/domain/myWords.ts'
import { trainingCandidates, wordStatus } from '../src/domain/wordTraining.ts'

const word = (id, progress, props = {}) => ({
  id, catalogId: id, progress, estonian: 'hommik', russian: 'утро', category: 'Время', emojis: [], ...props,
})
const date = '2026-11-28T10:00:00.000Z'

test('builds unique discovery and review pools, rejects missing translations and excludes known words', () => {
  const words = [word('a', 0), word('b', 1), word('c', 2), word('d', 3), word('e', 0, { russian: ' ' }),
    word('f', 0, { catalogId: 'a' })]
  const progress = { words, queue: ['c', 'b', 'c', 'd'] }
  assert.deepEqual(trainingCandidates('new', progress, words).map(({ id }) => id), ['a'])
  assert.deepEqual(trainingCandidates('review', progress, words).map(({ id }) => id), ['c', 'b'])
  assert.deepEqual(words.slice(0, 4).map(wordStatus), ['new', 'learning', 'pending_reverse', 'learned'])
})

test('a reverse miss preserves the confirmed direction and requeues behind another word', () => {
  const words = [word('a', 2), word('b', 1)]
  const next = reviewQueuedWord({ words, queue: ['a', 'b'] }, 'a', false, () => 0, date)
  assert.equal(next.words[0].progress, 2)
  assert.equal(next.words[0].lastReviewedAt, date)
  assert.deepEqual(next.queue, ['b', 'a'])
  const learned = reviewQueuedWord(next, 'a', true, () => 0, date)
  assert.equal(learned.words[0].progress, 3)
  assert.deepEqual(learned.queue, ['b'])
})

test('cloud plans persist a dated review even when the word stays in the same stage and queue slot', () => {
  const entry = word('abc', 0)
  const catalog = [entry]
  const known = planAction(emptyCloud, { type: 'study', id: 'first', word: entry, expected: 0, stage: 2,
    placement: 'append', random: 0, reviewedAt: date }, catalog)
  assert.equal(known.progress[0].last_reviewed_at, date)
  const later = '2026-11-28T11:00:00.000Z'
  const miss = planAction(known.snapshot, { type: 'study', id: 'second', word: entry, expected: 2, stage: 2,
    placement: 'answer', random: 0, reviewedAt: later }, catalog)
  assert.equal(miss.progress.length, 1)
  assert.equal(miss.progress[0].queue_position, 0)
  assert.deepEqual(projectProgress(miss.snapshot, catalog).words[0], { ...entry, progress: 2, lastReviewedAt: later })
})

test('dictionary can search forms and combine an actual category with the active status', () => {
  const words = [word('a', 2, { forms: 'hommiku, hommikut' }), word('b', 3, { forms: 'hommikut' })]
  assert.deepEqual(filterDictionary(words, 'hommikut', 'learning', 'Время'), [words[0]])
  assert.deepEqual(filterDictionary(words, 'hommikut', 'learned', 'Время'), [words[1]])
  assert.deepEqual(filterDictionary(words, 'hommikut', 'all', 'Природа'), [])
})
