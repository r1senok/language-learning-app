import type { WordId } from '../types'

export function isCatalogId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}

export function isWordId(value: unknown): value is WordId {
  return isCatalogId(value) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
}

// IDs 1–42 were reserved for the original bundled catalog.
export const legacyCatalogIds: ReadonlySet<WordId> = new Set(Array.from({ length: 42 }, (_, index) => index + 1))
