import './speech-test.css'

const synthesis = window.speechSynthesis
const supported = Boolean(synthesis && typeof synthesis.getVoices === 'function' &&
  typeof synthesis.speak === 'function' && typeof window.SpeechSynthesisUtterance === 'function')
const find = (id: string) => document.getElementById(id)!
const playback = find('playback-status')
const errors = find('error-status')
const events = find('events')
let current: SpeechSynthesisUtterance | undefined
let watchdog: number | undefined
const language = (voice: SpeechSynthesisVoice) => voice.lang.trim().toLowerCase().replace(/_/g, '-')

function log(message: string) {
  const item = document.createElement('li')
  item.textContent = `${new Date().toLocaleTimeString()} · ${message}`
  events.prepend(item)
  if (events.children.length > 25) events.lastElementChild?.remove()
}

function failure(code: string) {
  errors.textContent = code
  log(code)
}

function refreshVoices(reason: string) {
  let available: SpeechSynthesisVoice[] = []
  try {
    if (typeof synthesis?.getVoices === 'function') available = synthesis.getVoices()
    log(`${reason}: getVoices() → ${available.length}`)
  } catch (error) {
    failure(`getVoices: ${error instanceof Error ? error.name : 'unknown'}`)
  }
  const estonian = available.find((voice) => language(voice) === 'et-ee')
    ?? available.find((voice) => language(voice) === 'et')
  find('voices').replaceChildren(...available.map((voice) => {
    const item = document.createElement('li')
    item.textContent = `${voice.name} — ${voice.lang}${voice.default ? ' (по умолчанию)' : ''}`
    return item
  }))
  find('voice-count').textContent = String(available.length)
  find('voice-status').textContent = estonian
    ? `Найден: ${estonian.name} (${estonian.lang})`
    : 'Эстонский голос недоступен'
  return { available, estonian }
}

function speak(event: Event, sample?: string) {
  const activation = navigator.userActivation?.isActive
  find('gesture-status').textContent = `isTrusted: ${event.isTrusted}; userActivation: ${activation ?? 'браузер не сообщает'}`
  errors.textContent = '—'
  const { available, estonian } = refreshVoices('Нажатие')
  const otherVoices = available.filter((voice) => voice !== estonian && !['et', 'et-ee'].includes(language(voice)))
  const voice = sample === undefined
    ? otherVoices.find((candidate) => candidate.default) ?? otherVoices[0] ?? estonian
    : estonian
  if (!supported || !voice) {
    playback.textContent = !supported ? 'Web Speech API недоступен' : sample === undefined ?
      'Пока нет голосов для проверки звука.' : 'Эстонский голос недоступен'
    return
  }

  window.clearTimeout(watchdog)
  const interrupted = current || synthesis.speaking || synthesis.pending
  current = undefined
  try {
    if (interrupted) synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(sample ?? '1, 2, 3.')
    utterance.voice = voice
    utterance.lang = language(voice) === 'et-ee' ? 'et-EE' : voice.lang.replace(/_/g, '-')
    current = utterance

    const finish = (status: string) => {
      if (current !== utterance) return false
      window.clearTimeout(watchdog)
      current = undefined
      playback.textContent = status
      return true
    }
    utterance.onstart = () => {
      if (current !== utterance) return
      window.clearTimeout(watchdog)
      playback.textContent = 'Воспроизводится…'
      log('onstart')
    }
    utterance.onend = () => { if (finish('Воспроизведение завершено.')) log('onend') }
    utterance.onerror = ({ error }) => { if (finish('Ошибка воспроизведения.')) failure(`onerror: ${error}`) }
    playback.textContent = `Ожидаем onstart · ${voice.name} (${voice.lang})`
    log(`Вызов speak(): ${voice.lang}`)
    watchdog = window.setTimeout(() => {
      if (current !== utterance) return
      playback.textContent = 'За 8 секунд не пришло ни одного события воспроизведения.'
      log(`Тайм-аут диагностики: speaking=${synthesis.speaking}, pending=${synthesis.pending}`)
    }, 8000)
    // No promise or timer precedes speak(): Safari gets the original tap.
    synthesis.speak(utterance)
    log('speak() вернулся без исключения')
  } catch (error) {
    current = undefined
    window.clearTimeout(watchdog)
    playback.textContent = 'Не удалось вызвать speak().'
    failure(`speak: ${error instanceof Error ? error.name : 'unknown'}`)
  }
}

find('page-status').textContent = `Speech Test v2 · скрипт запущен · ${location.pathname}`
function workerStatus() {
  find('worker-status').textContent = !navigator.serviceWorker ? 'API недоступен' :
    navigator.serviceWorker.controller ? 'Есть контроллер страницы' : 'Нет контроллера страницы'
}
workerStatus()
navigator.serviceWorker?.addEventListener('controllerchange', workerStatus)
find('api-status').textContent = supported ? 'Доступен' : 'Недоступен'
find('refresh').addEventListener('click', () => refreshVoices('Обновить список'))
find('sound-check').addEventListener('click', (event) => speak(event))
document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((button) =>
  button.addEventListener('click', (event) => speak(event, button.dataset.sample)))
synthesis?.addEventListener('voiceschanged', () => refreshVoices('voiceschanged'))
window.addEventListener('pageshow', () => refreshVoices('pageshow'))
window.addEventListener('pagehide', () => {
  window.clearTimeout(watchdog)
  if (current) synthesis?.cancel()
  current = undefined
})
refreshVoices('Загрузка страницы')
for (const delay of [250, 1000, 2500]) window.setTimeout(() => refreshVoices(`Повтор ${delay} мс`), delay)
