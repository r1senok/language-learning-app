import type { StoredProgress, Word } from '../types'

const GUEST_STORAGE_KEY = 'takku-estonian-v1'
const LEGACY_STORAGE_KEY = ['slov', 'etto-estonian-v2'].join('')

export function loadGuestProgress(starterWords: Word[]): StoredProgress {
  try {
    const stored = localStorage.getItem(GUEST_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || ''
    const value = JSON.parse(stored)
    if (Array.isArray(value.words) && Array.isArray(value.queue)) {
      if (!localStorage.getItem(GUEST_STORAGE_KEY)) localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(value))
      return value
    }
  } catch {
    // Invalid local data falls back to the bundled vocabulary.
  }

  return {
    words: starterWords,
    queue: starterWords.filter((word) => word.progress === 1 || word.progress === 2).map((word) => word.id),
  }
}

export function saveGuestProgress(progress: StoredProgress) {
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(progress))
}
