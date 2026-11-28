import { WordStudyCard } from './WordStudyCard'
import { useState } from 'react'
import type { IntroWord } from './engine'
import { ReaderAction } from './ReaderLayout'

export function NewWordCard({ actionTarget, word, forms, revealed, onKnow, onLearn, onContinue }: {
  actionTarget: HTMLDivElement | null; word: IntroWord; forms: string[]; revealed: boolean
  onKnow: () => void; onLearn: () => boolean; onContinue: () => void
}) {
  const [unavailable, setUnavailable] = useState(false)

  return <div className="word-intro">
    <h2 className="lesson-accent-heading">Вы знаете это слово?</h2>
    <WordStudyCard prompt={word.et} answer={word.ru} promptLanguage="et" answerLanguage="ru"
      forms={forms} revealed={revealed} note={word.note} />
    <ReaderAction target={actionTarget}>
      {revealed ? <button className="tactile-button tactile-button--primary" type="button" onClick={onContinue}>
        Продолжить
      </button> : <>
        {unavailable && <p className="lesson-feedback" role="status">Слово пока недоступно в словаре. Попробуйте ещё раз после загрузки словаря.</p>}
        <div className="word-intro__actions">
          <button className="tactile-button tactile-button--green" type="button" onClick={onKnow}>Знаю</button>
          <button className="tactile-button word-intro__learn" type="button" onClick={() => setUnavailable(!onLearn())}>Учить</button>
        </div>
      </>}
    </ReaderAction>
  </div>
}
