import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { StudyScreen } from './StudyScreen'
import { Lessons } from './lessons/Lessons'
import { filterDictionary } from './domain/myWords'
import { sortByEstonian } from './domain/wordOrder'
import { applyAnswer, completesActiveSession, setWordProgress } from './domain/learning'
import { AuthDialog } from './AuthDialog'
import { authErrorMessage, isAuthReturn, signOutHere } from './services/auth'
import type { AuthIntent } from './services/auth'
import { useAuth } from './useAuth'
import { useCloudProgress } from './useCloudProgress'
import type { CloudAction } from './domain/cloudProgress'
import { loadGuestProgress, saveGuestProgress } from './services/localProgress'
import { availableLearningProgress, mergePublishedCatalog, preserveDormantGuestProgress,
  sharedCatalogWithProgress } from './services/publishedCatalog'
import { usePublishedCatalog } from './usePublishedCatalog'
import type { CatalogState } from './usePublishedCatalog'
import { createSupabaseClient } from './services/supabase'
import type { StoredProgress, Word, WordId } from './types'

type PrimaryTab = 'library' | 'vocabulary' | 'profile'

const returningFromAuth = isAuthReturn(window.location.href)
const supabaseClient = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

const catalogErrorMessages = {
  configuration: 'Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY для этой сборки.',
  access: 'Supabase отклонил запрос. Проверьте публичный ключ и доступ на чтение слов и переводов.',
  network: 'Не удалось связаться с Supabase. Проверьте подключение и повторите загрузку.',
  response: 'Supabase вернул неожиданный ответ. Проверьте настройки API и повторите загрузку.',
}

