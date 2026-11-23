import { useEffect, useMemo, useRef, useState } from 'react'
import { advanceProgress, completesActiveSession, requeueAfterAnswer, setWordProgress } from './domain/learning'
import { cloudCapability, supabaseSetup } from './services/cloudSync'
import { loadGuestProgress, saveGuestProgress } from './services/localProgress'
import type { Category, Progress, Word } from './types'

type PrimaryTab = 'library' | 'vocabulary' | 'profile'
type VocabularyTab = 'dictionary' | 'study' | 'learned'

const starterWords: Word[] = [
  { id: 1, estonian: 'päike', russian: 'солнце', emojis: ['☀️'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'päikese, päikest', progress: 1 },
  { id: 2, estonian: 'uudishimulik', russian: 'любопытный', emojis: ['🧐', '✨'], category: 'Характер', partOfSpeech: 'прил.', forms: 'uudishimuliku', progress: 2 },
  { id: 3, estonian: 'reis', russian: 'путешествие', emojis: ['🧳', '🗺️'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'reisi, reisi', progress: 0 },
  { id: 4, estonian: 'hubane', russian: 'уютный', emojis: ['🧶', '🕯️'], category: 'Дом', partOfSpeech: 'прил.', forms: 'hubase', progress: 0 },
  { id: 5, estonian: 'merikarp', russian: 'морская ракушка', emojis: ['🐚', '🌊'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'merikarbi, merikarpi', progress: 0 },
  { id: 6, estonian: 'maitsev', russian: 'вкусный', emojis: ['🥞', '😋'], category: 'Еда', partOfSpeech: 'прил.', forms: 'maitsva', progress: 3 },
  { id: 7, estonian: 'tuul', russian: 'ветер', emojis: ['🍃', '💨'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'tuule, tuult', progress: 3 },
  { id: 8, estonian: 'pagarikoda', russian: 'пекарня', emojis: ['🥐', '🍞'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'pagarikoja, pagarikoda', progress: 0 },
  { id: 9, estonian: 'mets', russian: 'лес', emojis: ['🌲', '🍄'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'metsa, metsa', progress: 0 },
  { id: 10, estonian: 'järv', russian: 'озеро', emojis: ['🏞️', '💧'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'järve, järve', progress: 0 },
  { id: 11, estonian: 'lill', russian: 'цветок', emojis: ['🌷', '🌼'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'lille, lille', progress: 0 },
  { id: 12, estonian: 'vihm', russian: 'дождь', emojis: ['🌧️', '☔'], category: 'Природа', partOfSpeech: 'сущ.', forms: 'vihma, vihma', progress: 0 },
  { id: 13, estonian: 'lahke', russian: 'добрый', emojis: ['🤗', '💚'], category: 'Характер', partOfSpeech: 'прил.', forms: 'lahke', progress: 0 },
  { id: 14, estonian: 'julge', russian: 'смелый', emojis: ['🦁', '💪'], category: 'Характер', partOfSpeech: 'прил.', forms: 'julge', progress: 0 },
  { id: 15, estonian: 'rahulik', russian: 'спокойный', emojis: ['😌', '🌿'], category: 'Характер', partOfSpeech: 'прил.', forms: 'rahuliku', progress: 0 },
  { id: 16, estonian: 'rõõmus', russian: 'радостный', emojis: ['😊', '🎈'], category: 'Характер', partOfSpeech: 'прил.', forms: 'rõõmsa', progress: 0 },
  { id: 17, estonian: 'sõbralik', russian: 'дружелюбный', emojis: ['👋', '🙂'], category: 'Характер', partOfSpeech: 'прил.', forms: 'sõbraliku', progress: 0 },
  { id: 18, estonian: 'lennujaam', russian: 'аэропорт', emojis: ['✈️', '🧳'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'lennujaama, lennujaama', progress: 0 },
  { id: 19, estonian: 'rong', russian: 'поезд', emojis: ['🚆'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'rongi, rongi', progress: 0 },
  { id: 20, estonian: 'pilet', russian: 'билет', emojis: ['🎫'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'pileti, piletit', progress: 0 },
  { id: 21, estonian: 'kohver', russian: 'чемодан', emojis: ['🧳'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'kohvri, kohvrit', progress: 0 },
  { id: 22, estonian: 'kaart', russian: 'карта', emojis: ['🗺️', '📍'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'kaardi, kaarti', progress: 0 },
  { id: 23, estonian: 'hotell', russian: 'гостиница', emojis: ['🏨', '🛏️'], category: 'Путешествия', partOfSpeech: 'сущ.', forms: 'hotelli, hotelli', progress: 0 },
  { id: 24, estonian: 'leib', russian: 'хлеб', emojis: ['🍞'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'leiva, leiba', progress: 0 },
  { id: 25, estonian: 'juust', russian: 'сыр', emojis: ['🧀'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'juustu, juustu', progress: 0 },
  { id: 26, estonian: 'maasikas', russian: 'клубника', emojis: ['🍓'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'maasika, maasikat', progress: 0 },
  { id: 27, estonian: 'hommikusöök', russian: 'завтрак', emojis: ['🍳', '☕'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'hommikusöögi, hommikusööki', progress: 0 },
  { id: 28, estonian: 'kohv', russian: 'кофе', emojis: ['☕'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'kohvi, kohvi', progress: 0 },
  { id: 29, estonian: 'õun', russian: 'яблоко', emojis: ['🍎'], category: 'Еда', partOfSpeech: 'сущ.', forms: 'õuna, õuna', progress: 0 },
  { id: 30, estonian: 'aken', russian: 'окно', emojis: ['🪟', '☀️'], category: 'Дом', partOfSpeech: 'сущ.', forms: 'akna, akent', progress: 0 },
  { id: 31, estonian: 'köök', russian: 'кухня', emojis: ['🍳', '🏠'], category: 'Дом', partOfSpeech: 'сущ.', forms: 'köögi, kööki', progress: 0 },
  { id: 32, estonian: 'voodi', russian: 'кровать', emojis: ['🛏️', '😴'], category: 'Дом', partOfSpeech: 'сущ.', forms: 'voodi, voodit', progress: 0 },
  { id: 33, estonian: 'raamat', russian: 'книга', emojis: ['📚'], category: 'Дом', partOfSpeech: 'сущ.', forms: 'raamatu, raamatut', progress: 0 },
  { id: 34, estonian: 'võti', russian: 'ключ', emojis: ['🔑'], category: 'Дом', partOfSpeech: 'сущ.', forms: 'võtme, võtit', progress: 0 },
  { id: 35, estonian: 'tere', russian: 'привет', emojis: ['👋', '🙂'], category: 'Общение', partOfSpeech: 'межд.', progress: 0 },
  { id: 36, estonian: 'aitäh', russian: 'спасибо', emojis: ['🙏', '💚'], category: 'Общение', partOfSpeech: 'межд.', progress: 0 },
  { id: 37, estonian: 'palun', russian: 'пожалуйста', emojis: ['🤲'], category: 'Общение', partOfSpeech: 'нареч.', progress: 0 },
  { id: 38, estonian: 'vabandust', russian: 'извините', emojis: ['😅', '🙏'], category: 'Общение', partOfSpeech: 'межд.', progress: 0 },
  { id: 39, estonian: 'kohtumiseni', russian: 'до встречи', emojis: ['👋', '🕐'], category: 'Общение', partOfSpeech: 'выражение', progress: 0 },
  { id: 40, estonian: 'kuidas läheb?', russian: 'как дела?', emojis: ['💬', '😊'], category: 'Общение', partOfSpeech: 'выражение', progress: 0 },
  { id: 41, estonian: 'armastama', russian: 'любить', emojis: ['❤️', '🤗'], category: 'Общение', partOfSpeech: 'глаг.', forms: 'armastada, armastan', progress: 0 },
  { id: 42, estonian: 'õppima', russian: 'учиться', emojis: ['📖', '✏️'], category: 'Общение', partOfSpeech: 'глаг.', forms: 'õppida, õpin', progress: 0 },
]

const categories = [
  { label: 'Все', icon: '✦' }, { label: 'Природа', icon: '🌿' }, { label: 'Характер', icon: '✨' },
  { label: 'Путешествия', icon: '🗺️' }, { label: 'Еда', icon: '🍓' }, { label: 'Дом', icon: '🏠' }, { label: 'Общение', icon: '💬' },
]

const statusOf = (word: Word) => word.progress === 0 ? 'new' : word.progress === 3 ? 'learned' : 'studying'
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5)
const learnedCountLabel = (count: number) => {
  const lastTwo = count % 100
  const last = count % 10
  const noun = last === 1 && lastTwo !== 11 ? 'слово' : last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'слова' : 'слов'
  return `${count} ${noun} выучено`
}

function Icon({ name }: { name: 'book' | 'cards' | 'check' | 'search' | 'volume' | 'plus' | 'close' | 'bulb' | 'eye' | 'undo' | 'library' | 'profile' | 'lock' | 'cloud' }) {
  const paths = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" /></>,
    cards: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h4" /><path d="M3 7v10a3 3 0 0 0 3 3" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.7 2.7L16.5 9" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></>,
    volume: <><path d="M5 10v4h3l4 4V6L8 10z" /><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" /></>,
    plus: <path d="M12 5v14M5 12h14" />, close: <path d="m6 6 12 12M18 6 6 18" />,
    bulb: <><path d="M9 18h6M10 21h4" /><path d="M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .7-1.5 1.5-1.5 2.5h-4c0-1-.5-1.8-1.5-2.5z" /></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5z" /><circle cx="12" cy="12" r="2.5" /></>,
    undo: <><path d="M9 7 4 12l5 5" /><path d="M5 12h8a6 6 0 0 1 6 6" /></>,
    library: <><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M7 16h12M9 8h6M9 11h4" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    cloud: <path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.4 9 4.5 4.5 0 0 0 7 18z" />,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>
}

function Mascot({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return <img className={`mascot ${small ? 'mascot--small' : ''} ${className}`.trim()} src="/takku-dachshund.png" alt="" aria-hidden="true" />
}

function FutureLessonCard({ number, title }: { number: string; title: string }) {
  return <div className="future-lesson"><span>{number}</span><div><b>{title}</b><small>Скоро</small></div><Icon name="lock" /></div>
}

function FutureBookCard({ color, icon, title, subtitle }: { color: string; icon: string; title: string; subtitle: string }) {
  return <article className="future-book" style={{ '--book-color': color } as React.CSSProperties}>
    <div className="future-book__cover"><span>{icon}</span><i><Icon name="lock" /></i></div>
    <div className="future-book__copy"><span className="coming-label">СКОРО</span><h3>{title}</h3><p>{subtitle}</p></div>
  </article>
}

function VocabularyNavigation({ active, studyingCount, onChange }: { active: VocabularyTab; studyingCount: number; onChange: (tab: VocabularyTab) => void }) {
  return <nav className="vocabulary-nav" aria-label="Разделы слов">
    <button className={active === 'study' ? 'active' : ''} onClick={() => onChange('study')}><Icon name="cards" /><span>Изучение</span>{studyingCount > 0 && <i>{studyingCount}</i>}</button>
    <button className={active === 'dictionary' ? 'active' : ''} onClick={() => onChange('dictionary')}><Icon name="book" /><span>Словарь</span></button>
    <button className={active === 'learned' ? 'active' : ''} onClick={() => onChange('learned')}><Icon name="check" /><span>Выучено</span></button>
  </nav>
}

export default function App() {
  const initial = useRef(loadGuestProgress(starterWords))
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('vocabulary')
  const [vocabularyTab, setVocabularyTab] = useState<VocabularyTab>('study')
  const [words, setWords] = useState<Word[]>(initial.current.words)
  const [queue, setQueue] = useState<number[]>(initial.current.queue)
  const [category, setCategory] = useState('Все')
  const [search, setSearch] = useState('')
  const [learnedSearch, setLearnedSearch] = useState('')
  const [answerShown, setAnswerShown] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [feedback, setFeedback] = useState<'known' | 'unknown' | null>(null)
  const [dragX, setDragX] = useState(0)
  const dragStart = useRef<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newEstonian, setNewEstonian] = useState('')
  const [newRussian, setNewRussian] = useState('')
  const [newForms, setNewForms] = useState('')
  const [newPart, setNewPart] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [statusWordId, setStatusWordId] = useState<number | null>(null)
  const [authIntent, setAuthIntent] = useState<'signup' | 'signin' | null>(null)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  useEffect(() => {
    saveGuestProgress({ words, queue })
  }, [words, queue])

  useEffect(() => {
    const valid = new Set(words.filter((word) => word.progress === 1 || word.progress === 2).map((word) => word.id))
    setQueue((items) => {
      const cleaned = items.filter((id, index) => valid.has(id) && items.indexOf(id) === index)
      const missing = [...valid].filter((id) => !cleaned.includes(id))
      return missing.length ? [...cleaned, ...shuffled(missing)] : cleaned
    })
  }, [words])

  const filteredWords = useMemo(() => words.filter((word) =>
    (category === 'Все' || word.category === category) &&
    `${word.estonian} ${word.russian} ${word.forms || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [words, category, search])
  const learnedWords = words.filter((word) => word.progress === 3)
  const filteredLearned = learnedWords.filter((word) => `${word.estonian} ${word.russian}`.toLowerCase().includes(learnedSearch.toLowerCase()))
  const studyingCount = words.filter((word) => word.progress === 1 || word.progress === 2).length
  const currentWord = words.find((word) => word.id === queue[0] && (word.progress === 1 || word.progress === 2))
  const statusWord = words.find((word) => word.id === statusWordId)
  const progress = words.length ? Math.round(learnedWords.length / words.length * 100) : 0

  const addToStudy = (ids: number[]) => {
    const fresh = ids.filter((id) => words.some((word) => word.id === id && word.progress === 0))
    if (!fresh.length) return
    setWords((items) => items.map((word) => fresh.includes(word.id) ? setWordProgress(word, 1) : word))
    setQueue((items) => [...items, ...shuffled(fresh.filter((id) => !items.includes(id)))])
    setSessionCompleted(false)
  }

  const answer = (known: boolean) => {
    if (!currentWord || feedback) return
    setFeedback(known ? 'known' : 'unknown')
    const id = currentWord.id
    const completesSession = completesActiveSession(currentWord.progress, known, queue, id)
    window.setTimeout(() => {
      setWords((items) => items.map((word) => word.id !== id ? word : {
        ...word,
        progress: advanceProgress(word.progress, known),
      }))
      setQueue((items) => requeueAfterAnswer(items, id, known && currentWord.progress === 2))
      setAnswerShown(false); setHintShown(false); setFeedback(null); setDragX(0)
      setSessionCompleted(completesSession)
    }, 430)
  }

  const finishDrag = () => {
    if (Math.abs(dragX) >= 85) answer(dragX > 0)
    else setDragX(0)
    dragStart.current = null
  }

  const playPronunciation = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!currentWord || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(currentWord.estonian)
    utterance.lang = 'et-EE'
    utterance.rate = 0.88
    window.speechSynthesis.speak(utterance)
  }

  const returnToStudy = (id: number) => {
    setWords((items) => items.map((word) => word.id === id ? setWordProgress(word, 1) : word))
    setQueue((items) => items.includes(id) ? items : [...items, id])
    setSessionCompleted(false)
  }

  const removeFromStudy = (id: number) => {
    setWords((items) => items.map((word) => word.id === id ? setWordProgress(word, 0) : word))
    setQueue((items) => items.filter((item) => item !== id))
    setStatusWordId(null)
    setSessionCompleted(false)
  }

  const addWord = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newEstonian.trim() || !newRussian.trim()) return
    const id = Date.now()
    setWords((items) => [...items, { id, estonian: newEstonian.trim().toLowerCase(), russian: newRussian.trim().toLowerCase(), emojis: newEmoji.trim() ? newEmoji.trim().split(/\s+/).slice(0, 3) : ['💬'], category: 'Общение', partOfSpeech: newPart.trim() || undefined, forms: newForms.trim() || undefined, progress: 0 }])
    setNewEstonian(''); setNewRussian(''); setNewEmoji(''); setNewPart(''); setNewForms(''); setShowAdd(false)
  }

  return <div className="app-shell">
    <div className="ambient ambient--one" /><div className="ambient ambient--two" />
    <main className="phone-frame">
      <header className="topbar">
        <button className="brand" onClick={() => { setPrimaryTab('vocabulary'); setVocabularyTab('study'); setSessionCompleted(false) }} aria-label="На главную"><span>Takku</span></button>
      </header>

      <div className={`content ${primaryTab === 'vocabulary' && vocabularyTab === 'study' ? 'content--study' : ''}`}>
        {primaryTab === 'vocabulary' && <VocabularyNavigation active={vocabularyTab} studyingCount={studyingCount} onChange={(nextTab) => { setVocabularyTab(nextTab); if (nextTab !== 'study') setSessionCompleted(false) }} />}

        {primaryTab === 'library' && <section className="screen screen--library">
          <div className="library-intro">
            <div className="library-intro__copy"><span className="eyebrow">СКОРО В TAKKU</span><h1>Библиотека</h1><p>Интерактивные учебники эстонского, короткие уроки и упражнения уже растут вместе с нами.</p></div>
            <div className="library-intro__mascot"><span>Varsti!</span><Mascot /></div>
          </div>
          <div className="library-path" aria-label="Будущая структура обучения"><span className="active">Книги</span><i>→</i><span>Уроки</span><i>→</i><span>Упражнения</span></div>
          <div className="section-row library-section-row"><div><span className="eyebrow">БУДУЩИЕ КУРСЫ</span><h2>Учебники</h2></div><span className="soft-badge">Готовим</span></div>
          <div className="future-books">
            <FutureBookCard color="#1CB0F6" icon="🇪🇪" title="Эстонский с нуля" subtitle="Базовые фразы и первые диалоги" />
            <FutureBookCard color="#CE82FF" icon="💬" title="Говорим уверенно" subtitle="Живые ситуации и разговорная речь" />
          </div>
          <div className="lesson-preview"><span className="eyebrow">ВНУТРИ УЧЕБНИКА</span><FutureLessonCard number="01" title="Tere! Первое знакомство" /><FutureLessonCard number="02" title="Minu nimi on… Представляемся" /></div>
          <p className="library-note">Мы сообщим, когда первые уроки будут готовы. Пока можно пополнять словарный запас.</p>
          <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => { setPrimaryTab('vocabulary'); setVocabularyTab('study'); setSessionCompleted(false) }}>Перейти к словам</button>
        </section>}

        {primaryTab === 'vocabulary' && vocabularyTab === 'dictionary' && <section className="screen screen--dictionary">
          <div className="section-row"><h2>Слова</h2></div>
          <label className="search-box"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Искать на эстонском или русском" /></label>
          <div className="category-scroll" aria-label="Категории">{categories.map((item) => <button key={item.label} className={category === item.label ? 'category active' : 'category'} onClick={() => setCategory(item.label)}><span>{item.icon}</span>{item.label}</button>)}</div>
          <div className="word-list">
            {filteredWords.map((word, index) => {
              const status = statusOf(word)
              const emojis = word.emojis.slice(0, 3)
              return <article className={`word-card word-card--${status}`} key={word.id} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
                <div className={`word-card__emoji word-card__emoji--${emojis.length}`} aria-label={`Подсказка: ${emojis.join(' ')}`}>{emojis.map((emoji, emojiIndex) => <span key={`${emoji}-${emojiIndex}`}>{emoji}</span>)}</div>
                <div className="word-card__copy"><h3>{word.estonian}</h3><p>{word.russian}</p><div className="word-meta"><span className="status-label">{status === 'learned' ? 'Выучено' : status === 'studying' ? (word.progress === 1 ? 'ET → RU' : 'RU → ET') : word.category}</span>{word.partOfSpeech && <span>{word.partOfSpeech}</span>}</div>{word.forms && <small className="word-forms">{word.forms}</small>}</div>
                {status === 'new' ? <button className="add-study" onClick={(event) => { event.stopPropagation(); addToStudy([word.id]) }}><Icon name="plus" /><span>Учить</span></button> : status === 'learned' ? <button className="learned-check status-button" aria-label={`Действия для выученного слова ${word.estonian}`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setStatusWordId(word.id) }}><Icon name="check" /></button> : <button className="studying-dot status-button" aria-label={`Действия для изучаемого слова ${word.estonian}`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setStatusWordId(word.id) }}><Icon name="cards" /></button>}
              </article>
            })}
            {!filteredWords.length && <div className="empty-state"><span>🔎</span><h3>Слово спряталось</h3><p>Попробуй другой запрос или категорию.</p></div>}
          </div>
        </section>}

        {primaryTab === 'vocabulary' && vocabularyTab === 'study' && <section className="screen screen--study">
          {currentWord ? <>
            <div className="study-heading"><h1>{currentWord.progress === 1 ? 'Вспомни перевод' : 'Назови по-эстонски'}</h1></div>
            <div className="lesson-track"><span style={{ width: `${Math.max(12, progress)}%` }} /></div>
            <p className="study-prompt">{currentWord.progress === 1 ? 'Эстонский → Русский' : 'Русский → Эстонский'}</p>
            <div className="swipe-stage">
              <div className={`swipe-label swipe-label--no ${dragX < -25 ? 'visible' : ''}`}>НЕ ЗНАЮ</div><div className={`swipe-label swipe-label--yes ${dragX > 25 ? 'visible' : ''}`}>ЗНАЮ!</div>
              <div className={`flashcard ${answerShown ? 'flashcard--flipped' : ''} ${feedback ? `flashcard--${feedback}` : ''}`} style={feedback ? undefined : { transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)` }}
                onPointerDown={(e) => { dragStart.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId) }}
                onPointerMove={(e) => { if (dragStart.current !== null && !feedback) setDragX(Math.max(-140, Math.min(140, e.clientX - dragStart.current))) }}
                onPointerUp={() => {
                  if (Math.abs(dragX) >= 85) finishDrag()
                  else {
                    if (Math.abs(dragX) < 8) setAnswerShown((shown) => !shown)
                    dragStart.current = null
                    setDragX(0)
                  }
                }}
                onPointerCancel={() => { dragStart.current = null; setDragX(0) }}>
                <div className="flashcard__inner">
                  <div className="flashcard__face flashcard__face--front">
                    <div className="flashcard__rings"><i /><i /><i /></div>
                    <div className="flashcard__top">
                      <span className="language-tag">{currentWord.progress === 1 ? 'ET' : 'RU'}</span>
                      <button className="sound-button" aria-label={`Прослушать произношение ${currentWord.estonian}`} onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onPointerCancel={(e) => e.stopPropagation()} onClick={playPronunciation}><Icon name="volume" /></button>
                    </div>
                    <div className="flashcard__content">
                      <button className={`hint-orb ${hintShown ? 'hint-orb--shown' : ''}`} aria-label={hintShown ? 'Скрыть эмодзи-подсказку' : 'Показать эмодзи-подсказку'} onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onPointerCancel={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setHintShown((shown) => !shown) }}>
                        {hintShown ? <span className="hint-orb__emojis">{currentWord.emojis.join(' ')}</span> : <span className="hint-orb__question">?</span>}
                      </button>
                      <div className="flashcard__main">
                        <h2>{currentWord.progress === 1 ? currentWord.estonian : currentWord.russian}</h2>
                        {currentWord.forms && currentWord.progress === 1 && <span className="flashcard__forms">{currentWord.forms}</span>}
                      </div>
                    </div>
                    <div className="flashcard__bottom"><div className="flip-indicator"><span>↻</span> Перевернуть</div></div>
                    <div className="flashcard__corner">✦</div>
                  </div>
                  <div className="flashcard__face flashcard__face--back">
                    <div className="flashcard__rings"><i /><i /><i /></div>
                    <div className="flashcard__top">
                      <span className="language-tag">{currentWord.progress === 1 ? 'RU' : 'ET'}</span>
                      <span className="flashcard__top-spacer" aria-hidden="true" />
                    </div>
                    <div className="flashcard__content flashcard__content--answer">
                      <div className="flashcard__main flashcard__main--answer">
                        <span className="answer-kicker">ПРАВИЛЬНЫЙ ОТВЕТ</span>
                        <h2>{currentWord.progress === 1 ? currentWord.russian : currentWord.estonian}</h2>
                        <span className="answer-original">{currentWord.progress === 1 ? currentWord.estonian : currentWord.russian}</span>
                      </div>
                    </div>
                    <div className="flashcard__bottom"><div className="flip-indicator"><span>↻</span> Вернуться</div></div>
                    <div className="flashcard__corner">✦</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="answer-actions answer-actions--visible"><button className="tactile-button tactile-button--red" onClick={() => answer(false)}>НЕ ЗНАЮ</button><button className="tactile-button tactile-button--green" onClick={() => answer(true)}>ЗНАЮ!</button></div>
          </> : sessionCompleted ? <div className="complete-state">
            <div className="confetti" aria-hidden="true">{Array.from({ length: 12 }).map((_, i) => <i key={i} />)}</div>
            <div className="complete-state__character"><Mascot /></div>
            <span className="eyebrow">ТРЕНИРОВКА ЗАВЕРШЕНА</span>
            <h1>Отличная работа!</h1>
            <p>Все слова текущей тренировки теперь выучены.</p>
            <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => { setSessionCompleted(false); setVocabularyTab('dictionary') }}>В словарь</button>
          </div> : <div className="complete-state complete-state--empty">
            <div className="complete-state__character"><Mascot /></div>
            <span className="eyebrow">ПОКА НЕТ СЛОВ</span>
            <h1>Начнём учиться?</h1>
            <p>Добавь слова из словаря, и мы начнём тренировку!</p>
            <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => setVocabularyTab('dictionary')}>Выбрать слова</button>
          </div>}
        </section>}

        {primaryTab === 'vocabulary' && vocabularyTab === 'learned' && <section className="screen screen--learned">
          <div className="learned-summary">
            <div className="learned-summary__icon"><Icon name="check" /></div>
            <div className="learned-summary__copy">
              <h1>Уже в памяти!</h1>
              <p>Продолжай в том же духе</p>
              <strong>{learnedCountLabel(learnedWords.length)}</strong>
            </div>
          </div>
          <div className="section-row"><h2>Коллекция</h2></div>
          <label className="search-box learned-search"><Icon name="search" /><input value={learnedSearch} onChange={(e) => setLearnedSearch(e.target.value)} placeholder="Найти выученное слово" /></label>
          {filteredLearned.length ? <div className="learned-grid">{filteredLearned.map((word, index) => <article className="learned-card" key={word.id} style={{ animationDelay: `${index * 70}ms` }}><div>{word.emojis.join(' ')}</div><h3>{word.estonian}</h3><p>{word.russian}</p><button className="return-study" onClick={() => returnToStudy(word.id)}><Icon name="undo" />Повторить</button></article>)}</div> : <div className="empty-state learned-empty"><span>{learnedWords.length ? '🔎' : '🌱'}</span><h3>{learnedWords.length ? 'Ничего не найдено' : 'Всё впереди!'}</h3><p>{learnedWords.length ? 'Попробуй другой запрос.' : 'Выучи слово дважды, и оно появится здесь.'}</p></div>}
        </section>}

        {primaryTab === 'profile' && <section className="screen screen--profile">
          <div className="profile-hero">
            <div className="profile-illustration"><div className="profile-cloud"><Icon name="cloud" /><span>✓</span></div><Mascot /></div>
            <span className="eyebrow">ТВОЙ ПРОГРЕСС</span>
            <h1>Сохрани свой прогресс</h1>
            <p>Создай аккаунт, чтобы продолжать обучение на любом устройстве</p>
          </div>
          <div className="guest-progress-card"><div className="guest-progress-card__icon">📱</div><div><b>Гостевой режим</b><p>Прогресс хранится только на этом устройстве</p></div><span>{learnedWords.length}/{words.length}</span></div>
          <button className="tactile-button tactile-button--primary tactile-button--wide profile-primary" onClick={() => setAuthIntent('signup')}>Создать аккаунт</button>
          <button className="profile-secondary" onClick={() => setAuthIntent('signin')}>Войти</button>
          {!cloudCapability.configured && <div className="cloud-unavailable"><div><Icon name="cloud" /></div><span><b>Облачная синхронизация не настроена</b><p>{cloudCapability.message}</p></span></div>}
          <div className="profile-stats">
            <div><strong>{learnedWords.length}</strong><span>выучено</span></div>
            <div><strong>{studyingCount}</strong><span>изучается</span></div>
            <div><strong>{progress}%</strong><span>словаря</span></div>
          </div>
        </section>}
      </div>

      <nav className="bottom-nav" aria-label="Основная навигация">
        <button className={primaryTab === 'library' ? 'active' : ''} onClick={() => { setPrimaryTab('library'); setSessionCompleted(false) }}><span><Icon name="library" /></span><b>Библиотека</b></button>
        <button className={primaryTab === 'vocabulary' ? 'active' : ''} onClick={() => setPrimaryTab('vocabulary')}><span><Icon name="cards" /></span><b>Слова</b>{studyingCount > 0 && <i>{studyingCount}</i>}</button>
        <button className={primaryTab === 'profile' ? 'active' : ''} onClick={() => { setPrimaryTab('profile'); setSessionCompleted(false) }}><span><Icon name="profile" /></span><b>Профиль</b></button>
      </nav>
    </main>

    {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><form className="add-modal" onSubmit={addWord} onMouseDown={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAdd(false)} aria-label="Закрыть"><Icon name="close" /></button><span className="modal-emoji">🇪🇪</span><h2>Новое слово</h2><p>Добавь эстонское слово в свою коллекцию</p>
      <label><span>НА ЭСТОНСКОМ *</span><input autoFocus value={newEstonian} onChange={(e) => setNewEstonian(e.target.value)} placeholder="например, imeline" /></label>
      <label><span>ПЕРЕВОД *</span><input value={newRussian} onChange={(e) => setNewRussian(e.target.value)} placeholder="например, чудесный" /></label>
      <div className="modal-fields"><label><span>ЧАСТЬ РЕЧИ</span><input value={newPart} onChange={(e) => setNewPart(e.target.value)} placeholder="прил." /></label><label><span>ЭМОДЗИ (ДО 3)</span><input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="✨ 🌿" /></label></div>
      <label><span>ГРАММАТИЧЕСКИЕ ФОРМЫ</span><input value={newForms} onChange={(e) => setNewForms(e.target.value)} placeholder="imelise, imelist" /></label>
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="submit">Добавить слово</button></form></div>}

    {statusWord && statusWord.progress > 0 && <div className="status-sheet-backdrop" onPointerDown={() => setStatusWordId(null)}>
      <div className="status-sheet" role="dialog" aria-modal="true" aria-labelledby="status-sheet-title" onPointerDown={(event) => event.stopPropagation()}>
        <div className="status-sheet__handle" />
        <button className="status-sheet__close" onClick={() => setStatusWordId(null)} aria-label="Закрыть"><Icon name="close" /></button>
        <div className={`status-sheet__icon status-sheet__icon--${statusWord.progress === 3 ? 'learned' : 'studying'}`}>{statusWord.progress === 3 ? <Icon name="check" /> : <Icon name="cards" />}</div>
        <span className="status-sheet__word">{statusWord.estonian}</span>
        <h2 id="status-sheet-title">{statusWord.progress === 3 ? 'Слово выучено!' : 'Слово в изучении'}</h2>
        {statusWord.progress === 3 ? <>
          <p>Начни сначала с направления эстонский → русский.</p>
          <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => { returnToStudy(statusWord.id); setStatusWordId(null) }}>Учить заново</button>
        </> : <>
          <p>Можно продолжить тренировку или убрать слово. При удалении прогресс этого слова сбросится.</p>
          <button className="tactile-button sheet-action--blue tactile-button--wide" onClick={() => { setStatusWordId(null); setPrimaryTab('vocabulary'); setVocabularyTab('study') }}>Продолжить изучение</button>
          <button className="sheet-action--remove" onClick={() => removeFromStudy(statusWord.id)}>Убрать из изучения</button>
        </>}
      </div>
    </div>}

    {authIntent && <div className="modal-backdrop" onPointerDown={() => setAuthIntent(null)}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onPointerDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={() => setAuthIntent(null)} aria-label="Закрыть"><Icon name="close" /></button>
        <div className="auth-modal__icon"><Icon name="cloud" /></div>
        <span className="eyebrow">{authIntent === 'signup' ? 'НОВЫЙ АККАУНТ' : 'С ВОЗВРАЩЕНИЕМ'}</span>
        <h2 id="auth-modal-title">{authIntent === 'signup' ? 'Создать аккаунт' : 'Войти в Takku'}</h2>
        <p>Supabase пока не подключён, поэтому отправка ссылки для входа недоступна. Гостевой режим продолжает работать.</p>
        <label className="auth-email"><span>EMAIL</span><input type="email" disabled placeholder="name@example.com" /></label>
        <button className="tactile-button tactile-button--primary tactile-button--wide" disabled>Отправить ссылку</button>
        <div className="auth-setup"><b>Чтобы включить аккаунты:</b><ol>{supabaseSetup.map((step) => <li key={step}>{step}</li>)}</ol></div>
      </div>
    </div>}
  </div>
}
