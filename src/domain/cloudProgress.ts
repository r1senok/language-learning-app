import { legacyCatalogIds } from './wordId.ts'
import { requeueAfterAnswer } from './learning.ts'
import type { Progress, StoredProgress, Word, WordId } from '../types'

type WordRef = { id: string; kind: 'catalog' | 'personal' }

export type ProgressRow = WordRef & {
  stage: Progress
  queue_position: number | null
  revision: number | null
}

export type PersonalDraft = {
  id: string
  legacy_id: number | null
  lemma: string
  translation: string
  part_of_speech: string | null
  grammatical_forms: { display?: string }
  hint_emojis: string[]
}

type PersonalRow = PersonalDraft & { client_key: string | null }

export type CloudSnapshot = {
  version: string
  imported: boolean
  acknowledged: boolean
  personal: PersonalRow[]
  progress: ProgressRow[]
}

export type StudyChange = {
  type: 'study'
  word: Word
  expected: Progress
  stage: Progress
  placement: 'answer' | 'append'
  random: number
}

export type CloudAction = { id: string } & (
  StudyChange |
  { type: 'personal'; word: Word } |
  { type: 'import'; guest: StoredProgress | null; keys: Record<WordId, string> }
)

export type CloudPlan = {
  snapshot: CloudSnapshot
  personal: PersonalDraft[]
  progress: ProgressRow[]
  decideImport: boolean
}

export const emptyCloud: CloudSnapshot = {
  version: '', imported: false, acknowledged: false, personal: [], progress: [],
}

const keyOf = ({ kind, id }: WordRef) => `${kind}:${id}`
const isQueued = (stage: Progress) => stage === 1 || stage === 2
const order = (rows: ProgressRow[]) => rows.filter((row) => row.queue_position !== null)
  .sort((a, b) => a.queue_position! - b.queue_position!)

export function projectProgress(snapshot: CloudSnapshot, catalog: readonly Word[]): StoredProgress {
  const words = new Map<WordId, Word>(catalog.map((word) => [word.id, { ...word, progress: 0 }]))
  const ids = new Map<string, WordId>()
  for (const word of catalog) {
    if (word.catalogId) ids.set(keyOf({ kind: 'catalog', id: word.catalogId }), word.id)
  }
  for (const row of snapshot.personal) {
    const id = row.legacy_id ?? row.client_key ?? row.id
    const bundled = words.get(id)
    words.set(id, {
      id, personalId: row.id, estonian: row.lemma, russian: row.translation,
      category: bundled?.category ?? 'Общение', emojis: row.hint_emojis,
      ...(row.part_of_speech && { partOfSpeech: row.part_of_speech }),
      ...(typeof row.grammatical_forms.display === 'string' && { forms: row.grammatical_forms.display }),
      progress: 0,
    })
    ids.set(keyOf({ kind: 'personal', id: row.id }), id)
  }

  for (const row of snapshot.progress) {
    const id = ids.get(keyOf(row))
    const word = id === undefined ? undefined : words.get(id)
    if (word && (row.kind === 'personal' || !word.personalId)) word.progress = row.stage
  }
  const queue = order(snapshot.progress).flatMap((row) => {
    const id = ids.get(keyOf(row))
    const word = id === undefined ? undefined : words.get(id)
    return word && isQueued(word.progress) && (row.kind === 'personal' || !word.personalId) ? [word.id] : []
  })
  return { words: [...words.values()], queue }
}

