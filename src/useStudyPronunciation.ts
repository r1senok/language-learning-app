import { useEffect, useRef, useState } from 'react'
import { findStudyVoice } from './domain/pronunciation'
import type { StudyLanguage } from './domain/pronunciation'

export function useStudyPronunciation() {
  const voices = useRef<SpeechSynthesisVoice[]>([])
  const [speechMessage, setSpeechMessage] = useState('')

  useEffect(() => {
    const speech = window.speechSynthesis
    if (!speech) return
    const update = () => { voices.current = speech.getVoices() }
    update()
    speech.addEventListener('voiceschanged', update)
    return () => speech.removeEventListener('voiceschanged', update)
  }, [])

  function pronounce(text: string, language: StudyLanguage) {
    const speech = window.speechSynthesis
    const updated = speech?.getVoices() ?? []
    if (updated.length) voices.current = updated
    const voice = findStudyVoice(voices.current, language)
    if (!speech || !voice || typeof window.SpeechSynthesisUtterance !== 'function') {
      setSpeechMessage(language === 'et-EE'
        ? 'На устройстве недоступен эстонский голос.'
        : 'На устройстве недоступен русский голос.')
      return
    }

    setSpeechMessage('')
    speech.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.voice = voice
    utterance.rate = 0.88
    utterance.onerror = ({ error }) => {
      if (error !== 'canceled' && error !== 'interrupted') setSpeechMessage('Не удалось воспроизвести слово. Попробуйте снова.')
    }
    speech.speak(utterance)
  }

  return { pronounce, speechMessage, setSpeechMessage }
}
