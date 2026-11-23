import { useState } from 'react'
import { Link } from 'react-router'
import { demoVocabulary } from '../catalog/demo-data'
import { filterVocabulary } from '../catalog/filter-vocabulary'
import { asStudyWord } from '../study/catalog-words'
import { StudyStorageNotice, useStudy } from '../study/StudyProvider'

export function LearnedPage() {
  const [query, setQuery] = useState('')
  const { session, ready, busy, restore } = useStudy()
  const learned = demoVocabulary.filter(({ id }) => session.progress[id]?.state === 'learned')
  const entries = filterVocabulary(learned, query, null)

  return (
    <section aria-labelledby="learned-heading">
      <div className="results-heading trainer-heading">
        <h1 id="learned-heading">Изученное</h1>
        {ready && <p className="text-sm text-muted" role="status">Выучено: {learned.length}</p>}
      </div>
      <StudyStorageNotice />
      {ready && (learned.length ? (
        <>
          <label className="mb-2 block text-sm font-semibold" htmlFor="learned-search">Поиск по выученным словам</label>
          <div className="search-box mb-4">
            <span className="search-icon" aria-hidden="true" />
            <input id="learned-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder="Слово по-эстонски или по-русски" />
          </div>
          {entries.length ? (
            <ul className="grid gap-3 sm:grid-cols-2" aria-label="Выученные слова">
              {entries.map((entry) => (
                <li className="word-card" key={entry.id}>
                  <span className="word-emoji" aria-hidden="true">{entry.hintEmojis?.join(' ')}</span>
                  <div className="word-details">
                    <h2 className="break-words text-lg font-bold" lang={entry.languageCode}>{entry.lemma}</h2>
                    <p className="text-sm text-muted">{entry.translations.map(({ text }) => text).join(', ')}</p>
                    <button className="action-button mt-3" disabled={busy} onClick={() => void restore(asStudyWord(entry))}>
                      Вернуть в изучение
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="empty-state">Слова не найдены.</p>}
        </>
      ) : (
        <div className="empty-state">
          <h2 className="font-semibold">Здесь появятся выученные слова</h2>
          <Link className="action-button primary-button mt-4" to="/study">К тренировке</Link>
        </div>
      ))}
    </section>
  )
}
