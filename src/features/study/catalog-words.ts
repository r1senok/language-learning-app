import type { VocabularyEntry } from '../../domain/vocabulary/models'
import { demoVocabulary } from '../catalog/demo-data'

export const catalogById = new Map(demoVocabulary.map((entry) => [entry.id, entry]))

export function asStudyWord(entry: VocabularyEntry) {
  return {
    entryId: entry.id,
    studyLanguageCode: entry.languageCode,
    translationLanguageCode: 'ru',
  }
}
