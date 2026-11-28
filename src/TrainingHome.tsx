export function TrainingHome({ active, learned, loading, onStart, onOpenCatalog }: {
  active: number; learned: number; loading: boolean; onStart: (mode: 'new' | 'review') => void; onOpenCatalog: () => void
}) {
  return <section className="screen training-home" aria-labelledby="training-heading">
    <h1 id="training-heading">Тренировка</h1>
    <dl className="profile-stats">
      <div><dt>Изучаю</dt><dd>{active}</dd></div>
      <div><dt>Выучено</dt><dd>{learned}</dd></div>
    </dl>
    <button type="button" className="tactile-button tactile-button--primary" disabled={loading} onClick={() => onStart('new')}>Новые слова</button>
    <button type="button" className="tactile-button tactile-button--primary" disabled={loading} onClick={() => onStart('review')}>Изучение</button>
    <button type="button" className="profile-secondary" onClick={onOpenCatalog}>Общий словарь</button>
  </section>
}
