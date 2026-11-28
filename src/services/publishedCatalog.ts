import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeGrammaticalForms } from '../domain/grammar.ts'
import { CatalogLoadError } from '../domain/catalogError.ts'
import { isCatalogId, legacyCatalogIds } from '../domain/wordId.ts'
import type { StoredProgress, Word, WordId } from '../types'

type CatalogRow = {
  id: string
  legacy_id: number | null
  lemma: string
  part_of_speech: string | null
  grammatical_forms: Record<string, unknown>
  hint_emojis: string[]
  vocabulary_translations: { glosses: string[] }[]
  vocabulary_categories: { categories: { name: string } | null }[]
}

const pageSize = 100

export async function loadPublishedCatalog(
  client: SupabaseClient | null,
  bundledIds: ReadonlySet<WordId>,
  signal?: AbortSignal,
): Promise<Word[]> {
  if (!client) throw new CatalogLoadError('configuration')

  const words: Word[] = []
  for (let offset = 0; ; offset += pageSize) {
    const query = client.from('vocabulary_entries').select(`
      id, legacy_id, lemma, part_of_speech, grammatical_forms, hint_emojis,
      vocabulary_translations!inner(glosses),
      vocabulary_categories(categories(name))
    `)
      .eq('is_published', true)
      .eq('language_code', 'et')
      .eq('vocabulary_translations.language_code', 'ru')
      .eq('vocabulary_categories.categories.is_published', true)
      .order('id')
      .range(offset, offset + pageSize - 1)
      .retry(false)

    const request = signal ? query.abortSignal(signal) : query
    const { data, error, status } = await request.overrideTypes<CatalogRow[], { merge: false }>()
    if (error) {
      if (status === 401 || status === 403 || error.code === '42501') throw new CatalogLoadError('access')
      throw new CatalogLoadError(!status || status >= 500 ? 'network' : 'response')
    }
    if (!Array.isArray(data)) throw new CatalogLoadError('response')
    for (const row of data) {
      if (!row || typeof row.lemma !== 'string' || !Array.isArray(row.vocabulary_translations) ||
        !row.vocabulary_translations.every((translation) => translation && Array.isArray(translation.glosses) &&
          translation.glosses.every((gloss) => typeof gloss === 'string')) ||
        !Array.isArray(row.vocabulary_categories) || !row.vocabulary_categories.every((link) =>
          link && (link.categories === null || typeof link.categories?.name === 'string')) ||
        !Array.isArray(row.hint_emojis) || !row.grammatical_forms || typeof row.grammatical_forms !== 'object') {
        throw new CatalogLoadError('response')
      }
      const glosses = row.vocabulary_translations.flatMap(({ glosses }) => glosses).filter((text) => text.trim())
      if (!isCatalogId(row.id) || !glosses.length) continue

      const categories = [...new Set(row.vocabulary_categories.flatMap(({ categories }) => {
        const name = categories?.name.trim()
        return name ? [name] : []
      }))].sort()
      const grammaticalForms = normalizeGrammaticalForms(row.grammatical_forms)
      const forms = Object.values(grammaticalForms ?? {}).flat()
      words.push({
        id: row.legacy_id !== null && bundledIds.has(row.legacy_id) ? row.legacy_id : row.id,
        catalogId: row.id,
        estonian: row.lemma,
        russian: glosses.join(', '),
        emojis: row.hint_emojis,
        category: categories[0] ?? 'Общение',
        categories,
        ...(row.part_of_speech && { partOfSpeech: row.part_of_speech }),
        ...(forms.length > 0 && { forms: forms.join(', ') }),
        ...(grammaticalForms && { grammaticalForms }),
        progress: 0,
      })
    }
    if (data.length < pageSize) return words
  }
}

export function mergePublishedCatalog(guest: StoredProgress, catalog: readonly Word[]): StoredProgress {
  if (!catalog.length) return guest

  const words = new Map(guest.words.map((word) => [word.id, word]))
  const aliases = new Map<WordId, WordId>()
  const byCatalogId = new Map(guest.words.flatMap((word) => word.catalogId ? [[word.catalogId, word] as const] : []))

  for (const entry of catalog) {
    const previous = words.get(entry.id)
    const alias = entry.catalogId ? byCatalogId.get(entry.catalogId) : undefined
    if (alias && alias.id !== entry.id) {
      words.delete(alias.id)
      aliases.set(alias.id, entry.id)
    }
    // Existing progress comes from the guest snapshot, never from the catalog.
    const saved = previous ?? alias
    words.set(entry.id, { ...entry, progress: saved?.progress ?? 0,
      ...(saved?.lastReviewedAt && { lastReviewedAt: saved.lastReviewedAt }) })
  }

  const queue = [...new Set(guest.queue.map((id) => aliases.get(id) ?? id))]
    .filter((id) => words.get(id)?.progress === 1 || words.get(id)?.progress === 2)
  return { words: [...words.values()], queue }
}

export function isPersonalWord(word: Word): boolean {
  return !legacyCatalogIds.has(word.id) && (Boolean(word.personalId) || !word.catalogId)
}

export function availableLearningProgress(progress: StoredProgress, catalog: readonly Word[] | undefined): StoredProgress {
  const published = new Map(catalog?.map((word) => [word.id, word]))
  const words = progress.words.flatMap((word) => {
    if (isPersonalWord(word)) return [word]

    const entry = published.get(word.id)
    if (entry) return [{ ...entry, progress: word.progress, ...(word.lastReviewedAt && { lastReviewedAt: word.lastReviewedAt }), ...(word.personalId && { personalId: word.personalId }) }]
    // While offline, only previously downloaded catalog words remain usable.
    return catalog === undefined && word.catalogId ? [word] : []
  })
  const ids = new Set(words.map(({ id }) => id))
  return { words, queue: progress.queue.filter((id) => ids.has(id)) }
}

export function sharedCatalogWithProgress(catalog: readonly Word[], words: readonly Word[]): Word[] {
  const stages = new Map(words.filter((word) => !isPersonalWord(word)).map(({ id, progress }) => [id, progress]))
  return catalog.map((word) => ({ ...word, progress: stages.get(word.id) ?? 0 }))
}

// The active queue is a projection. Keep archived progress and the original
// hidden queue entries in storage when the guest changes the visible queue.
export function preserveDormantGuestProgress(saved: StoredProgress, before: StoredProgress, next: StoredProgress): StoredProgress {
  const activeIds = new Set(before.words.map(({ id }) => id))
  const words = new Map(saved.words.map((word) => [word.id, word]))
  for (const word of next.words) words.set(word.id, word)

  const queue: WordId[] = []
  let position = 0
  for (const id of saved.queue) {
    const entry = activeIds.has(id) ? next.queue[position++] : id
    if (entry !== undefined) queue.push(entry)
  }
  queue.push(...next.queue.slice(position))
  return { words: [...words.values()], queue }
}
