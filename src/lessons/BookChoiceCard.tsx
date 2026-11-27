import { MultipleChoiceCard } from './MultipleChoiceCard'
import { FillInBlank } from './FillInBlank'
import { WordOrder } from './WordOrder'
import type { ReactNode } from 'react'
import { isFillBlank, isMultipleChoice } from './lessonTemplates'
import type { FillBlank, MultipleChoice, WordOrderExercise } from './engine'

export function BookChoiceCard({ exercise, order, reference, onOrder, ...choice }: {
  actionTarget: HTMLDivElement | null; exercise: FillBlank | MultipleChoice | WordOrderExercise
  attemptSeed: string; reference?: ReactNode; selected?: string; order: string[]; score?: number
  onSelect: (option: string) => void; onOrder: (order: string[]) => void
  onCheck: () => void; onContinue: () => void
}) {
  if (isFillBlank(exercise)) return <FillInBlank exercise={exercise} reference={reference} {...choice} />
  if (exercise.kind === 'word_order') return <WordOrder exercise={exercise} order={order} onOrder={onOrder} {...choice} />
  if (isMultipleChoice(exercise)) return <MultipleChoiceCard exercise={exercise} {...choice} />
  return null
}
