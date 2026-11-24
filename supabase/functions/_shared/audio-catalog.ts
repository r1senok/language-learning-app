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

const normalize = (text: string) => text.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[!.]$/, '')
const pilotIds = new Map(Object.entries(phrases).map(([id, text]) => [normalize(text), id]))

export function preparedAudioId(text: string) {
  const normalized = normalize(text)
  const pilot = pilotIds.get(normalized)
  if (pilot) return pilot
  const bytes = new TextEncoder().encode(normalized)
  // Leave room for the prefix and extension within local filesystem filename limits.
  if (!bytes.length || bytes.length > 180) return undefined
  return `et-${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}
