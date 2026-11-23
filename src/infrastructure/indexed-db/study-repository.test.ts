import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { emptySession, enqueue, grade } from '../../domain/study/session'
import { createStudyRepository } from './study-repository'

const word = (entryId: string) => ({ entryId, studyLanguageCode: 'et', translationLanguageCode: 'ru' })

it('reopens the saved queue and progress by stable ID', async () => {
  const name = 'study-persistence'
  const first = createStudyRepository(name)
  expect(await first.read()).toEqual(emptySession)

  await first.update((session) => enqueue(session, [word('a'), word('b')]))
  const saved = await first.update((session) => grade(session, 'a', session.turn, 'know'))

  const reopened = createStudyRepository(name)
  expect(await reopened.read()).toEqual(saved)
  expect(saved.queue).toEqual(['b', 'a'])
  expect(saved.progress.a.state).toBe('reverse')
})

it('preserves both changes made by concurrent repository connections', async () => {
  const name = 'study-concurrency'
  const first = createStudyRepository(name)
  const second = createStudyRepository(name)

  await Promise.all([
    first.update((session) => enqueue(session, [word('a')])),
    second.update((session) => enqueue(session, [word('b')])),
  ])

  const saved = await first.read()
  expect([...saved.queue].sort()).toEqual(['a', 'b'])
  expect(Object.keys(saved.progress).sort()).toEqual(['a', 'b'])
})
