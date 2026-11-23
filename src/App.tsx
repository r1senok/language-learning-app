import { useEffect, useMemo, useRef, useState } from 'react'
import { bindCardGesture } from './domain/cardGesture'
import { useStudyPronunciation } from './useStudyPronunciation'
import { sortByEstonian } from './domain/wordOrder'
import { applyAnswer, completesActiveSession, setWordProgress } from './domain/learning'
import { AuthDialog } from './AuthDialog'
import { authErrorMessage, isAuthReturn, signOutHere } from './services/auth'
import type { AuthIntent } from './services/auth'
import { useAuth } from './useAuth'
import { useCloudProgress } from './useCloudProgress'
import type { CloudAction } from './domain/cloudProgress'
import { loadGuestProgress, saveGuestProgress } from './services/localProgress'
import { availableLearningProgress, isPersonalWord, mergePublishedCatalog, preserveDormantGuestProgress,
  sharedCatalogWithProgress } from './services/publishedCatalog'
import { usePublishedCatalog } from './usePublishedCatalog'
import type { CatalogState } from './usePublishedCatalog'
import { createSupabaseClient } from './services/supabase'
import type { Progress, StoredProgress, Word, WordId } from './types'

type PrimaryTab = 'library' | 'vocabulary' | 'profile'
type VocabularyTab = 'dictionary' | 'study' | 'learned'

const returningFromAuth = isAuthReturn(window.location.href)
const supabaseClient = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

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
  const auth = useAuth(supabaseClient, returningFromAuth)
  const { catalog, reload } = usePublishedCatalog()
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(returningFromAuth ? 'profile' : 'vocabulary')
  return <Takku key={auth.session?.user.id ?? 'guest'} auth={auth}
    primaryTab={primaryTab} setPrimaryTab={setPrimaryTab} catalog={catalog} reloadCatalog={reload} />
}

