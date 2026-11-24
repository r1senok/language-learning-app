export { audioBucket, phrases } from '../_shared/audio-catalog.ts'
export const defaultVoice = 'et-EE-Standard-A'
export function isVoice(voice: string) {
  return voice === defaultVoice || /^et-EE-Chirp3-HD-[A-Za-z]{1,40}$/.test(voice)
}

export function audioPath(voice: string, id: string) {
  return `v1/${voice}/${id}.mp3`
}
