export function StudyCount({ count }: { count: number }) {
  return <span className="study-count">{count}</span>
}

export function TrainingHome({ total, active, learned, loading, onStart, onOpenCatalog }: {
  total?: number; active: number; learned: number; loading: boolean
  onStart: (mode: 'new' | 'review') => void; onOpenCatalog: () => void
}) {
  return <section className="screen training-home" aria-labelledby="training-heading">
    <h1 id="training-heading">Тренировка</h1>
    <dl className="training-stats">
      <div><dt>Слов</dt><dd>{total ?? '—'}</dd></div>
      <div><dt>Изучаю</dt><dd>{active}</dd></div>
      <div><dt>Выучено</dt><dd>{learned}</dd></div>
    </dl>
    <div className="training-home__actions">
      <button type="button" className="lesson-option" disabled={loading} onClick={() => onStart('new')}>Новые слова</button>
      <button type="button" className="lesson-option" disabled={loading} onClick={() => onStart('review')}>Изучение <StudyCount count={active} /></button>
      <button type="button" className="lesson-option" onClick={onOpenCatalog}>Общий словарь</button>
    </div>
  </section>
}
