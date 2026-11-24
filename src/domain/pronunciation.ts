export function findEstonianVoice<T extends Pick<SpeechSynthesisVoice, 'lang'>>(voices: readonly T[]): T | undefined {
  const tag = (value: string) => value.toLowerCase().replace(/_/g, '-')
  return voices.find((voice) => tag(voice.lang) === 'et-ee')
    ?? voices.find((voice) => tag(voice.lang).split('-')[0] === 'et')
}
