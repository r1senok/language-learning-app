export type Progress = 0 | 1 | 2 | 3
export type Category = 'Природа' | 'Характер' | 'Путешествия' | 'Еда' | 'Дом' | 'Общение'

export type Word = {
  id: number
  estonian: string
  russian: string
  emojis: string[]
  category: Category
  partOfSpeech?: string
  forms?: string
  progress: Progress
}

export type StoredProgress = {
  words: Word[]
  queue: number[]
}
