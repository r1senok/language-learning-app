import type { SupabaseClient } from '@supabase/supabase-js'
import { isCatalogId } from '../domain/wordId.ts'
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
  if (!client) return []

  try {
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
      const { data, error } = await request.overrideTypes<CatalogRow[], { merge: false }>()
      if (error || !data) return []
      for (const row of data) {
        const glosses = row.vocabulary_translations.flatMap(({ glosses }) => glosses).filter((text) => text.trim())
        if (!isCatalogId(row.id) || !glosses.length) continue

        const categories = [...new Set(row.vocabulary_categories.flatMap(({ categories }) => {
          const name = categories?.name.trim()
          return name ? [name] : []
        }))].sort()
        const forms = Object.values(row.grammatical_forms).flat()
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
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
          progress: 0,
        })
      }
      if (data.length < pageSize) return words
    }
  } catch {
    // The local catalog remains usable when fetch fails or is cancelled.
    return []
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
    words.set(entry.id, { ...entry, progress: previous?.progress ?? alias?.progress ?? 0 })
  }

  const queue = [...new Set(guest.queue.map((id) => aliases.get(id) ?? id))]
    .filter((id) => words.get(id)?.progress === 1 || words.get(id)?.progress === 2)
  return { words: [...words.values()], queue }
}

export function wordsInDictionary(
  words: readonly Word[],
  bundledIds: ReadonlySet<WordId>,
  publishedIds: ReadonlySet<WordId> | null,
): Word[] {
  return words.filter((word) => {
    if (word.progress !== 0) return true
    if (word.personalId) return true
    if (publishedIds?.has(word.id)) return true
    if (!publishedIds && bundledIds.has(word.id)) return true
    return typeof word.id === 'number' && !bundledIds.has(word.id)
  })
}