const statusOf = (word: Word) => word.progress === 0 ? 'new' : word.progress === 3 ? 'learned' : 'studying'
const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5)
function Mascot({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return <img className={`mascot ${small ? 'mascot--small' : ''} ${className}`.trim()} src="/takku-dachshund.png" alt="" aria-hidden="true" />
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
  const [lessonReader, setLessonReader] = useState(false)
  const [study, setStudy] = useState<{ round: number } | null>(null)
  const catalogSection = useRef<HTMLDivElement>(null)
  const startButton = useRef<HTMLButtonElement>(null)
  const restoreStudyFocus = useRef(false)
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{ kind: 'known' | 'unknown'; before: StoredProgress } | null>(null)
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
  const filteredWords = useMemo(() => filterDictionary(dictionary, search), [dictionary, search])
  const learnedWords = words.filter((word) => word.progress === 3)
  const studyingCount = words.filter((word) => word.progress === 1 || word.progress === 2).length
  const currentWord = words.find((word) => word.id === queue[0] && (word.progress === 1 || word.progress === 2))
  const statusWord = words.find((word) => word.id === statusWordId)

  function startStudy() {
    const active = currentProgress().queue
    if (!active.length || answerTimer.current !== null) return
    setSessionCompleted(false)
    setStudy({ round: 0 })
  }

  function closeStudy() {
    if (answerTimer.current !== null) window.clearTimeout(answerTimer.current)
    answerTimer.current = null
    setFeedback(null)
    setSessionCompleted(false)
    restoreStudyFocus.current = true
    setStudy(null)
  }

  useEffect(() => {
    if (!study && restoreStudyFocus.current) {
      restoreStudyFocus.current = false
      startButton.current?.focus()
    }
  }, [study])

  function openCatalog() {
    catalogSection.current?.scrollIntoView({ block: 'start' })
  }
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

  function studyLessonWord(catalogId: string) {
    const word = currentProgress().words.find((entry) => entry.catalogId === catalogId && !entry.personalId)
    if (!word) return false
    addToStudy([word.id])
    return true
  }

  const answer = (known: boolean) => {
    if (!study || !currentWord || answerTimer.current !== null || feedback) return
    const before = currentProgress()
    const random = Math.random()
    const next = applyAnswer(before, currentWord.id, known, () => random)
    if (next === before) return

    const active = before.words.find(({ id }) => id === currentWord.id)!
    const stage = next.words.find(({ id }) => id === active.id)!.progress
    const completesSession = completesActiveSession(active.progress, known, before.queue, active.id)
    answerTimer.current = window.setTimeout(() => {
      answerTimer.current = null
      setFeedback(null)
      setStudy((session) => session && { round: session.round + 1 })
      setSessionCompleted(completesSession && currentProgress().queue.length === 0)
    }, 430)
    setFeedback({ kind: known ? 'known' : 'unknown', before })
    commitProgress(next, sync ? [{
      type: 'study', id: crypto.randomUUID(), word: active, expected: active.progress,
      stage, placement: 'answer', random,
    }] : [])
  }

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

  function renderDictionaryWord(word: Word) {
    const status = statusOf(word)
    return <article className={`word-card word-card--${status} my-words__word`} key={word.id}>
      <button type="button" className="my-words__word-info" onClick={() => setStatusWordId(word.id)} aria-haspopup="dialog">
        <span className="my-words__word-name" lang="et">{word.estonian}</span>
        <span className="my-words__translation">{word.russian}</span>
        {status !== 'new' && <span className="status-label">{status === 'learned' ? 'Выучено' : 'Изучаю'}</span>}
      </button>
      {status === 'new' && <button type="button" className="add-study" aria-label={`Учить ${word.estonian}`}
        onClick={() => addToStudy([word.id])}><Icon name="plus" /></button>}
    </article>
  }

  return <div className="app-shell">
    {study ? <StudyScreen
      word={currentWord} feedback={feedback?.kind} round={study.round}
      completed={sessionCompleted} onClose={closeStudy} onAnswer={answer}
      isLocked={() => answerTimer.current !== null}
    /> : <main className="phone-frame">
      {!lessonReader && <header className="topbar">
        <button className="brand" onClick={() => { setPrimaryTab('vocabulary'); setSessionCompleted(false) }} aria-label="На главную"><span>Takku</span></button>
      </header>}

      <div className="content">
        {primaryTab === 'library' && <Lessons client={client} userId={session?.user.id} onReaderChange={setLessonReader} studyWord={studyLessonWord} catalogWords={words} />}

        {primaryTab === 'vocabulary' && <section className="screen screen--dictionary my-words" aria-labelledby="my-words-heading">
          <div className="section-row my-words__heading"><h1 id="my-words-heading">Словарь</h1></div>
          <div className="my-words__hero">
            <div className="my-words__hero-copy">
              <h2>{queue.length ? 'Продолжим изучение?' : 'Начнём учиться?'}</h2>
              <p>{queue.length ? `В очереди: ${queue.length}` : 'Добавь слова из каталога, чтобы начать.'}</p>
              <button type="button" ref={startButton} className="tactile-button tactile-button--primary"
                onClick={queue.length ? startStudy : openCatalog}>
                {queue.length ? 'Начать изучение' : 'Выбрать слова'}
              </button>
            </div>
            <Mascot />
          </div>
          <dl className="my-words__stats">
            <div><dt>Всего</dt><dd aria-live="polite">{catalog.status === 'ready' ? catalog.words.length : '—'}</dd></div>
            <div><dt>Выучено</dt><dd>{learnedWords.length}</dd></div>
            <div><dt>Изучаю</dt><dd>{studyingCount}</dd></div>
          </dl>
          <label className="search-box"><Icon name="search" />
            <input type="search" aria-label="Поиск слов" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Искать на эстонском или русском" />
          </label>
          <div className="dictionary-results" ref={catalogSection}>
            {catalog.status === 'loading' && <div className="empty-state" role="status"><h3>Загружаем общий словарь…</h3></div>}
            {catalog.status === 'error' && <div className="empty-state" role="alert">
              <h3>Не удалось загрузить общий словарь</h3>
              <p>{catalogErrorMessages[catalog.reason]}</p>
              <button type="button" className="profile-secondary" onClick={reloadCatalog}>Повторить загрузку</button>
            </div>}
            {catalog.status === 'ready' && <div className="word-list" aria-label="Опубликованные слова">
              {filteredWords.map(renderDictionaryWord)}
              {!filteredWords.length && <div className="empty-state">
                <h3>{dictionary.length ? 'Слова не найдены' : 'Supabase не вернул опубликованные слова'}</h3>
                {dictionary.length ? <button type="button" className="profile-secondary" onClick={() => setSearch('')}>
                  Сбросить поиск
                </button> : <p>Проверьте публикацию эстонских слов и доступ к их русским переводам.</p>}
              </div>}
              <button type="button" className="profile-secondary" onClick={reloadCatalog}>Обновить словарь</button>
            </div>}
          </div>
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

      {!lessonReader && <nav className="bottom-nav" aria-label="Основная навигация">
        <button className={primaryTab === 'library' ? 'active' : ''} onClick={() => { setPrimaryTab('library'); setSessionCompleted(false) }}><span><Icon name="library" /></span><b>Уроки</b></button>
        <button className={primaryTab === 'vocabulary' ? 'active' : ''} onClick={() => setPrimaryTab('vocabulary')}><span><Icon name="cards" /></span><b>Словарь</b>{studyingCount > 0 && <i>{studyingCount}</i>}</button>
        <button className={primaryTab === 'profile' ? 'active' : ''} onClick={() => { setPrimaryTab('profile'); setSessionCompleted(false) }}><span><Icon name="profile" /></span><b>Профиль</b></button>
      </nav>}
    </main>}

    {showAdd && <div className="modal-backdrop" onMouseDown={() => setShowAdd(false)}><form className="add-modal" onSubmit={addWord} onMouseDown={(e) => e.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowAdd(false)} aria-label="Закрыть"><Icon name="close" /></button><span className="modal-emoji">🇪🇪</span><h2>Новое слово</h2><p>Добавь эстонское слово в свою коллекцию</p>
      <label><span>НА ЭСТОНСКОМ *</span><input autoFocus value={newEstonian} onChange={(e) => setNewEstonian(e.target.value)} placeholder="например, imeline" /></label>
      <label><span>ПЕРЕВОД *</span><input value={newRussian} onChange={(e) => setNewRussian(e.target.value)} placeholder="например, чудесный" /></label>
      <div className="modal-fields"><label><span>ЧАСТЬ РЕЧИ</span><input value={newPart} onChange={(e) => setNewPart(e.target.value)} placeholder="прил." /></label><label><span>ЭМОДЗИ (ДО 3)</span><input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder="✨ 🌿" /></label></div>
      <label><span>ГРАММАТИЧЕСКИЕ ФОРМЫ</span><input value={newForms} onChange={(e) => setNewForms(e.target.value)} placeholder="imelise, imelist" /></label>
      <button className="tactile-button tactile-button--primary tactile-button--wide" type="submit">Добавить слово</button></form></div>}

    {statusWord && <div className="status-sheet-backdrop" onPointerDown={() => setStatusWordId(null)}>
      <div className="status-sheet" role="dialog" aria-modal="true" aria-labelledby="status-sheet-title" onPointerDown={(event) => event.stopPropagation()}>
        <div className="status-sheet__handle" />
        <button className="status-sheet__close" onClick={() => setStatusWordId(null)} aria-label="Закрыть"><Icon name="close" /></button>
        <div className={`status-sheet__icon status-sheet__icon--${statusWord.progress === 3 ? 'learned' : 'studying'}`}>{statusWord.progress === 3 ? <Icon name="check" /> : <Icon name="cards" />}</div>
        <span className="status-sheet__word">{statusWord.estonian}</span>
        <h2 id="status-sheet-title">{statusWord.russian}</h2>
        {statusWord.progress === 0 && <button className="tactile-button tactile-button--primary tactile-button--wide"
          onClick={() => { addToStudy([statusWord.id]); setStatusWordId(null) }}>Начать учить</button>}
        {statusWord.progress === 3 ? <>
          <p>Начни сначала с направления эстонский → русский.</p>
          <button className="tactile-button tactile-button--primary tactile-button--wide" onClick={() => { returnToStudy(statusWord.id); setStatusWordId(null) }}>Учить заново</button>
        </> : statusWord.progress > 0 && <>
          <p>Можно продолжить тренировку или убрать слово. При удалении прогресс этого слова сбросится.</p>
          <button className="tactile-button sheet-action--blue tactile-button--wide" onClick={() => { setStatusWordId(null); startStudy() }}>Продолжить изучение</button>
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
