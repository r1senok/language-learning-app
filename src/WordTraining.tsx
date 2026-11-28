import { useEffect, useRef, useState } from 'react'
import { ReaderAction, ReaderHeader } from './lessons/ReaderLayout'
import { WordStudyCard } from './lessons/WordStudyCard'
import { studyGrammarRows } from './domain/grammar'
import type { Word } from './types'

export function wordForms(word: Word) {
  const forms = studyGrammarRows(word.partOfSpeech, word.grammaticalForms).map(({ value }) => value)
  return forms.length ? forms : word.forms?.split(', ').filter(Boolean) ?? []
}

export function WordTraining({ mode, word, total, completed, catalogEmpty, allLearned, onClose, onClassify, onReview, onNext }: {
  mode: 'new' | 'review'; word?: Word; total: number; completed: number; catalogEmpty: boolean; allLearned: boolean; onClose: () => void
  onClassify: (known: boolean) => boolean; onReview: (known: boolean) => boolean; onNext: () => void
}) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const discovery = mode === 'new'
  const reverse = !discovery && word?.progress === 2
  const scroll = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scroll.current?.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [word?.id, reverse])
  const emptyTitle = catalogEmpty && discovery ? 'Общий словарь пока пуст'
    : allLearned ? 'Все доступные слова выучены'
    : discovery ? 'Больше нет новых слов'
    : completed ? 'Слова этой тренировки выучены' : 'Пока нечего изучать'

  function advance() {
    setRevealed(false)
    onNext()
  }

  return <section className="lesson-reader lesson-reader--word-intro word-training" aria-labelledby="reader-heading"
    onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
    <ReaderHeader title={discovery ? 'Новые слова' : 'Изучение'} headingRef={heading} onClose={onClose}
      progress={total > 0 ? { total, completed, label: 'Прогресс тренировки' } : undefined} />
    <div className="reader-scroll" ref={scroll}><div className="reader-content"><div className="reader-panel">
      {word ? <div className="word-intro">
        <div className="word-training__prompt">
          <h2 className="lesson-accent-heading">{discovery ? 'Вы знаете это слово?' : 'Вспомните перевод'}</h2>
          {!discovery && <span className="reader-instruction">{reverse ? 'RU → ET' : 'ET → RU'}</span>}
        </div>
        <WordStudyCard prompt={reverse ? word.russian : word.estonian} answer={reverse ? word.estonian : word.russian}
          promptLanguage={reverse ? 'ru' : 'et'} answerLanguage={reverse ? 'et' : 'ru'} formsLanguage="et"
          forms={reverse && !revealed ? [] : wordForms(word)} revealed={revealed} />
      </div> : <div className="complete-state">
        <h2>{emptyTitle}</h2>
        <p>{catalogEmpty && discovery ? 'Опубликованные слова появятся в общем словаре.'
          : allLearned ? 'В общем словаре можно вернуть слово в изучение.'
          : discovery ? 'Проверьте очередь изучения или откройте общий словарь.'
          : 'Добавьте слова из общего словаря или начните знакомство с новыми словами.'}</p>
      </div>}
    </div></div></div>
    <div className="reader-action" ref={setTarget} />
    <ReaderAction target={target}>
      {!word ? <button type="button" className="tactile-button tactile-button--primary" onClick={onClose}>К тренировке</button>
        : discovery && !revealed ? <div className="word-intro__actions">
          <button type="button" className="tactile-button tactile-button--green" onClick={() => onClassify(true)}>Знаю</button>
          <button type="button" className="tactile-button word-intro__learn" onClick={() => { if (onClassify(false)) setRevealed(true) }}>Учить</button>
        </div> : !discovery && revealed ? <div className="word-intro__actions">
          <button type="button" className="tactile-button word-intro__learn" onClick={() => { if (onReview(false)) setRevealed(false) }}>Не выучил</button>
          <button type="button" className="tactile-button tactile-button--green" onClick={() => { if (onReview(true)) setRevealed(false) }}>Выучил</button>
        </div> : <button type="button" className="tactile-button tactile-button--primary"
          onClick={discovery ? advance : () => setRevealed(true)}>{discovery ? 'Продолжить' : 'Показать перевод'}</button>}
    </ReaderAction>
  </section>
}
