import { PhraseAudioButton } from './AudioPhrase'

export function QuestionPrompt({ text, language, characterSrc = '/lesson-translation-character.svg', onPlayAudio, plain = false }: {
  text: string; language?: 'et' | 'ru'; characterSrc?: string; onPlayAudio?: (text: string) => void; plain?: boolean
}) {
  return <div className="question-prompt">
    <img className="question-prompt__character" src={characterSrc} alt="" />
    <div className="reader-phrase" lang={language}>
      <div className="reader-phrase__body">{plain ? <span className="question-prompt__text">{text}</span> : <PhraseAudioButton text={text} onPlayAudio={onPlayAudio} />}</div>
    </div>
  </div>
}
