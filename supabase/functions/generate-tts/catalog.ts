export const audioBucket = 'takku-tts'
export const defaultVoice = 'et-EE-Standard-A'
export const phrases = {
  'tere': 'Tere!',
  'tere-hommikust': 'Tere hommikust!',
  'head-aega': 'Head aega!',
  'ma-olen-opetaja': 'Ma olen õpetaja.',
  'ma-ei-ole-opetaja': 'Ma ei ole õpetaja.',
} as const

export function isVoice(voice: string) {
  return voice === defaultVoice || /^et-EE-Chirp3-HD-[A-Za-z]{1,40}$/.test(voice)
}

export function audioPath(voice: string, id: string) {
  return `v1/${voice}/${id}.mp3`
}
