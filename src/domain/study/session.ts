import type { StudyProgress } from './models'

export interface StudySession {
  queue: string[]
  progress: Record<string, StudyProgress>
  turn: number
}

export type StudyDecision = 'know' | 'unknown'
export type StudyWord = Omit<StudyProgress, 'state'>

export interface StudyRepository {
  read(): Promise<StudySession>
  update(change: (session: StudySession) => StudySession): Promise<StudySession>
}

export const emptySession: StudySession = { queue: [], progress: {}, turn: 0 }

export function enqueue(
  session: StudySession,
  words: readonly StudyWord[],
  allowLearned = false,
): StudySession {
  const queue = new Set(session.queue)
  const progress = { ...session.progress }

  for (const word of words) {
    if (queue.has(word.entryId)) continue

    const previous = Object.hasOwn(progress, word.entryId) ? progress[word.entryId] : undefined
    if (previous && !allowLearned) continue
    if (allowLearned && previous?.state !== 'learned') continue

    progress[word.entryId] = { ...word, state: 'forward' }
    queue.add(word.entryId)
  }

  if (queue.size === session.queue.length) return session
  return { ...session, queue: [...queue], progress }
}

export function grade(
  session: StudySession,
  entryId: string,
  turn: number,
  decision: StudyDecision,
  random: () => number = Math.random,
): StudySession {
  if (session.queue[0] !== entryId || session.turn !== turn) return session

  const word = session.progress[entryId]
  const queue = session.queue.slice(1)
  let state: StudyProgress['state']

  if (decision === 'unknown') {
    state = 'forward'
    for (let index = queue.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1))
      const entry = queue[index]
      queue[index] = queue[other]
      queue[other] = entry
    }
    // Keep another card at the front whenever one is available.
    const position = queue.length ? 1 + Math.floor(random() * queue.length) : 0
    queue.splice(position, 0, entryId)
  } else if (word.state === 'forward') {
    state = 'reverse'
    queue.push(entryId)
  } else {
    state = 'learned'
  }

  return {
    queue,
    progress: { ...session.progress, [entryId]: { ...word, state } },
    turn: session.turn + 1,
  }
}
