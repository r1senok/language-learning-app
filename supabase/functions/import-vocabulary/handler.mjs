const encoder = new TextEncoder()
const maxBytes = 512 * 1024
const lifetime = 15 * 60
const hex = (bytes) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
const response = (status, data) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store' },
})

class InputError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function readJson(request) {
  if (!request.body) throw new InputError('Требуется JSON.')
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let text = ''
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        throw new InputError('Размер JSON не должен превышать 512 КБ.', 413)
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } catch (error) {
    if (error instanceof InputError) throw error
    throw new InputError('JSON повреждён или имеет неверную кодировку.')
  } finally {
    reader.releaseLock()
  }
}

function field(value, name, limit) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || /\u0000/u.test(value)) {
    throw new InputError(`${name}: нужна непустая строка длиной до ${limit} символов.`)
  }
  return value.normalize('NFC').trim()
}

export function normalizeWords(words) {
  if (!Array.isArray(words) || words.length < 1 || words.length > 500) {
    throw new InputError('Поле words должно содержать от 1 до 500 записей.')
  }

  const seen = new Set()
  return words.map((word, index) => {
    const row = `Запись ${index + 1}`
    if (!word || typeof word !== 'object' || Array.isArray(word)) throw new InputError(`${row}: нужен объект.`)
    for (const key of Object.keys(word)) {
      if (!['estonian', 'russian', 'emoji', 'emojis', 'source', 'page', 'status'].includes(key)) {
        throw new InputError(`${row}: неизвестное поле ${key}.`)
      }
    }
    if (word.status !== undefined && !['draft', 'published'].includes(word.status)) {
      throw new InputError(`${row}: status должен быть draft или published.`)
    }
    const estonian = field(word.estonian, `${row}, estonian`, 250)
    const russian = field(word.russian, `${row}, russian`, 2000)
    const source = field(word.source, `${row}, source`, 500)
    const page = word.page === undefined ? source.match(/,\s*page\s+(\d+)$/iu)?.[1] ?? null
      : field(word.page, `${row}, page`, 80)
    const lemma = estonian.toLowerCase()
    if (seen.has(lemma)) throw new InputError(`${row}: слово «${estonian}» повторяется в файле.`)
    seen.add(lemma)
    if (word.emoji !== undefined && word.emojis !== undefined) {
      throw new InputError(`${row}: укажите emoji или emojis.`)
    }
    const hints = word.emojis === undefined ? (word.emoji === undefined ? [] : [word.emoji]) : word.emojis
    if (!Array.isArray(hints) || hints.length > 3) throw new InputError(`${row}: нужно от 0 до 3 подсказок.`)
    const emojis = hints.map((hint) => field(hint, `${row}, emoji`, 64))
    return { estonian, russian, emojis, source, page }
  })
}

export function createHandler({ token, url, serviceKey, fetcher = fetch, now = Date.now }) {
  let key
  const sign = (value) => crypto.subtle.sign('HMAC', key, encoder.encode(value))
  const verify = (signature, value) => crypto.subtle.verify('HMAC', key, signature, encoder.encode(value))

  return async (request) => {
    if (request.method !== 'POST') return response(405, { error: 'Используйте POST.' })
    if (!token || token.length < 32 || !url || !serviceKey) {
      return response(503, { error: 'Импорт не настроен.' })
    }

    try {
      const presented = request.headers.get('x-takku-import-token')
      if (!presented || presented.length > 512) return response(401, { error: 'Доступ отклонён.' })
      key ??= await crypto.subtle.importKey('raw', encoder.encode(token),
        { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
      if (!await verify(await sign(`auth:${token}`), `auth:${presented}`)) {
        return response(401, { error: 'Доступ отклонён.' })
      }

      const body = await readJson(request)
      if (!body || !['preview', 'commit'].includes(body.mode)) {
        throw new InputError('Укажите mode: preview или commit.')
      }
      const words = normalizeWords(body.words)
      const payloadHash = hex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(words))))
      const current = Math.floor(now() / 1000)
      let expected = null
      if (body.mode === 'commit') {
        const confirmation = typeof body.confirmation === 'string'
          ? /^(\d{1,12})\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(body.confirmation) : null
        if (!confirmation) return response(409, { error: 'Сначала выполните предпросмотр.' })
        const [, expiry, fingerprint, mac] = confirmation
        if (Number(expiry) <= current || !await verify(
          Uint8Array.from(mac.match(/../g), (byte) => parseInt(byte, 16)),
          `preview:${expiry}:${fingerprint}:${payloadHash}`,
        )) return response(409, { error: 'Подтверждение устарело или JSON изменился. Повторите предпросмотр.' })
        expected = fingerprint
      }

      const result = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/rpc/import_vocabulary_batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({ p_words: words, p_expected: expected }),
      })
      if (!result.ok) return response(502, { error: 'База не выполнила запрос. Повторите предпросмотр.' })
      const { fingerprint, ...summary } = await result.json()
      if (summary.status === 'stale') return response(409, { error: 'Данные в базе изменились. Повторите предпросмотр.' })
      if (summary.status !== (expected ? 'committed' : 'preview') || !/^[a-f0-9]{64}$/.test(fingerprint ?? '')) {
        return response(502, { error: 'База вернула неожиданный ответ. Повторите предпросмотр.' })
      }
      if (expected) return response(200, summary)

      const expiry = current + lifetime
      const mac = hex(await sign(`preview:${expiry}:${fingerprint}:${payloadHash}`))
      return response(200, { ...summary, confirmation: `${expiry}.${fingerprint}.${mac}` })
    } catch (error) {
      if (error instanceof InputError) return response(error.status, { error: error.message })
      return response(502, { error: 'Импорт недоступен. Повторите предпросмотр.' })
    }
  }
}
