export type StudyLanguage = 'et-EE' | 'ru-RU'

export function findStudyVoice<T extends Pick<SpeechSynthesisVoice, 'lang'>>(voices: readonly T[], locale: StudyLanguage): T | undefined {
  const tag = (value: string) => value.toLowerCase().replace(/_/g, '-')
  const language = tag(locale).split('-')[0]
  return voices.find((voice) => tag(voice.lang) === tag(locale))
    ?? voices.find((voice) => tag(voice.lang).split('-')[0] === language)
}
