export type Progress = 0 | 1 | 2 | 3

export type WordId = number | string

export type Word = {
  id: WordId
  catalogId?: string
  personalId?: string
  estonian: string
  russian: string
  emojis: string[]
  category: string
  categories?: string[]
  partOfSpeech?: string
  forms?: string
  progress: Progress
}

export type StoredProgress = {
  words: Word[]
  queue: WordId[]
}