export function planAction(
  snapshot: CloudSnapshot,
  action: CloudAction,
  catalog: readonly Word[],
): CloudPlan | null {
  const personal = [...snapshot.personal]
  const newWords: PersonalDraft[] = []
  const rows = new Map(snapshot.progress.map((row) => [keyOf(row), row]))
  let queue = order(snapshot.progress).map(keyOf)

  function resolve(word: Word, offlineId: string): WordRef {
    const bundled = catalog.find(({ id }) => id === word.id)
    const own = personal.find((row) => row.id === word.personalId || row.id === word.id ||
      row.client_key === word.id || (row.legacy_id === word.id &&
        (bundled || (row.lemma === word.estonian && row.translation === word.russian))))
    if (own) return { kind: 'personal', id: own.id }

    const published = word.catalogId ?? bundled?.catalogId
    if (published) return { kind: 'catalog', id: published }

    const draft: PersonalDraft = {
      id: typeof word.id === 'string' && !word.personalId ? word.id : offlineId,
      legacy_id: typeof word.id === 'number' && !personal.some((row) => row.legacy_id === word.id) ? word.id : null,
      lemma: word.estonian,
      translation: word.russian,
      part_of_speech: word.partOfSpeech ?? null,
      grammatical_forms: word.forms ? { display: word.forms } : {},
      hint_emojis: word.emojis.filter((emoji) => emoji.trim()).slice(0, 3),
    }
    personal.push({ ...draft, client_key: draft.id })
    newWords.push(draft)
    return { kind: 'personal', id: draft.id }
  }

  function stage(ref: WordRef, next: Progress, placement: 'answer' | 'append', random = 0) {
    const key = keyOf(ref)
    const existing = rows.get(key)
    if (!isQueued(next)) queue = queue.filter((id) => id !== key)
    else if (placement === 'answer') {
      const aliases = new Set<WordId | null>(personal.map((word) => word.legacy_id))
      const visible = new Set([
        ...catalog.flatMap((word) => word.catalogId && !aliases.has(word.id)
          ? [keyOf({ kind: 'catalog', id: word.catalogId })] : []),
        ...personal.filter((word) => word.legacy_id === null || !legacyCatalogIds.has(word.legacy_id) ||
          catalog.some((entry) => entry.id === word.legacy_id))
          .map((word) => keyOf({ kind: 'personal', id: word.id })),
        key,
      ])
      const nextQueue = requeueAfterAnswer(queue.filter((id) => visible.has(id)), key, false, () => random)
      const reordered: string[] = []
      let index = 0
      for (const id of queue) {
        const next = visible.has(id) ? nextQueue[index++] : id
        if (next) reordered.push(next)
      }
      queue = [...reordered, ...nextQueue.slice(index)]
    } else if (!queue.includes(key)) queue.push(key)
    rows.set(key, { ...ref, stage: next, queue_position: null, revision: existing?.revision ?? null })
  }

  if (action.type === 'study') {
    const ref = resolve(action.word, action.id)
    if ((rows.get(keyOf(ref))?.stage ?? 0) !== action.expected) return null
    stage(ref, action.stage, action.placement, action.random)
  } else if (action.type === 'personal') {
    resolve(action.word, action.id)
  } else if (!snapshot.imported && action.guest) {
    const guest = action.guest
    const byId = new Map(guest.words.map((word) => [word.id, word]))
    for (const word of [...guest.queue.flatMap((id) => byId.get(id) ?? []),
      ...guest.words.filter((word) => !isQueued(word.progress))]) {
      const published = catalog.some((entry) => entry.id === word.id || entry.catalogId === word.catalogId && word.catalogId)
      if (word.catalogId && !published) continue
      if (!word.progress && (word.catalogId || published || legacyCatalogIds.has(word.id))) continue
      const ref = resolve(word, action.keys[word.id])
      const current = rows.get(keyOf(ref))?.stage ?? 0
      if (word.progress > current) stage(ref, word.progress, 'append')
    }
  }

  const positions = new Map(queue.map((key, position) => [key, position]))
  const progress = [...rows.values()].map((row) => ({
    ...row, queue_position: positions.get(keyOf(row)) ?? null,
  }))
  const oldRows = new Map(snapshot.progress.map((row) => [keyOf(row), row]))
  return {
    snapshot: { ...snapshot, personal, progress, imported: snapshot.imported || action.type === 'import' },
    personal: newWords,
    progress: progress.filter((row) => {
      const old = oldRows.get(keyOf(row))
      return !old || row.stage !== old.stage || row.queue_position !== old.queue_position
    }),
    decideImport: action.type === 'import' && !snapshot.imported,
  }
}
