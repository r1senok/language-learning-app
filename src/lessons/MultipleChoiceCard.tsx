import { PhraseAudioButton } from './AudioPhrase'
import { ChoiceActionPanel } from './ExerciseActionPanel'
import { multipleChoiceState, multipleChoiceView } from './lessonTemplates'
import { AnswerGrid } from './AnswerGrid'
import type { MultipleChoice } from './engine'

export function MultipleChoiceCard({ actionTarget, exercise, selected, score, onSelect, onCheck, onContinue, onPlayAudio }: {
  actionTarget: HTMLDivElement | null; exercise: MultipleChoice; selected?: string; score?: number
  onSelect: (option: string) => void; onCheck: () => void; onContinue: () => void
  onPlayAudio?: (text: string) => void
}) {
  const view = multipleChoiceView(exercise)
  const speech = view.presentation.kind === 'speech' ? view.presentation : undefined

  return <div className="multiple-choice">
    <h2 className="lesson-accent-heading">{view.instruction}</h2>
    {speech ? <div className="multiple-choice__prompt">
      <img className="multiple-choice__character" src={speech.characterSrc} alt="" />
      <div className="reader-phrase" lang={view.language}>
        <div className="reader-phrase__body"><PhraseAudioButton text={exercise.prompt} onPlayAudio={onPlayAudio} /></div>
      </div>
    </div> : <p className="book-choice-prompt" lang={view.language}>{exercise.prompt}</p>}
    <AnswerGrid className="multiple-choice__options" options={exercise.options} language={view.optionLanguage}
      selected={selected} checked={score !== undefined} onSelect={onSelect}
      result={(id) => multipleChoiceState(exercise, id, selected, score)} />
    <ChoiceActionPanel target={actionTarget} selected={selected} score={score} correctAnswer={view.answerText}
      onCheck={onCheck} onContinue={onContinue} />
  </div>
}
