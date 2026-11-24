import { useCallback, useEffect, useRef, useState } from 'react'
import { createPronunciationPlayer, pronunciationUrl } from './domain/pronunciation'
import type { PlaybackState } from './domain/pronunciation'

const player = createPronunciationPlayer((url) => new Audio(url))
const messages: Record<PlaybackState, string> = {
  idle: '',
  loading: 'Загрузка аудио…',
  playing: 'Воспроизводится…',
  missing: 'Для этой фразы аудио пока недоступно.',
  error: 'Не удалось воспроизвести аудио. Проверьте подключение и попробуйте снова.',
}

export function useStudyPronunciation() {
  const [audioStatus, setStatus] = useState<PlaybackState>('idle')
  const cancel = useRef<() => void>(() => {})
  const stop = useCallback(() => {
    cancel.current()
    cancel.current = () => {}
    setStatus('idle')
  }, [])
  useEffect(() => () => cancel.current(), [])

  function pronounce(text: string) {
    stop()
    cancel.current = player.play(pronunciationUrl(text, import.meta.env.VITE_SUPABASE_URL), setStatus)
  }

  return { pronounce, speechMessage: messages[audioStatus], audioStatus, stop }
}