function Takku({ auth, primaryTab, setPrimaryTab, catalog, reloadCatalog }: {
  auth: ReturnType<typeof useAuth>
  primaryTab: PrimaryTab
  setPrimaryTab: (tab: PrimaryTab) => void
  catalog: CatalogState
  reloadCatalog: () => void
}) {
  const { client, session, ready: authReady, returnError } = auth
  const { sync, view: cloud } = useCloudProgress(client, session?.user.id)
  const [guest, setGuest] = useState(() => session
    ? { words: [], queue: [] } satisfies StoredProgress
    : loadGuestProgress([]))
  const latestGuest = useRef(guest)
  const answerTimer = useRef<number | null>(null)
  const [vocabularyTab, setVocabularyTab] = useState<VocabularyTab>('study')
  const [category, setCategory] = useState('Все')
  const [search, setSearch] = useState('')
  const [learnedSearch, setLearnedSearch] = useState('')
  const [answerShown, setAnswerShown] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'known' | 'unknown'; before: StoredProgress } | null>(null)
  const [dragX, setDragX] = useState(0)
  const [gestureSurface, setGestureSurface] = useState<HTMLDivElement | null>(null)
  const { pronounce, speechMessage, setSpeechMessage } = useStudyPronunciation()
  const [showAdd, setShowAdd] = useState(false)
  const [newEstonian, setNewEstonian] = useState('')
  const [newRussian, setNewRussian] = useState('')
  const [newForms, setNewForms] = useState('')
  const [newPart, setNewPart] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [statusWordId, setStatusWordId] = useState<WordId | null>(null)
  const [authIntent, setAuthIntent] = useState<AuthIntent | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [sessionCompleted, setSessionCompleted] = useState(false)

  useEffect(() => () => {
    if (answerTimer.current !== null) window.clearTimeout(answerTimer.current)
  }, [])

  useEffect(() => {
    if (catalog.status === 'loading') return
    if (sync) sync.setCatalog(catalog.words)
  }, [catalog.status, catalog.words, sync])

  useEffect(() => {
    if (session) setAuthIntent(null)
  }, [session])

  async function logout() {
    if (!client || signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      const { error } = await signOutHere(client.auth)
      if (error) setSignOutError(authErrorMessage(error, 'logout'))
    } catch {
      setSignOutError(authErrorMessage({}, 'logout'))
    } finally {
      setSigningOut(false)
    }
  }

  function currentProgress() {
    const account = sync?.getView().progress
    const raw = account ?? mergePublishedCatalog(latestGuest.current, catalog.words ?? [])
    return availableLearningProgress(raw, catalog.words)
  }

  function commitProgress(next: StoredProgress, actions: CloudAction[]) {
    if (sync) {
      for (const action of actions) void sync.enqueue(action)
      return
    }
    const saved = mergePublishedCatalog(latestGuest.current, catalog.words ?? [])
    const merged = preserveDormantGuestProgress(saved, availableLearningProgress(saved, catalog.words), next)
    latestGuest.current = merged
    saveGuestProgress(merged)
    setGuest(merged)
  }

  const individualProgress = useMemo(() => {
    if (feedback) return feedback.before
    const progress = cloud?.progress ?? mergePublishedCatalog(guest, catalog.words ?? [])
    return availableLearningProgress(progress, catalog.words)
  }, [feedback, cloud?.progress, guest, catalog.words])
  const { words, queue } = individualProgress

  const dictionary = useMemo(() => sortByEstonian(sharedCatalogWithProgress(catalog.words ?? [], words)), [catalog.words, words])
  const personalWords = sortByEstonian(words.filter(isPersonalWord))
  const filterCategories = useMemo(() => {
    const names = new Set(categories.map(({ label }) => label))
    const additional = dictionary.flatMap((word) => word.categories?.length ? word.categories : [word.category])
    return [...categories, ...[...new Set(additional)].filter((label) => !names.has(label))
      .sort().map((label) => ({ label, icon: '✦' }))]
  }, [dictionary])
  const matchesSearch = (word: Word) =>
    `${word.estonian} ${word.russian} ${word.forms || ''}`.toLowerCase().includes(search.toLowerCase())
  const filteredWords = dictionary.filter((word) =>
    (category === 'Все' || word.category === category || word.categories?.includes(category)) && matchesSearch(word))
  const filteredPersonal = personalWords.filter(matchesSearch)
  const learnedWords = sortByEstonian(words.filter((word) => word.progress === 3))
  const filteredLearned = learnedWords.filter((word) => `${word.estonian} ${word.russian}`.toLowerCase().includes(learnedSearch.toLowerCase()))
  const studyingCount = words.filter((word) => word.progress === 1 || word.progress === 2).length
  const currentWord = words.find((word) => word.id === queue[0] && (word.progress === 1 || word.progress === 2))
  const statusWord = words.find((word) => word.id === statusWordId)
  const progress = words.length ? Math.round(learnedWords.length / words.length * 100) : 0

  const addToStudy = (ids: WordId[]) => {
    const { words, queue } = currentProgress()
    const fresh = ids.filter((id) => words.some((word) => word.id === id && word.progress === 0))
    if (!fresh.length) return
    const additions = shuffled(fresh.filter((id) => !queue.includes(id)))
    commitProgress({
      words: words.map((word) => fresh.includes(word.id) ? setWordProgress(word, 1) : word),
      queue: [...queue, ...additions],
    }, sync ? additions.map((id) => ({
      type: 'study', id: crypto.randomUUID(), word: words.find((word) => word.id === id)!,
      expected: 0, stage: 1, placement: 'append', random: 0,
    })) : [])
    setSessionCompleted(false)
  }

  const answer = (known: boolean) => {
    if (!currentWord || answerTimer.current !== null || feedback) return
    const before = currentProgress()
    const random = Math.random()
    const next = applyAnswer(before, currentWord.id, known, () => random)
    if (next === before) return

    const active = before.words.find(({ id }) => id === currentWord.id)!
    const stage = next.words.find(({ id }) => id === active.id)!.progress
    const completesSession = completesActiveSession(active.progress, known, before.queue, active.id)
    answerTimer.current = window.setTimeout(() => {
      answerTimer.current = null
      setAnswerShown(false); setHintShown(false); setFeedback(null); setDragX(0); setSpeechMessage('')
      setSessionCompleted(completesSession && currentProgress().queue.length === 0)
    }, 430)
    setFeedback({ kind: known ? 'known' : 'unknown', before })
    commitProgress(next, sync ? [{
      type: 'study', id: crypto.randomUUID(), word: active, expected: active.progress,
      stage, placement: 'answer', random,
    }] : [])
  }

  const answerRef = useRef(answer)
  answerRef.current = answer
  useEffect(() => {
    if (!gestureSurface) return
    return bindCardGesture(gestureSurface, {
      isLocked: () => answerTimer.current !== null,
      drag: setDragX,
      flip: () => { setAnswerShown((shown) => !shown); setSpeechMessage('') },
      answer: (known) => answerRef.current(known),
    })
  }, [gestureSurface, setSpeechMessage])

  const returnToStudy = (id: WordId) => {
    const { words, queue } = currentProgress()
    const word = words.find((entry) => entry.id === id)
    if (!word || word.progress !== 3) return
    commitProgress({
      words: words.map((entry) => entry.id === id ? setWordProgress(entry, 1) : entry),
      queue: queue.includes(id) ? queue : [...queue, id],
    }, sync ? [{ type: 'study', id: crypto.randomUUID(), word, expected: 3, stage: 1,
      placement: 'append', random: 0 }] : [])
    setSessionCompleted(false)
  }

  const removeFromStudy = (id: WordId) => {
    const { words, queue } = currentProgress()
    const word = words.find((entry) => entry.id === id)
    if (!word || !word.progress) return
    commitProgress({
      words: words.map((entry) => entry.id === id ? setWordProgress(entry, 0) : entry),
      queue: queue.filter((item) => item !== id),
    }, sync ? [{ type: 'study', id: crypto.randomUUID(), word, expected: word.progress, stage: 0,
      placement: 'append', random: 0 }] : [])
    setStatusWordId(null)
    setSessionCompleted(false)
  }

  const addWord = (event: React.FormEvent) => {
    event.preventDefault()
    if (!newEstonian.trim() || !newRussian.trim()) return
    const id = sync ? crypto.randomUUID() : Date.now()
    const { words, queue } = currentProgress()
    const word: Word = {
      id, estonian: newEstonian.trim().toLowerCase(), russian: newRussian.trim().toLowerCase(),
      emojis: newEmoji.trim() ? newEmoji.trim().split(/\s+/).slice(0, 3) : ['💬'],
      category: 'Общение', partOfSpeech: newPart.trim() || undefined, forms: newForms.trim() || undefined, progress: 0,
    }
    commitProgress({ words: [...words, word], queue }, sync ? [{ type: 'personal', id: crypto.randomUUID(), word }] : [])
    setNewEstonian(''); setNewRussian(''); setNewEmoji(''); setNewPart(''); setNewForms(''); setShowAdd(false)
  }

  function renderDictionaryWord(word: Word, index: number) {
    const status = statusOf(word)
    const emojis = word.emojis.slice(0, 3)
    return <article className={`word-card word-card--${status}`} key={word.id} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <div className={`word-card__emoji word-card__emoji--${emojis.length}`} aria-label={`Подсказка: ${emojis.join(' ')}`}>{emojis.map((emoji, emojiIndex) => <span key={`${emoji}-${emojiIndex}`}>{emoji}</span>)}</div>
      <div className="word-card__copy"><h3>{word.estonian}</h3><p>{word.russian}</p><div className="word-meta"><span className="status-label">{status === 'learned' ? 'Выучено' : status === 'studying' ? (word.progress === 1 ? 'ET → RU' : 'RU → ET') : word.category}</span>{word.partOfSpeech && <span>{word.partOfSpeech}</span>}</div>{word.forms && <small className="word-forms">{word.forms}</small>}</div>
      {status === 'new' ? <button className="add-study" onClick={(event) => { event.stopPropagation(); addToStudy([word.id]) }}><Icon name="plus" /><span>Учить</span></button> : status === 'learned' ? <button className="learned-check status-button" aria-label={`Действия для выученного слова ${word.estonian}`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setStatusWordId(word.id) }}><Icon name="check" /></button> : <button className="studying-dot status-button" aria-label={`Действия для изучаемого слова ${word.estonian}`} aria-haspopup="dialog" onClick={(event) => { event.stopPropagation(); setStatusWordId(word.id) }}><Icon name="cards" /></button>}
    </article>
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
          <div className="section-row"><h2>Слова</h2>
            <button type="button" className="add-study" onClick={() => setShowAdd(true)}><Icon name="plus" /><span>Добавить слово</span></button>
          </div>
          <label className="search-box"><Icon name="search" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Искать на эстонском или русском" /></label>
          <div className="category-scroll" aria-label="Категории">{filterCategories.map((item) => <button key={item.label} className={category === item.label ? 'category active' : 'category'} onClick={() => setCategory(item.label)}><span>{item.icon}</span>{item.label}</button>)}</div>
          {catalog.status === 'loading' && <div className="empty-state" role="status"><h3>Загружаем словарь…</h3></div>}
          {catalog.status === 'error' && <div className="empty-state" role="alert">
            <h3>Не удалось загрузить словарь</h3><p>Проверьте подключение и попробуйте снова.</p>
            <button className="profile-secondary" onClick={reloadCatalog}>Повторить загрузку</button>
          </div>}
          {catalog.status === 'ready' && <div className="word-list" aria-label="Общий словарь">
            {filteredWords.map(renderDictionaryWord)}
            {!dictionary.length && <div className="empty-state"><h3>Пока нет опубликованных слов</h3></div>}
            {dictionary.length > 0 && !filteredWords.length && <div className="empty-state"><span>🔎</span><h3>Слово спряталось</h3><p>Попробуй другой запрос или категорию.</p></div>}
            <button className="profile-secondary" onClick={reloadCatalog}>Обновить словарь</button>
          </div>}
          {personalWords.length > 0 && <section aria-labelledby="personal-words-heading">
            <div className="section-row"><h2 id="personal-words-heading">Личные слова</h2></div>
            <div className="word-list">{filteredPersonal.map(renderDictionaryWord)}
              {!filteredPersonal.length && <div className="empty-state"><h3>Личные слова не найдены</h3></div>}
            </div>
          </section>}
        </section>}

        {primaryTab === 'vocabulary' && vocabularyTab === 'study' && <section className="screen screen--study">
          {currentWord ? <>
            <div className="study-heading"><h1>{currentWord.progress === 1 ? 'Вспомни перевод' : 'Назови по-эстонски'}</h1></div>
            <div className="lesson-track"><span style={{ width: `${Math.max(12, progress)}%` }} /></div>
            <p className="study-prompt">{currentWord.progress === 1 ? 'Эстонский → Русский' : 'Русский → Эстонский'}</p>
            <div className="swipe-stage" ref={setGestureSurface}>
              <div className={`swipe-label swipe-label--no ${dragX < -25 ? 'visible' : ''}`}>НЕ ЗНАЮ</div><div className={`swipe-label swipe-label--yes ${dragX > 25 ? 'visible' : ''}`}>ЗНАЮ!</div>
              <div className={`flashcard ${answerShown ? 'flashcard--flipped' : ''} ${feedback ? `flashcard--${feedback.kind}` : ''} ${dragX ? 'flashcard--dragging' : ''}`}
                style={feedback ? undefined : { transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)` }}>
                <div className="flashcard__inner">
                  <div className="flashcard__face flashcard__face--front">
                    <div className="flashcard__rings"><i /><i /><i /></div>
                    <div className="flashcard__top">
                      <span className="language-tag">{currentWord.progress === 1 ? 'ET' : 'RU'}</span>
                      <button className="sound-button" aria-label="Прослушать слово на карточке" onClick={() => {
                        if (currentWord.progress === 1) pronounce(currentWord.estonian, 'et-EE')
                        else pronounce(currentWord.russian, 'ru-RU')
                      }}><Icon name="volume" /></button>
                    </div>
                    <div className="flashcard__content">
                      <button className={`hint-orb ${hintShown ? 'hint-orb--shown' : ''}`} aria-label={hintShown ? 'Скрыть эмодзи-подсказку' : 'Показать эмодзи-подсказку'}
                        onClick={() => setHintShown((shown) => !shown)}>
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
                      <button className="sound-button" aria-label="Прослушать правильный ответ" onClick={() => {
                        if (currentWord.progress === 1) pronounce(currentWord.russian, 'ru-RU')
                        else pronounce(currentWord.estonian, 'et-EE')
                      }}><Icon name="volume" /></button>
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
            {speechMessage && <p className="study-tip" role="status">{speechMessage}</p>}
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
            <h1>{session ? 'Твой аккаунт' : 'Сохрани свой прогресс'}</h1>
            <p>{session ? session.user.email ?? 'Вы вошли в Takku' : 'Войдите по электронной почте или через Google'}</p>
          </div>
          <div className="guest-progress-card"><div className="guest-progress-card__icon">📱</div><div><b>{session ? 'Облачный прогресс' : 'Прогресс на этом устройстве'}</b><p role="status">{session
            ? cloud?.status === 'synced' ? 'Синхронизировано' : cloud?.status === 'offline' ? 'Нет подключения' : 'Синхронизация…'
            : 'Доступен в этом браузере'}</p></div><span>{learnedWords.length}/{words.length}</span></div>
          {session ? (
            <button className="profile-secondary" disabled={signingOut} onClick={() => void logout()}>
              {signingOut ? 'Выходим…' : 'Выйти'}
            </button>
          ) : authReady ? <>
            <button className="tactile-button tactile-button--primary tactile-button--wide profile-primary" onClick={() => setAuthIntent('signup')}>Создать аккаунт</button>
            <button className="profile-secondary" onClick={() => setAuthIntent('signin')}>Войти</button>
          </> : <p role="status">Проверяем вход…</p>}
          {cloud?.dormant && <p>Действия для снятых с публикации слов сохранены на этом устройстве.</p>}
          {cloud?.storageFailed && <p role="alert">Локальное сохранение ограничено. Оставьте Takku открытым до синхронизации.</p>}
          {cloud?.conflict && <div className="cloud-unavailable" role="alert"><div><Icon name="cloud" /></div>
            <span><b>Ожидающее действие нельзя применить</b>
              <p>Прогресс изменился на другом устройстве или слово недоступно. Можно сохранить состояние из облака и повторить действие в текущей очереди.</p>
              <button className="profile-secondary" onClick={() => void sync?.discardConflict()}>Использовать состояние из облака</button>
            </span></div>}
          {signOutError && <p role="alert">{signOutError}</p>}
          {returnError && !session && <p role="alert">{returnError}</p>}
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

    {cloud?.choice && <div className="modal-backdrop">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="progress-choice-title">
        <div className="auth-modal__icon"><Icon name="cloud" /></div>
        <h2 id="progress-choice-title">Прогресс обучения</h2>
        <p>{cloud.choice === 'empty' ? 'Перенести гостевой прогресс в аккаунт?'
          : 'Прогресс есть на этом устройстве и в аккаунте. Можно объединить данные или продолжить с облачным прогрессом.'}</p>
        <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => void sync?.decide(true)}>
          {cloud.choice === 'empty' ? 'Перенести прогресс' : 'Объединить прогресс'}
        </button>
        <button className="profile-secondary" onClick={() => void sync?.decide(false)}>
          {cloud.choice === 'empty' ? 'Начать с облачного прогресса' : 'Использовать облачный прогресс'}
        </button>
      </div>
    </div>}
    {authIntent && !session && <AuthDialog key={authIntent} intent={authIntent} client={client}
      ready={authReady} onClose={() => setAuthIntent(null)} closeIcon={<Icon name="close" />}>
      <Icon name="cloud" />
    </AuthDialog>}
  </div>
}
