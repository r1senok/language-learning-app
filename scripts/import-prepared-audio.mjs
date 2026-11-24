import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { audioBucket, maxAudioBytes, phrases, preparedAudioPath } from '../supabase/functions/_shared/audio-catalog.ts'

function looksLikeMp3(bytes) {
  return bytes.length >= 10 && (bytes.subarray(0, 3).toString() === 'ID3' ||
    (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0))
}

async function isMissing(response) {
  if (response.status === 404) return true
  if (response.status !== 400) return false
  const error = await response.json().catch(() => ({}))
  return String(error.statusCode) === '404'
}

export async function importPreparedAudio({ directory, url, key, upload = false, request = fetch, report = console.log }) {
  if (upload && (!url || !key)) throw new Error('Для записи нужны --url и TAKKU_AUDIO_STORAGE_KEY.')
  if (Boolean(url) !== Boolean(key)) throw new Error('Для проверки Storage укажите --url и TAKKU_AUDIO_STORAGE_KEY вместе.')
  let storage
  if (url) {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('Укажите HTTPS-адрес проекта Supabase без пути и параметров.')
    }
    storage = `${parsed.origin}/storage/v1/object`
    report(`Проект: ${parsed.origin}`)
  }
  const headers = key ? { apikey: key } : {}
  if (key?.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  let errors = 0
  const plan = []
  for (const [id, text] of Object.entries(phrases)) {
    const filename = `${id}.mp3`
    const target = `${audioBucket}/${preparedAudioPath(id)}`
    try {
      const bytes = await readFile(resolve(directory, filename))
      if (bytes.length > maxAudioBytes || !looksLikeMp3(bytes)) {
        throw new Error('Ожидается файл MP3 до 1 МиБ.')
      }
      let exists = false
      if (storage) {
        const response = await request(`${storage}/info/${target}`, { headers, signal: AbortSignal.timeout(15_000) })
        exists = response.ok
        if (!exists && !await isMissing(response)) throw new Error(`Проверка Storage не выполнена (HTTP ${response.status}).`)
      }
      report(`${exists ? 'Уже есть, пропускаем' : 'Готов'}: ${filename} → ${text} → ${target}`)
      if (!exists) plan.push({ filename, target, bytes })
    } catch (error) {
      errors++
      report(`${filename} → ${text}: ${error.code === 'ENOENT' ? 'файл отсутствует' : error.message}`)
    }
  }
  if (errors || !upload) return { errors, uploaded: 0 }
  let uploaded = 0
  for (const { filename, target, bytes } of plan) {
    try {
      const response = await request(`${storage}/${target}`, {
        method: 'POST', headers: { ...headers, 'content-type': 'audio/mpeg', 'x-upsert': 'false', 'cache-control': 'max-age=3600' },
        body: bytes, signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`загрузка отклонена (HTTP ${response.status}); существующий файл защищён от перезаписи`)
      uploaded++
      report(`Загружен: ${filename}`)
    } catch (error) {
      errors++
      report(`${filename}: ${error.message}`)
    }
  }
  return { errors, uploaded }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const directory = process.argv[2]
    const args = process.argv.slice(3)
    const urlIndex = args.indexOf('--url')
    const url = urlIndex < 0 ? undefined : args[urlIndex + 1]
    const upload = args.includes('--upload')
    if (!directory || directory.startsWith('--') || (urlIndex >= 0 && (!url || url.startsWith('--'))) ||
        args.some((arg, index) => arg !== '--upload' && arg !== '--url' && !(urlIndex >= 0 && index === urlIndex + 1))) {
      throw new Error('Использование: node scripts/import-prepared-audio.mjs <папка> [--url https://PROJECT.supabase.co] [--upload]')
    }
    const result = await importPreparedAudio({ directory, url, key: url ? process.env.TAKKU_AUDIO_STORAGE_KEY : undefined, upload })
    console.log(`${upload ? 'Запись' : 'Предпросмотр'}: загружено ${result.uploaded}, ошибок ${result.errors}.`)
    process.exitCode = Number(result.errors > 0)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
