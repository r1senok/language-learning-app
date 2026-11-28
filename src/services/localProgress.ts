import { normalizeGrammaticalForms } from '../domain/grammar.ts'
import { isCatalogId, isWordId } from '../domain/wordId.ts'
import type { Progress, StoredProgress, Word, WordId } from '../types'

const GUEST_STORAGE_KEY = 'takku-estonian-v1'
const LEGACY_STORAGE_KEY = ['slov', 'etto-estonian-v2'].join('')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProgress(value: unknown): value is Progress {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function recoverWord(value: unknown, starters: ReadonlyMap<WordId, Word>): Word | undefined {
  if (!isRecord(value) || !isWordId(value.id)) return

  const starter = starters.get(value.id)
  const estonian = isText(value.estonian) ? value.estonian : starter?.estonian
  const russian = isText(value.russian) ? value.russian : starter?.russian
  if (!estonian || !russian) return
  const grammaticalForms = normalizeGrammaticalForms(value.grammaticalForms)

  return {
    id: value.id,
    estonian,
    russian,
    emojis: Array.isArray(value.emojis) ? value.emojis.filter(isText) : starter?.emojis ?? [],
    category: isText(value.category) ? value.category : starter?.category ?? 'Общение',
    ...(isCatalogId(value.catalogId) && { catalogId: value.catalogId }),
    ...(Array.isArray(value.categories) && { categories: value.categories.filter(isText) }),
    ...(typeof value.partOfSpeech === 'string' && { partOfSpeech: value.partOfSpeech }),
    ...(typeof value.forms === 'string' && { forms: value.forms }),
    ...(grammaticalForms && { grammaticalForms }),
    ...(typeof value.lastReviewedAt === 'string' && Number.isFinite(Date.parse(value.lastReviewedAt)) && { lastReviewedAt: value.lastReviewedAt }),
    progress: isProgress(value.progress) ? value.progress : starter?.progress ?? 0,
  }
}

function recoverQueue(words: Word[], storedQueue: unknown): WordId[] {
  const active = new Set(words.filter(({ progress }) => progress === 1 || progress === 2).map(({ id }) => id))
  const queue: WordId[] = []

  if (Array.isArray(storedQueue)) {
    for (const id of storedQueue) {
      if (isWordId(id) && active.delete(id)) queue.push(id)
    }
  }

  return [...queue, ...active]
}

function recoverProgress(raw: string | null, starters: ReadonlyMap<WordId, Word>): StoredProgress | undefined {
  if (!raw) return

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return
  }
  if (!isRecord(value) || !Array.isArray(value.words)) return

  const words = new Map<WordId, Word>()
  const validStages = new Set<WordId>()
  for (const entry of value.words) {
    const word = recoverWord(entry, starters)
    if (!word || !isRecord(entry)) continue

    const validStage = isProgress(entry.progress)
    if (!words.has(word.id) || (validStage && !validStages.has(word.id))) {
      words.set(word.id, word)
      if (validStage) validStages.add(word.id)
    }
  }
  if (!words.size) return

  // Restore missing bundled entries when damage left a stored entry unreadable.
  if (words.size < value.words.length) {
    for (const [id, starter] of starters) {
      if (!words.has(id)) words.set(id, starter)
    }
  }

  const recoveredWords = [...words.values()]
  return { words: recoveredWords, queue: recoverQueue(recoveredWords, value.queue) }
}

export function readSavedGuestProgress(starterWords: Word[]): StoredProgress | undefined {
  const starters = new Map(starterWords.map((word) => [word.id, word]))
  try {
    const current = recoverProgress(localStorage.getItem(GUEST_STORAGE_KEY), starters)
    if (current) return current

    const legacy = recoverProgress(localStorage.getItem(LEGACY_STORAGE_KEY), starters)
    if (legacy) {
      saveGuestProgress(legacy)
      return legacy
    }
  } catch {
    // Some browser modes prevent access to localStorage.
  }

}

export function loadGuestProgress(starterWords: Word[]): StoredProgress {
  const saved = readSavedGuestProgress(starterWords)
  if (saved) return saved
  return { words: starterWords, queue: recoverQueue(starterWords, undefined) }
}

export function saveGuestProgress(progress: StoredProgress) {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Keep the current session playable even when storage is unavailable.
  }
}
