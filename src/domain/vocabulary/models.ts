export interface Language {
  code: string
  name: string
}

export interface Book {
  id: string
  title: string
  languageCode: Language['code']
  edition?: string
}

export interface Translation {
  languageCode: Language['code']
  text: string
}

export interface Category {
  id: string
  name: string
}

export interface SourceReference {
  bookId: Book['id']
  lessonId?: string
  pageLabel: string
}

export interface VocabularyEntry {
  id: string
  languageCode: Language['code']
  lemma: string
  translations: Translation[]
  categoryIds: Category['id'][]
  hintEmojis?: string[]
  partOfSpeech?: string
  grammaticalForms?: Record<string, string>
  sources: SourceReference[]
}
