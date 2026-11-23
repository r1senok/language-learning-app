import type { Language, VocabularyEntry } from '../vocabulary/models'

export interface StudyProgress {
  entryId: VocabularyEntry['id']
  studyLanguageCode: Language['code']
  translationLanguageCode: Language['code']
  state: 'forward' | 'reverse' | 'learned'
}
