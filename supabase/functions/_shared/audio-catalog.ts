export const audioBucket = 'takku-tts'
export const maxAudioBytes = 1_048_576
export const phrases = {
  'tere': 'Tere!',
  'tere-hommikust': 'Tere hommikust!',
  'head-aega': 'Head aega!',
  'ma-olen-opetaja': 'Ma olen õpetaja.',
  'ma-ei-ole-opetaja': 'Ma ei ole õpetaja.',
} as const

export function preparedAudioPath(id: string) {
  return `prepared/v1/${id}.mp3`
}
