import type { BookChoice, Exercise, FillBlank, MultipleChoice, WordOrderExercise } from './engine.ts'

export function exerciseTemplate(exercise: { kind: string; book?: { mode?: string } }) {
  switch (exercise.kind) {
    case 'multiple_choice': {
      const mode = exercise.book?.mode
      if (mode === 'gap') return 'fill_blank'
      if (mode === undefined || mode === 'translate') return 'multiple_choice'
      return 'unsupported'
    }
    case 'word_intro': return 'word_intro'
    case 'matching_pairs': return 'matching_pairs'
    case 'fill_blank': return 'fill_blank'
    case 'word_order': return 'word_order'
    default: return 'unsupported'
  }
}

export function isMultipleChoice(exercise?: Exercise): exercise is MultipleChoice {
  return exercise?.kind === 'multiple_choice' && exerciseTemplate(exercise) === 'multiple_choice'
}

export function isFillBlank(exercise?: Exercise): exercise is FillBlank | (BookChoice & { book: { mode: 'gap' } }) {
  return !!exercise && exerciseTemplate(exercise) === 'fill_blank'
}

export function usesChoiceDraft(exercise?: Exercise): exercise is MultipleChoice | WordOrderExercise | FillBlank {
  return isFillBlank(exercise) || isMultipleChoice(exercise) || exercise?.kind === 'word_order'
}

export function multipleChoiceView(exercise: MultipleChoice) {
  const presentation = exercise.presentation ?? (exercise.book?.mode === 'translate' ? { kind: 'speech' as const } : { kind: 'text' as const })
  return {
    optionSize: exercise.options.length > 4 ? 'compact' : 'large',
    instruction: exercise.instruction ?? exercise.book?.heading ?? 'Выберите ответ',
    language: exercise.promptLanguage ?? exercise.book?.language,
    optionLanguage: exercise.optionLanguage ?? (exercise.book ? 'et' : undefined),
    presentation: presentation.kind === 'speech'
      ? { kind: 'speech' as const, silent: presentation.silent, characterSrc: presentation.characterSrc ?? '/lesson-translation-character.svg' }
      : { kind: 'text' as const },
    answerText: exercise.showCorrectAnswer === false ? undefined :
      (exercise.accepted ?? [exercise.correct]).map((id) => exercise.options.find((option) => option.id === id)?.text)
        .filter(Boolean).join(' / '),
  }
}

export function multipleChoiceState(exercise: MultipleChoice, id: string, selected?: string, score?: number) {
  if (score === undefined) return id === selected ? 'selected' : undefined
  if (score === 1) return id === selected ? 'correct' : undefined
  if (id === selected) return 'incorrect'
  return (exercise.accepted ?? [exercise.correct]).includes(id) ? 'correct' : undefined
}
