import type { SourceReference } from '../vocabulary/models'

export interface ImportJob {
  id: string
  type: 'vocabulary' | 'lesson' | 'book'
  status: 'draft' | 'published'
  schemaVersion: number
  source?: SourceReference
  createdAt: string
}
