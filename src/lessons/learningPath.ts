export type PathLesson = {
  number: number
  title: string
  available: boolean
  completed: boolean
  progress: number
  started: boolean
}

export function learningPath(lessons: readonly PathLesson[]) {
  const next = lessons.find((lesson) => !lesson.completed)
  return lessons.map((lesson) => ({
    ...lesson,
    status: lesson.completed ? 'completed' as const : lesson === next && lesson.available ? 'current' as const : 'locked' as const,
  }))
}
