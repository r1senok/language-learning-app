export function WordStudyCard({ prompt, answer, promptLanguage, answerLanguage, formsLanguage = promptLanguage,
  forms, revealed, note }: {
  prompt: string; answer: string; promptLanguage: string; answerLanguage: string
  formsLanguage?: string; forms: string[]; revealed: boolean; note?: string
}) {
  return <div className="word-intro__card">
    <div className="word-intro__body">
      <p className="word-intro__word" lang={promptLanguage}>{prompt}</p>
      {forms.length > 0 && <ul className="word-intro__forms" lang={formsLanguage} aria-label="Основные формы">
        {forms.map((form, index) => <li key={index}>{form}</li>)}
      </ul>}
      <div className="word-intro__translation" aria-live="polite" lang={answerLanguage}>
        {revealed && <><p>{answer}</p>{note && <small>{note}</small>}</>}
      </div>
    </div>
  </div>
}
