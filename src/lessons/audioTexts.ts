import { lessonSteps } from './readerContent.ts'
import type { TheoryPanel } from './readerContent.ts'

function panelAudioTexts(panel: TheoryPanel): string[] {
  if (panel.kind === 'content-group') return panel.panels.flatMap(panelAudioTexts)
  if (panel.kind === 'phrases') return panel.items.map(({ et }) => et.split(' / ').join(' '))
  const examples = panel.kind === 'example' ? [panel.item] : panel.kind === 'example-group' ? panel.items : panel.kind === 'dialogue-group' ? panel.dialogues.flat() : []
  return examples.map(({ before, accent, after }) => before + accent + after)
}

export function lessonAudioTexts() {
  return lessonSteps.flatMap((step) => step.kind === 'practice'
    ? step.exercises.flatMap((exercise) => exercise.exampleAudio ? [exercise.exampleAudio] : [])
    : step.panels.flatMap(panelAudioTexts))
}
