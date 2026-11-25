import type { lessonResult } from './engine'

export function LessonResult({ summary }: { summary: ReturnType<typeof lessonResult> }) {
  const { correct, total, errors, percent, best } = summary
  return <div className="reader-result">
    <img src="/takku-dachshund.png" alt="" />
    <h2>Урок завершён!</h2>
    <p>{percent === 100 ? 'Отличная работа! Все ответы верны.' :
      percent >= 70 ? 'Здорово получилось! Продолжай в том же духе.' :
        'Ты прошёл урок! С каждой попыткой будет легче.'}</p>
    <strong className="reader-result__percent" aria-label={`Правильных ответов: ${percent}%`}>{percent}%</strong>
    <dl className="reader-result__stats">
      <div><dt>Правильных ответов</dt><dd>{correct} из {total}</dd></div>
      <div><dt>Ошибок</dt><dd>{errors}</dd></div>
      <div><dt>Лучший результат</dt><dd>{best}%</dd></div>
    </dl>
  </div>
}
