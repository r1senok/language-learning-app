import { createHash } from 'node:crypto'
import { execFile, spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs, promisify } from 'node:util'
import { maxAudioBytes, phrases, preparedAudioId } from '../supabase/functions/_shared/audio-catalog.ts'
import { lessonAudioTexts } from '../src/lessons/audioTexts.ts'
import { importPreparedAudio } from './import-prepared-audio.mjs'

const run = promisify(execFile)
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')

export function estonianAudioPlan(rows, lesson = lessonAudioTexts()) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Каталог должен быть непустым массивом JSON с полями lemma.')
  const plan = new Map()
  function add(text, source, spoken = text) {
    if (typeof text !== 'string' || typeof spoken !== 'string' || !spoken.trim()) throw new Error('Некорректный текст аудио.')
    const id = preparedAudioId(text)
    if (!id) throw new Error(`Пустой или слишком длинный текст: ${text}`)
    const item = plan.get(id) ?? { id, text, spoken, sources: [] }
    if (!item.sources.includes(source)) item.sources.push(source)
    plan.set(id, item)
  }
  for (const text of Object.values(phrases)) add(text, 'pilot')
  for (const { lemma, spoken } of rows) {
    add(lemma, 'dictionary', spoken)
    if (spoken !== undefined) {
      const item = plan.get(preparedAudioId(lemma))
      if (item.override && item.spoken !== spoken) throw new Error(`Несовместимые варианты произношения для ${lemma}`)
      item.spoken = spoken
      item.override = true
    }
  }
  for (const text of lesson) add(text, 'lesson')
  return [...plan.values()].map(({ override, ...item }) => item)
}

function speak(tool, text, output) {
  return new Promise((done, fail) => {
    const child = spawn(tool, ['-v', 'et', '-s', '145', '-w', output, '--stdin'], { stdio: ['pipe', 'ignore', 'inherit'] })
    child.once('error', fail)
    child.stdin.on('error', fail)
    child.once('close', (code) => code === 0 ? done() : fail(new Error(`eSpeak NG завершился с кодом ${code}`)))
    child.stdin.end(text, 'utf8')
  })
}

async function prepare(plan, directory) {
  const espeak = process.env.ESPEAK_NG_BIN || 'espeak-ng'
  const ffmpeg = process.env.FFMPEG_BIN || 'ffmpeg'
  await mkdir(directory, { recursive: true })
  const manifestPath = join(directory, 'manifest.json')
  let previous = new Map()
  try {
    previous = new Map(JSON.parse(await readFile(manifestPath, 'utf8')).files.map((file) => [file.id, file]))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const start = await run(espeak, ['--voices=et'])
  if (!/^\s*\d+\s+et\s.+\burj\/et\b/m.test(start.stdout)) throw new Error('В eSpeak NG отсутствует встроенный эстонский голос et.')
  const temporary = await mkdtemp(join(tmpdir(), 'takku-espeak-batch-'))
  let cursor = 0
  let generated = 0
  const failures = []
  const files = new Array(plan.length)
  async function worker() {
    while (cursor < plan.length) {
      const index = cursor++
      const item = plan[index]
      const filename = `${item.id}.mp3`
      const destination = join(directory, filename)
      try {
        let bytes = await readFile(destination).catch((error) => {
          if (error.code !== 'ENOENT') throw error
          return undefined
        })
        const cached = previous.get(item.id)
        if (!bytes || !cached || cached.spoken !== item.spoken || cached.sha256 !== digest(bytes)) {
          const wav = join(temporary, `${item.id}.wav`)
          const mp3 = join(temporary, filename)
          await speak(espeak, item.spoken, wav)
          await run(ffmpeg, ['-nostdin', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', mp3])
          const created = await readFile(mp3)
          if (!created.length || created.length > maxAudioBytes) throw new Error('MP3 пустой или превышает 1 МиБ.')
          await run(ffmpeg, ['-nostdin', '-v', 'error', '-xerror', '-i', mp3, '-f', 'null', '-'])
          if (bytes && !bytes.equals(created)) throw new Error('Файл уже существует и отличается. Используйте новую выходную папку для повторной генерации.')
          if (!bytes) {
            await copyFile(mp3, destination, constants.COPYFILE_EXCL)
            generated++
          }
          bytes = created
        }
        files[index] = { ...item, filename, bytes: bytes.length, sha256: digest(bytes) }
      } catch (error) {
        failures.push({ filename, text: item.text, error: error.message })
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: 4 }, worker))
    await writeFile(manifestPath, JSON.stringify({ voice: 'espeak-ng:et', files: files.filter(Boolean), failures }, null, 2) + '\n')
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  console.log(`Подготовлено ${files.filter(Boolean).length}/${plan.length} MP3; новых ${generated}; отсутствуют или не проверены ${failures.length}.`)
  for (const failure of failures) console.error(`${failure.filename} (${failure.text}): ${failure.error}`)
  return failures.length
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      catalog: { type: 'string', default: 'supabase/grammar/review/working-647.json' },
      out: { type: 'string', default: '/tmp/takku-estonian-mp3' },
      url: { type: 'string' },
      upload: { type: 'boolean' },
    } })
    if (values.upload && (!values.url || !process.env.TAKKU_AUDIO_STORAGE_KEY)) {
      throw new Error('Для --upload нужны --url тестового проекта и TAKKU_AUDIO_STORAGE_KEY.')
    }
    const plan = estonianAudioPlan(JSON.parse(await readFile(values.catalog, 'utf8')))
    const errors = await prepare(plan, resolve(values.out))
    process.exitCode = Number(errors > 0)
    if (!errors && values.url) {
      const result = await importPreparedAudio({
        directory: values.out, url: values.url, key: process.env.TAKKU_AUDIO_STORAGE_KEY,
        upload: values.upload, checksums: Object.fromEntries(JSON.parse(await readFile(join(resolve(values.out), 'manifest.json'), 'utf8')).files.map(({ id, sha256 }) => [id, sha256])),
        catalog: Object.fromEntries(plan.map(({ id, text }) => [id, text])),
      })
      console.log(`Storage: записано ${result.uploaded}, ошибок ${result.errors}.`)
      process.exitCode = Number(result.errors > 0)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
