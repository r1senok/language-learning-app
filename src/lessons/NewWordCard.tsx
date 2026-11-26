import { useState } from 'react'
import type { IntroWord } from './engine'
import { ReaderAction } from './ReaderLayout'

export function NewWordCard({ actionTarget, word, forms, revealed, onKnow, onLearn, onContinue }: {
  actionTarget: HTMLDivElement | null; word: IntroWord; forms: string[]; revealed: boolean
  onKnow: () => void; onLearn: () => boolean; onContinue: () => void
}) {
  const [unavailable, setUnavailable] = useState(false)

  return <div className="word-intro">
    <h2 className="word-intro__question">Вы знаете это слово?</h2>
    <div className="word-intro__card">
      <div className="word-intro__body">
        <p className="word-intro__word" lang="et">{word.et}</p>
        {forms.length > 0 && <ul className="word-intro__forms" lang="et" aria-label="Основные формы">
          {forms.map((form, index) => <li key={index}>{form}</li>)}
        </ul>}
        <div className="word-intro__translation" aria-live="polite">
          {revealed && <><p>{word.ru}</p>{word.note && <small>{word.note}</small>}</>}
        </div>
      </div>
    </div>
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
