import { lessonSteps } from './readerContent.ts'

export function lessonAudioTexts() {
  return lessonSteps.flatMap((step) => step.kind === 'practice'
    ? step.exercises.flatMap((exercise) => [
      ...(exercise.exampleAudio ? [exercise.exampleAudio] : []),
    ])
    : step.panels.flatMap((panel) => {
      if (panel.kind === 'phrases') return panel.items.map(({ et }) => et.split(' / ').join(' '))
      if (panel.kind === 'examples') return panel.items.map(({ before, accent, after }) => before + accent + after)
      return []
    }))
}
