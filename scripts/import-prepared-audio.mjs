import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { audioBucket, maxAudioBytes, phrases, preparedAudioId, preparedAudioPath } from '../supabase/functions/_shared/audio-catalog.ts'

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

export async function importPreparedAudio({ directory, url, key, upload = false, catalog = phrases, checksums = {}, request = fetch, report = console.log }) {
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
  for (const [id, text] of Object.entries(catalog)) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Некорректный ID аудио.')
    const filename = `${id}.mp3`
    const target = `${audioBucket}/${preparedAudioPath(id)}`
    try {
      const bytes = await readFile(resolve(directory, filename))
      if (bytes.length > maxAudioBytes || !looksLikeMp3(bytes)) {
        throw new Error('Ожидается файл MP3 до 1 МиБ.')
      }
      if (checksums[id] && createHash('sha256').update(bytes).digest('hex') !== checksums[id]) {
        throw new Error('Контрольная сумма отличается от манифеста.')
      }
      let exists = false
      if (storage) {
        const response = await request(`${storage}/info/${target}`, { headers, signal: AbortSignal.timeout(15_000), redirect: 'error' })
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
        body: bytes, signal: AbortSignal.timeout(30_000), redirect: 'error',
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
    const { values, positionals } = parseArgs({
      options: { url: { type: 'string' }, upload: { type: 'boolean' }, manifest: { type: 'boolean' } },
      allowPositionals: true,
    })
    const [directory] = positionals
    if (positionals.length !== 1) {
      throw new Error('Использование: node scripts/import-prepared-audio.mjs <папка> [--manifest] [--url https://PROJECT.supabase.co] [--upload]')
    }
    const { url, upload } = values
    let catalog
    let checksums
    if (values.manifest) {
      const { files, failures } = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'))
      if (!Array.isArray(files) || !files.length || !Array.isArray(failures) || failures.length ||
          new Set(files.map(({ id }) => id)).size !== files.length ||
          files.some(({ id, text, sha256 }) => typeof text !== 'string' || id !== preparedAudioId(text) ||
            typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(sha256))) {
        throw new Error('Манифест неполный или содержит неверные ID или контрольные суммы.')
      }
      catalog = Object.fromEntries(files.map(({ id, text }) => [id, text]))
      checksums = Object.fromEntries(files.map(({ id, sha256 }) => [id, sha256]))
    }
    const result = await importPreparedAudio({ directory, url, key: url ? process.env.TAKKU_AUDIO_STORAGE_KEY : undefined,
      upload, catalog, checksums })
    console.log(`${upload ? 'Запись' : 'Предпросмотр'}: загружено ${result.uploaded}, ошибок ${result.errors}.`)
    process.exitCode = Number(result.errors > 0)
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
