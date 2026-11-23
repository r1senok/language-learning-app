import { useState } from 'react'
import { Link } from 'react-router'
import { asStudyWord } from '../study/catalog-words'
import { StudyStorageNotice, useStudy } from '../study/StudyProvider'
import { categories, demoVocabulary } from './demo-data'
import { filterVocabulary } from './filter-vocabulary'

const categoryNames = new Map(categories.map(({ id, name }) => [id, name]))

export function CatalogPage() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const { session, ready, busy, add } = useStudy()
  const selectedWords = demoVocabulary.filter(({ id }) => selected.includes(id) && !session.progress[id])
  const entries = filterVocabulary(demoVocabulary, query, categoryId)

  return (
    <>
      <section className="catalog-banner" aria-labelledby="catalog-heading">
        <div className="language-pair">Эстонский <span aria-hidden="true">→</span> Русский</div>
        <h1 id="catalog-heading">Эстонский словарь</h1>
        <p>Демонстрационная подборка слов на каждый день.</p>
        <span className="banner-letter" aria-hidden="true">Õ</span>
      </section>

      <section className="mt-8 sm:mt-10" aria-label="Поиск и результаты">
        <label className="mb-2 block text-sm font-semibold" htmlFor="vocabulary-search">Поиск по словарю</label>
        <div className="search-box">
          <span className="search-icon" aria-hidden="true" />
          <input
            id="vocabulary-search"
            type="search"
            placeholder="Слово по-эстонски или по-русски"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <fieldset className="mt-4 flex min-w-0 flex-wrap gap-2">
          <legend className="sr-only">Тематическая категория</legend>
          {[{ id: null, name: 'Все темы' }, ...categories].map(({ id, name }) => (
            <label key={id ?? 'all'} className="filter-option">
              <input
                className="sr-only"
                type="radio"
                name="category"
                checked={categoryId === id}
                onChange={() => setCategoryId(id)}
              />
              <span>{name}</span>
            </label>
          ))}
        </fieldset>

        <StudyStorageNotice />
        <div className="catalog-actions">
          <button
            className="action-button primary-button"
            type="button"
            disabled={!ready || busy || !selectedWords.length}
            onClick={async () => {
              if (await add(selectedWords.map(asStudyWord))) {
                setSelected((ids) => ids.filter((id) => !selectedWords.some((word) => word.id === id)))
              }
            }}
          >
            Изучать выбранные ({selectedWords.length})
          </button>
          {ready && session.queue.length > 0 && (
            <Link className="action-button" to="/study">К тренировке ({session.queue.length})</Link>
          )}
        </div>
        <div className="results-heading">
          <h2 className="text-xl font-bold">Слова</h2>
          <p className="text-sm text-muted" role="status">Найдено: {entries.length}</p>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <h3 className="font-semibold">Слова не найдены</h3>
            <p className="mt-1 text-sm text-muted">Попробуйте изменить запрос или выбрать другую тему.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Словарные записи">
            {entries.map((entry) => {
              const state = session.progress[entry.id]?.state
              const status = state === 'learned' ? 'Выучено' : state ? 'Изучаю' : 'Новое'
              return (
                <li className="word-card" key={entry.id}>
                  <span className="word-emoji" aria-hidden="true">{entry.hintEmojis?.join(' ')}</span>
                  <div className="word-details">
                    <h3 className="break-words text-lg font-bold" lang={entry.languageCode}>{entry.lemma}</h3>
                    <p className="text-sm text-muted">{entry.translations.map(({ text }) => text).join(', ')}</p>
                    <p className="word-theme">{entry.categoryIds.map((id) => categoryNames.get(id)).join(' · ')}</p>
                    {ready && <p className="word-status" data-state={state ?? 'new'}>{status}</p>}
                    {ready && !state && (
                      <div className="word-actions">
                        <button
                          className="action-button"
                          type="button"
                          disabled={busy}
                          aria-label={`Изучать ${entry.lemma}`}
                          onClick={async () => {
                            if (await add([asStudyWord(entry)])) {
                              setSelected((ids) => ids.filter((id) => id !== entry.id))
                            }
                          }}
                        >
                          Изучать
                        </button>
                        <label className="word-select">
                          <input
                            type="checkbox"
                            aria-label={`Выбрать ${entry.lemma}`}
                            checked={selected.includes(entry.id)}
                            onChange={(event) => {
                              const { checked } = event.currentTarget
                              setSelected((ids) => checked ? [...ids, entry.id] : ids.filter((id) => id !== entry.id))
                            }}
                          />
                          Выбрать
                        </label>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
