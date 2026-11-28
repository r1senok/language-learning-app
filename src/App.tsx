import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from './Icon'
import { ReaderHeader } from './lessons/ReaderLayout'
import { StudyCount, TrainingHome } from './TrainingHome'
import { WordTraining, wordForms } from './WordTraining'
import { trainingCandidates, wordStatus } from './domain/wordTraining'
import { shuffledOptions } from './lessons/wordBank'
import { Lessons } from './lessons/Lessons'
import { filterDictionary } from './domain/myWords'
import { sortByEstonian } from './domain/wordOrder'
import { reviewQueuedWord, setWordProgress } from './domain/learning'
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

const statusLabels = { new: 'Новое', learning: 'Изучаю', pending_reverse: 'Обратная проверка', learned: 'Выучено' }
type TrainingMode = 'new' | 'review'
type TrainingSession = { mode: TrainingMode; ids: WordId[]; total: number; introduced?: WordId }

function Mascot({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return <img className={`mascot ${small ? 'mascot--small' : ''} ${className}`.trim()} src="/takku-dachshund.png" alt="" aria-hidden="true" />
}

export default function App() {
  const auth = useAuth(supabaseClient, returningFromAuth)
  const { catalog, reload } = usePublishedCatalog()
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>(returningFromAuth ? 'profile' : 'library')
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
  const [lessonReader, setLessonReader] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [training, setTraining] = useState<TrainingSession>()
  const [dictionaryStatus, setDictionaryStatus] = useState('all')
  const [category, setCategory] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
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
    const progress = cloud?.progress ?? mergePublishedCatalog(guest, catalog.words ?? [])
    return availableLearningProgress(progress, catalog.words)
  }, [cloud?.progress, guest, catalog.words])
  const { words, queue } = individualProgress

  const dictionary = useMemo(() => sortByEstonian(sharedCatalogWithProgress(catalog.words ?? [], words)), [catalog.words, words])
  const filteredWords = useMemo(() => filterDictionary(dictionary, search, dictionaryStatus, category),
    [dictionary, search, dictionaryStatus, category])
  const categories = useMemo(() => [...new Set(dictionary.flatMap((word) => word.categories ?? []))].sort(), [dictionary])
  const learnedWords = words.filter((word) => word.progress === 3)
  const studyingCount = words.filter((word) => word.progress === 1 || word.progress === 2).length
  const trainingById = new Map(training ? trainingCandidates(training.mode, individualProgress, catalog.words ?? [])
    .map((word) => [word.id, word]) : [])
  if (training?.introduced !== undefined) {
    const introduced = words.find((word) => word.id === training.introduced)
    if (introduced) trainingById.set(introduced.id, introduced)
  }
  const trainingIds = training?.ids.filter((id) => trainingById.has(id)) ?? []
  const trainingWord = trainingById.get(trainingIds[0])
  const statusWord = words.find((word) => word.id === statusWordId)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [primaryTab, catalogOpen])

  function selectTab(tab: PrimaryTab) {
    setTraining(undefined)
    setStatusWordId(null)
    setCatalogOpen(false)
    setPrimaryTab(tab)
  }

  function startTraining(mode: TrainingMode) {
    const candidates = trainingCandidates(mode, currentProgress(), catalog.words ?? [])
    const ids = shuffledOptions(candidates.map(({ id }) => id), crypto.randomUUID())
    setStatusWordId(null)
    setCatalogOpen(false)
    setTraining({ mode, ids, total: ids.length })
  }

  function openCatalog() {
    setTraining(undefined)
    setCatalogOpen(true)
  }

  function nextTrainingWord(repeat = false) {
    if (!training || !trainingWord) return
    setTraining({ ...training, introduced: undefined,
      ids: [...trainingIds.slice(1), ...(repeat ? [trainingWord.id] : [])] })
  }

  const progress = words.length ? Math.round(learnedWords.length / words.length * 100) : 0

  const addToStudy = (ids: WordId[]) => {
    const { words, queue } = currentProgress()
    const fresh = ids.filter((id) => words.some((word) => word.id === id && word.progress === 0))
    if (!fresh.length) return
    const additions = shuffledOptions([...new Set(fresh.filter((id) => !queue.includes(id)))], crypto.randomUUID())
    commitProgress({
      words: words.map((word) => fresh.includes(word.id) ? setWordProgress(word, 1) : word),
      queue: [...queue, ...additions],
    }, sync ? additions.map((id) => ({
      type: 'study', id: crypto.randomUUID(), word: words.find((word) => word.id === id)!,
      expected: 0, stage: 1, placement: 'append', random: 0,
    })) : [])
  }

  function studyLessonWord(catalogId: string) {
    const word = currentProgress().words.find((entry) => entry.catalogId === catalogId && !entry.personalId)
    if (!word) return false
    addToStudy([word.id])
    return true
  }

  function classifyTrainingWord(known: boolean) {
    if (!training || !trainingWord) return false
    const before = currentProgress()
    const word = before.words.find(({ id }) => id === trainingWord.id)
    if (!word || word.progress !== 0) return false
    const stage = known ? 2 : 1
    const reviewedAt = known ? new Date().toISOString() : undefined
    commitProgress({ words: before.words.map((entry) => entry.id === word.id
      ? { ...entry, progress: stage, ...(reviewedAt && { lastReviewedAt: reviewedAt }) } : entry),
      queue: [...before.queue, word.id] }, sync ? [{
      type: 'study', id: crypto.randomUUID(), word, expected: 0, stage, placement: 'append', random: 0, reviewedAt,
    }] : [])
    setTraining(known ? { ...training, ids: trainingIds.slice(1) } : { ...training, introduced: word.id })
    return true
  }

  function reviewTrainingWord(known: boolean) {
    if (!trainingWord) return false
    const before = currentProgress()
    const word = before.words.find(({ id }) => id === trainingWord.id)
    if (!word || word.progress !== trainingWord.progress) return false
    const random = Math.random()
    const reviewedAt = new Date().toISOString()
    const next = reviewQueuedWord(before, word.id, known, () => random, reviewedAt)
    if (next === before) return false
    const stage = next.words.find(({ id }) => id === word.id)!.progress
    commitProgress(next, sync ? [{
      type: 'study', id: crypto.randomUUID(), word, expected: word.progress, stage, placement: 'answer', random, reviewedAt,
    }] : [])
    nextTrainingWord(stage !== 3)
    return true
  }

  function returnToStudy(word: Word) {
    const before = currentProgress()
    if (before.words.find(({ id }) => id === word.id)?.progress !== 3) return
    commitProgress({ words: before.words.map((entry) => entry.id === word.id ? setWordProgress(entry, 1) : entry),
      queue: [...before.queue, word.id] }, sync ? [{
      type: 'study', id: crypto.randomUUID(), word, expected: 3, stage: 1, placement: 'append', random: 0,
    }] : [])
    setStatusWordId(null)
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
    const status = wordStatus(word)
    const studying = status === 'learning' || status === 'pending_reverse'
    return <article className="word-card my-words__word" data-state={studying ? 'studying' : status} key={word.id}>
      <button type="button" className="my-words__word-info" onClick={() => setStatusWordId(word.id)} aria-haspopup="dialog">
        <span className="my-words__word-name" lang="et">{word.estonian}</span>
        <span className="my-words__translation">{word.russian}</span>
      </button>
      {status === 'new' && <button type="button" className="add-study" aria-label={`Учить ${word.estonian}`}
        onClick={() => addToStudy([word.id])}><Icon name="plus" /></button>}
      {status !== 'new' && <span className="my-words__status">{studying ? 'Изучаю' : 'Выучено'}</span>}
    </article>
  }

  return <div className="app-shell">
    {training ? <WordTraining mode={training.mode} word={trainingWord} total={training.total}
      completed={training.total - trainingIds.length} catalogEmpty={!dictionary.length}
      allLearned={dictionary.length > 0 && dictionary.every(({ progress }) => progress === 3) && !studyingCount}
      onClose={() => setTraining(undefined)}
      onClassify={classifyTrainingWord} onReview={reviewTrainingWord} onNext={() => nextTrainingWord()} />
      : catalogOpen && primaryTab === 'vocabulary' ? <main className="dictionary-screen" aria-labelledby="my-words-heading">
        <ReaderHeader title="Общий словарь" headingId="my-words-heading"
          onBack={() => selectTab('vocabulary')} backLabel="К тренировке" />
        <div className="dictionary-toolbar reader-content">
          <div className="dictionary-search">
            <label className="search-box"><Icon name="search" />
              <input type="search" aria-label="Поиск слов" value={search} onChange={(event) => setSearch(event.target.value)}
                placeholder="Искать на эстонском или русском" />
            </label>
            <button type="button" className="lesson-option dictionary-filter-toggle" aria-label="Фильтры"
              aria-expanded={showFilters} aria-controls="dictionary-filters"
              data-filtered={dictionaryStatus !== 'all' || !!category} onClick={() => setShowFilters(!showFilters)}>
              <Icon name="filter" />
            </button>
          </div>
          <div className="dictionary-filters" id="dictionary-filters" hidden={!showFilters}>
            <label>Статус<select value={dictionaryStatus} onChange={(event) => setDictionaryStatus(event.target.value)}>
              <option value="all">Все</option><option value="new">Новые</option>
              <option value="learning">Изучаю</option><option value="learned">Выученные</option>
            </select></label>
            {categories.length > 0 && <label>Тема<select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Все темы</option>{categories.map((name) => <option key={name}>{name}</option>)}
            </select></label>}
          </div>
        </div>
        <div className="reader-scroll dictionary-scroll">
          <div className="dictionary-results">
            {catalog.status === 'loading' && <div className="empty-state" role="status"><h3>Загружаем общий словарь…</h3></div>}
            {catalog.status === 'error' && <div className="empty-state" role="alert">
              <h3>Не удалось загрузить общий словарь</h3>
              <p>{catalogErrorMessages[catalog.reason]}</p>
              <button type="button" className="profile-secondary" onClick={reloadCatalog}>Повторить загрузку</button>
            </div>}
            {catalog.status === 'ready' && <div className="word-list" aria-label="Опубликованные слова">
              {filteredWords.map(renderDictionaryWord)}
              {!filteredWords.length && <div className="empty-state">
                <h3>{dictionary.length ? 'Слова не найдены' : 'Общий словарь пока пуст'}</h3>
                {dictionary.length ? <button type="button" className="profile-secondary" onClick={() => { setSearch(''); setDictionaryStatus('all'); setCategory('') }}>
                  Сбросить фильтры
                </button> : <p>Опубликованные слова появятся здесь.</p>}
              </div>}
            </div>}
          </div>
        </div>
        <div className="dictionary-action">
          <div className="reader-action">
            <button type="button" className="tactile-button tactile-button--primary tactile-button--wide dictionary-action__button"
              onClick={() => startTraining('review')} disabled={!queue.length}>Изучение <StudyCount count={queue.length} /></button>
          </div>
        </div>
      </main>
      : <main className="phone-frame">
      {!lessonReader && <header className="topbar">
        <button className="brand" onClick={() => selectTab('library')} aria-label="На главную"><span>takku</span></button>
      </header>}

      <div className="content">
        {primaryTab === 'library' && <Lessons client={client} userId={session?.user.id} onReaderChange={setLessonReader} studyWord={studyLessonWord} catalogWords={words} />}

        {primaryTab === 'vocabulary' && <TrainingHome total={catalog.words?.length} active={queue.length} learned={learnedWords.length}
          loading={catalog.status === 'loading' || Boolean(session && !cloud?.progress)}
          onStart={startTraining} onOpenCatalog={openCatalog} />}

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
        <button aria-current={primaryTab === 'library' ? 'page' : undefined} className={primaryTab === 'library' ? 'active' : ''} onClick={() => selectTab('library')}><span><img src="/navigation/home.svg" alt="" /></span><b>Главная</b></button>
        <button aria-current={primaryTab === 'vocabulary' ? 'page' : undefined} className={primaryTab === 'vocabulary' ? 'active' : ''} onClick={() => selectTab('vocabulary')}><span><img src="/navigation/dictionary.svg" alt="" /></span><b>Тренировка</b></button>
        <button aria-current={primaryTab === 'profile' ? 'page' : undefined} className={primaryTab === 'profile' ? 'active' : ''} onClick={() => selectTab('profile')}><span><img src="/navigation/profile.svg" alt="" /></span><b>Профиль</b></button>
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
        <div className="status-sheet__icon status-sheet__icon--studying"><Icon name="cards" /></div>
        <span className="status-sheet__word">{statusWord.estonian}</span>
        <h2 id="status-sheet-title">{statusWord.russian}</h2>
        {wordForms(statusWord).length > 0 && <p lang="et">{wordForms(statusWord).join(' · ')}</p>}
        <p>{statusLabels[wordStatus(statusWord)]}{statusWord.lastReviewedAt &&
          <> · Проверено {new Date(statusWord.lastReviewedAt).toLocaleDateString('ru')}</>}</p>
        {statusWord.progress === 3 && <button type="button" className="tactile-button tactile-button--primary tactile-button--wide"
          onClick={() => returnToStudy(statusWord)}>Вернуть в изучение</button>}
        {statusWord.progress === 0 && <button className="tactile-button tactile-button--primary tactile-button--wide"
          onClick={() => { addToStudy([statusWord.id]); setStatusWordId(null) }}>Добавить в изучение</button>}
        {(statusWord.progress === 1 || statusWord.progress === 2) && <>
          <p>Можно продолжить тренировку или убрать слово. При удалении прогресс этого слова сбросится.</p>
          <button className="tactile-button sheet-action--blue tactile-button--wide" onClick={() => { startTraining('review') }}>Продолжить изучение</button>
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
