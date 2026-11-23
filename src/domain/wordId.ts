import type { WordId } from '../types'

export function isCatalogId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
}

export function isWordId(value: unknown): value is WordId {
  return isCatalogId(value) || (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
}
