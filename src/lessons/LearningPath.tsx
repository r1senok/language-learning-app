import { Icon } from '../Icon'
import { learningPath } from './learningPath'
import type { PathLesson } from './learningPath'

export function LearningPath({ lessons, onOpen }: { lessons: readonly PathLesson[]; onOpen: (key: number | string) => void }) {
  const path = learningPath(lessons)

  return <ol className="learning-path" aria-label="Уроки">
    {path.map(({ number, title, status, available, progress, started, checkpointId, subtitle }, index) => {
      const current = status === 'current'
      const completed = status === 'completed'
      const locked = status === 'locked'
      const next = path[index + 1]
      const key = checkpointId ?? number
      const label = checkpointId ? title : `Урок ${number}. ${title}`

      return <li key={key} className="learning-path__lesson" data-status={status}
        aria-current={current ? 'step' : undefined}>
        {next && <span className="learning-path__connector" data-status={next.status} aria-hidden="true" />}
        <div className="learning-path__rail">
          {current && <svg className="learning-path__ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="46" />
            {progress > 0 && <circle cx="50" cy="50" r="46" pathLength="100"
              strokeDasharray={`${progress} 100`} transform="rotate(-90 50 50)" />}
          </svg>}
          <span className="learning-path__node" aria-hidden="true">
            {completed ? <svg viewBox="0 0 24 24"><path d="m4 12 5 5L20 6" /></svg> : checkpointId ? <Icon name="book" /> : number}
            {locked && <span className="learning-path__lock"><Icon name="lock" /></span>}
          </span>
        </div>
        {current ? <button type="button" className="learning-path__active" onClick={() => onOpen(key)}
          aria-label={`${label}. Пройдено ${progress}%. ${started ? 'Продолжить' : 'Начать'}`}>
          <span>{title}{subtitle && <small className="learning-path__subtitle">{subtitle}</small>}</span>
          <span className="learning-path__cta">{started ? 'Продолжить' : 'Начать'}</span>
        </button> : completed && available ? <button type="button" className="learning-path__label"
          aria-label={`${label}. Завершён. Открыть повторно`} onClick={() => onOpen(key)}>{title}</button>
          : <span className="learning-path__label">
            <span className="sr-only">{checkpointId ? "" : `Урок ${number}. `}{locked ? "Заблокирован. " : "Завершён. "}</span>{title}
          </span>}
      </li>
    })}
  </ol>
}
