import { QuestionPrompt } from './QuestionPrompt'
import { ChoiceActionPanel } from './ExerciseActionPanel'
import { shuffledWordBank } from './wordBank'
import { wordOrderReady } from './engine'
import type { WordOrderExercise } from './engine'

export function WordOrder({ exercise, attemptSeed, order, score, actionTarget, onOrder, onCheck, onContinue, onPlayAudio }: {
  exercise: WordOrderExercise; attemptSeed: string; order: string[]; score?: number; actionTarget: HTMLDivElement | null
  onOrder: (order: string[]) => void; onCheck: () => void; onContinue: () => void; onPlayAudio?: (text: string) => void
}) {
  const bank = shuffledWordBank(exercise.id, exercise.options, exercise.order, attemptSeed)
  const labels = new Map(exercise.options.map(({ id, text }) => [id, text]))
  const checked = score !== undefined
  const complete = wordOrderReady(exercise, order.length)

  return <div className="word-order">
    <h2 className="lesson-accent-heading">Переведите предложение</h2>
    {exercise.context && <p>{exercise.context}</p>}
    <QuestionPrompt text={exercise.prompt} plain={exercise.silent} language={exercise.book?.language ?? 'ru'} onPlayAudio={onPlayAudio} />
    <div className="word-order__answer" role="group" aria-label="Собранное предложение">
      {order.map((id) => <button className="lesson-option word-order__chip" type="button" key={id} lang="et"
        disabled={checked} onClick={() => onOrder(order.filter((part) => part !== id))}>{labels.get(id)}</button>)}
    </div>
    <div className="word-order__bank" role="group" aria-label="Банк слов">
      {bank.map(({ id, text }) => order.includes(id)
        ? <span key={id} className="lesson-option word-order__chip word-order__placeholder" aria-hidden="true"><span>{text}</span></span>
        : <button key={id} className="lesson-option word-order__chip" type="button" lang="et" disabled={checked || order.length >= Math.max(exercise.order.length, ...exercise.alternativeOrders?.map((sequence) => sequence.length) ?? [])}
          onClick={() => onOrder([...order, id])}>{text}</button>)}
    </div>
    <ChoiceActionPanel target={actionTarget} ready={complete} score={score}
      correctAnswer={[exercise.order, ...exercise.alternativeOrders ?? []].map((sequence) => sequence.map((id) => labels.get(id)).join(' ')).join(' / ')} onCheck={onCheck} onContinue={onContinue} />
  </div>
}
