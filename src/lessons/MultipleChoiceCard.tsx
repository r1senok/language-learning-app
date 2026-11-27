import { QuestionPrompt } from './QuestionPrompt'
import { shuffledOptions } from './wordBank'
import { ChoiceActionPanel } from './ExerciseActionPanel'
import { multipleChoiceState, multipleChoiceView } from './lessonTemplates'
import { AnswerGrid } from './AnswerGrid'
import type { MultipleChoice } from './engine'

export function MultipleChoiceCard({ actionTarget, exercise, attemptSeed, selected, score, onSelect, onCheck, onContinue, onPlayAudio }: {
  actionTarget: HTMLDivElement | null; exercise: MultipleChoice; attemptSeed: string; selected?: string; score?: number
  onSelect: (option: string) => void; onCheck: () => void; onContinue: () => void
  onPlayAudio?: (text: string) => void
}) {
  const view = multipleChoiceView(exercise)
  const speech = view.presentation.kind === 'speech' ? view.presentation : undefined

  return <div className="multiple-choice">
    <h2 className="lesson-accent-heading">{view.instruction}</h2>
    {speech ? <QuestionPrompt text={exercise.prompt} language={view.language}
      characterSrc={speech.characterSrc} onPlayAudio={onPlayAudio} /> : <p className="book-choice-prompt" lang={view.language}>{exercise.prompt}</p>}
    <AnswerGrid className="multiple-choice__options" options={shuffledOptions(exercise.options, `${attemptSeed}:${exercise.id}`)} language={view.optionLanguage}
      selected={selected} checked={score !== undefined} onSelect={onSelect}
      result={(id) => multipleChoiceState(exercise, id, selected, score)} />
    <ChoiceActionPanel target={actionTarget} ready={Boolean(selected)} score={score} correctAnswer={view.answerText}
      onCheck={onCheck} onContinue={onContinue} />
  </div>
}
