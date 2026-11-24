import './speech-test.css'

const synthesis = window.speechSynthesis
const voiceStatus = document.querySelector<HTMLParagraphElement>('#voice-status')!
const playback = document.querySelector<HTMLParagraphElement>('#playback-status')!
const voices = document.querySelector<HTMLUListElement>('#voices')!
const count = document.querySelector<HTMLParagraphElement>('#voice-count')!
let current: SpeechSynthesisUtterance | undefined
const language = (voice: SpeechSynthesisVoice) => voice.lang.trim().toLowerCase().replace(/_/g, '-')

function refreshVoices() {
  const available = synthesis?.getVoices() ?? []
  const estonian = available.find((voice) => language(voice) === 'et-ee')
    ?? available.find((voice) => language(voice) === 'et')
  voices.replaceChildren(...available.map((voice) => {
    const item = document.createElement('li')
    item.textContent = `${voice.name} — ${voice.lang}`
    return item
  }))
  count.textContent = `Найдено голосов: ${available.length}`
  voiceStatus.textContent = estonian
    ? `Эстонский голос доступен: ${estonian.name} (${estonian.lang})`
    : 'Эстонский голос недоступен'
  return estonian
}

document.querySelector('#refresh')?.addEventListener('click', refreshVoices)
document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((button) => {
  button.addEventListener('click', () => {
    // Read the latest list and invoke speak() inside the original tap on Safari.
    const voice = refreshVoices()
    current = undefined
    synthesis?.cancel()
    playback.textContent = ''
    if (!voice || !synthesis || typeof window.SpeechSynthesisUtterance !== 'function') return

    const utterance = new SpeechSynthesisUtterance(button.dataset.sample!)
    current = utterance
    utterance.voice = voice
    utterance.lang = language(voice) === 'et-ee' ? 'et-EE' : 'et'
    playback.textContent = 'Готовим произношение…'
    utterance.onstart = () => {
      if (current === utterance) playback.textContent = 'Воспроизводится…'
    }
    utterance.onend = () => {
      if (current === utterance) playback.textContent = 'Воспроизведение завершено.'
    }
    utterance.onerror = ({ error }) => {
      if (current === utterance) playback.textContent = `Ошибка воспроизведения: ${error}`
    }
    try {
      synthesis.speak(utterance)
    } catch {
      playback.textContent = 'Браузер не смог запустить произношение.'
    }
  })
})

synthesis?.addEventListener('voiceschanged', refreshVoices)
window.addEventListener('pageshow', refreshVoices)
window.addEventListener('pagehide', () => {
  current = undefined
  synthesis?.cancel()
})
refreshVoices()
// Some Safari versions populate the list after the initial document is ready.
for (const delay of [250, 1000, 2500]) window.setTimeout(refreshVoices, delay)
