export type GrammaticalForms = Record<string, string | string[]>

type FormDefinition = { label: string; aliases: readonly string[] }

const nominalForms: readonly FormDefinition[] = [
  { label: 'Nimetav', aliases: ['nimetav', 'nominative'] },
  { label: 'Omastav', aliases: ['omastav', 'genitive'] },
  { label: 'Osastav', aliases: ['osastav', 'partitive'] },
]

const verbForms: readonly FormDefinition[] = [
  { label: 'Ma-tegevusnimi', aliases: ['ma_infinitive', 'ma_tegevusnimi'] },
  { label: 'Da-tegevusnimi', aliases: ['da_infinitive', 'da_tegevusnimi'] },
  { label: 'Olevik · mina', aliases: ['present_1sg', 'olevik_1sg'] },
  { label: 'Käskiv kõneviis · sina', aliases: ['imperative_2sg'] },
]

export function normalizeGrammaticalForms(value: unknown): GrammaticalForms | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const entries = Object.entries(value).flatMap(([key, raw]): [string, string | string[]][] => {
    if (typeof raw === 'string' && raw.trim()) return [[key, raw.trim()]]
    if (Array.isArray(raw)) {
      const variants = raw.filter((form): form is string => typeof form === 'string')
        .map((form) => form.trim()).filter(Boolean)
      if (variants.length) return [[key, variants]]
    }
    return []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

export function isStudyVerb(partOfSpeech?: string) {
  return ['verb', 'tegusõna', 'гл', 'гл.', 'глагол'].includes(partOfSpeech?.trim().toLowerCase() ?? '')
}

export function studyGrammarRows(partOfSpeech?: string, forms?: GrammaticalForms) {
  if (!forms || typeof partOfSpeech !== 'string') return []

  const part = partOfSpeech.trim().toLowerCase()
  const definitions = ['noun', 'nimisõna', 'subst', 'subst.', 'сущ', 'сущ.', 'существительное',
    'adjective', 'adj', 'adj.', 'omadussõna', 'прил', 'прил.', 'прилагательное'].includes(part)
    ? nominalForms
    : isStudyVerb(part) ? verbForms : []
  const values = new Map(Object.entries(forms).map(([key, value]) => [key.trim().toLowerCase(), value]))

  return definitions.flatMap(({ label, aliases }) => {
    const value = aliases.map((alias) => values.get(alias)).find((form) => form !== undefined)
    return value ? [{ label, value: Array.isArray(value) ? value.join(', ') : value }] : []
  })
}
