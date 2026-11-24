import { audioBucket, preparedAudioId, preparedAudioPath } from '../../supabase/functions/_shared/audio-catalog.ts'

export function pronunciationUrl(text: string, base?: string) {
  const id = preparedAudioId(text)
  if (!base?.trim() || !id) return undefined
  return `${base.trim().replace(/\/+$/, '')}/storage/v1/object/public/${audioBucket}/${preparedAudioPath(id)}`
}

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'missing' | 'error'
type AudioPlayer = Pick<HTMLAudioElement, 'play' | 'pause' | 'addEventListener' | 'removeEventListener' | 'error'>

export function createPronunciationPlayer(createAudio: (url: string) => AudioPlayer) {
  let active: (() => void) | undefined

  return {
    play(url: string | undefined, notify: (state: PlaybackState) => void) {
      active?.()
      if (!url) {
        notify('missing')
        return () => notify('idle')
      }
      let audio: AudioPlayer
      try {
        audio = createAudio(url)
      } catch {
        notify('error')
        return () => notify('idle')
      }
      let current = true
      const stop = () => finish('idle')
      const playing = () => { if (current) notify('playing') }
      const waiting = () => { if (current) notify('loading') }
      const failed = () => finish(audio.error?.code === 4 ? 'missing' : 'error')
      function finish(state: PlaybackState) {
        if (!current) return
        current = false
        audio.removeEventListener('playing', playing)
        audio.removeEventListener('waiting', waiting)
        audio.removeEventListener('ended', stop)
        audio.removeEventListener('error', failed)
        audio.pause()
        if (active === stop) active = undefined
        notify(state)
      }
      active = stop
      audio.addEventListener('playing', playing)
      audio.addEventListener('waiting', waiting)
      audio.addEventListener('ended', stop)
      audio.addEventListener('error', failed)
      notify('loading')
      try {
        // Safari requires play() in the original user event, with no preceding await.
        void audio.play().catch((error) => {
          if (error?.name === 'NotSupportedError') failed()
          else finish('error')
        })
      } catch {
        finish('error')
      }
      return stop
    },
  }
}
