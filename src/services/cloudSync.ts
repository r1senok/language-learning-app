import { emptyCloud, planAction, projectProgress } from '../domain/cloudProgress.ts'
import type { CloudAction, CloudPlan, CloudSnapshot } from '../domain/cloudProgress.ts'
import { isCatalogId, isWordId } from '../domain/wordId.ts'
import type { StoredProgress, Word } from '../types'
import type { TakkuClient } from './supabase'

export interface ProgressTransport {
  read(operation: string | undefined, signal: AbortSignal): Promise<CloudSnapshot>
  write(action: CloudAction, version: string, plan: CloudPlan, signal: AbortSignal): Promise<CloudSnapshot>
}

export function cloudTransport(client: TakkuClient, userId: string): ProgressTransport {
  return {
    async read(operation, signal) {
      const { data, error } = await client.rpc('read_takku_progress', {
        p_user: userId, ...(operation && { p_operation: operation }),
      }).retry(false).abortSignal(signal)
      if (error) throw error
      if (!isSnapshot(data)) throw new Error('Missing progress snapshot')
      return data
    },
    async write(action, version, plan, signal) {
      const { data, error } = await client.rpc('write_takku_progress', {
        p_user: userId, p_operation: action.id, p_version: version, p_decide_import: plan.decideImport,
        p_personal: plan.personal, p_progress: plan.progress,
      }).retry(false).abortSignal(signal)
      if (error) throw error
      if (!isSnapshot(data)) throw new Error('Missing progress acknowledgement')
      return data
    },
  }
}

interface Cache {
  snapshot?: CloudSnapshot
  pending: CloudAction[]
  catalog: Word[]
}

export function accountStorageKey(userId: string) {
  return `takku-cloud-progress-v1:${userId}`
}

const validStage = (stage: unknown) => stage === 0 || stage === 1 || stage === 2 || stage === 3

function isSnapshot(value: unknown): value is CloudSnapshot {
  const data = value as CloudSnapshot | null
  return Boolean(data && typeof data.version === 'string' && typeof data.imported === 'boolean' &&
    Array.isArray(data.personal) && data.personal.every((row) => row && isCatalogId(row.id) &&
      typeof row.lemma === 'string' && typeof row.translation === 'string' &&
      row.grammatical_forms && Array.isArray(row.hint_emojis)) &&
    Array.isArray(data.progress) && data.progress.every((row) => row && isCatalogId(row.id) &&
      (row.kind === 'personal' || row.kind === 'catalog') && validStage(row.stage)))
}

function validWord(word: Word) {
  return word && isWordId(word.id) && typeof word.estonian === 'string' &&
    typeof word.russian === 'string' && Array.isArray(word.emojis) &&
    word.emojis.every((emoji) => typeof emoji === 'string') && validStage(word.progress)
}

function validAction(action: CloudAction) {
  if (!action || !isCatalogId(action.id)) return false
  if (action.type === 'personal') return validWord(action.word)
  if (action.type === 'study') return validWord(action.word) &&
    validStage(action.stage) && validStage(action.expected) &&
    (action.placement === 'append' || action.placement === 'answer') &&
    typeof action.random === 'number' && action.random >= 0 && action.random < 1
  return action.type === 'import' && action.keys && (action.guest === null ||
    (Array.isArray(action.guest?.words) && action.guest.words.every(validWord) && Array.isArray(action.guest.queue)))
}

function readCache(storage: Storage | undefined, key: string): Cache {
  const cache: Cache = { pending: [], catalog: [] }
  if (!storage) return cache
  try {
    const data = JSON.parse(storage.getItem(key) ?? 'null') as Partial<Cache> | null
    if (isSnapshot(data?.snapshot)) cache.snapshot = data.snapshot
    if (Array.isArray(data?.catalog)) cache.catalog = data.catalog.filter(validWord)
  } catch {
    // The server can restore the confirmed snapshot separately from the outbox.
  }

  const entries: { at: number; action: CloudAction }[] = []
  for (let i = 0; i < storage.length; i++) {
    const entryKey = storage.key(i)
    if (!entryKey?.startsWith(`${key}:pending:`)) continue
    try {
      const entry = JSON.parse(storage.getItem(entryKey) ?? 'null')
      if (entry && typeof entry.at === 'number' && validAction(entry.action)) entries.push(entry)
    } catch {
      // Keep reading other operations when one entry is damaged.
    }
  }
  cache.pending = entries.sort((a, b) =>
    Number(b.action.type === 'import') - Number(a.action.type === 'import') || a.at - b.at)
    .map(({ action }) => action)
  return cache
}

export interface CloudView {
  progress: StoredProgress
  status: 'offline' | 'syncing' | 'synced'
  choice: 'empty' | 'existing' | null
  conflict: boolean
  storageFailed: boolean
  dormant: boolean
}

export class CloudSync {
  private cache: Cache
  private controller?: AbortController
  private running?: Promise<void>
  private confirmed = false
  private catalogReady = false
  private catalogKnown = false
  private offline = false
  private conflict = false
  private storageFailed = false
  private unpersisted = new Set<string>()
  private lastQueuedAt = 0
  private listeners = new Set<() => void>()
  private view: CloudView

  private userId: string
  private transport: ProgressTransport
  private storage: Storage | undefined
  private guest: StoredProgress | undefined
  private bundled: readonly Word[]

  constructor(userId: string, transport: ProgressTransport, storage: Storage | undefined,
    guest: StoredProgress | undefined, bundled: readonly Word[]) {
    this.userId = userId
    this.transport = transport
    this.storage = storage
    this.guest = guest
    this.bundled = bundled
    try { this.cache = readCache(storage, accountStorageKey(userId)) }
    catch { this.cache = { pending: [], catalog: [] } }
    this.view = this.buildView()
  }

  getView = () => this.view

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start() {
    this.controller = new AbortController()
    return this.refresh()
  }

  stop() {
    this.controller?.abort()
    this.controller = undefined
    this.running = undefined
  }

  setCatalog(catalog: Word[] | undefined) {
    if (catalog !== undefined) {
      this.cache.catalog = catalog
      this.catalogKnown = true
    }
    this.catalogReady = true
    this.publish(catalog !== undefined)
    if (this.running) void this.running.then(() => this.refresh())
    else void this.refresh()
  }

  enqueue(action: CloudAction) {
    this.cache.pending.push(action)
    this.persistAction(action)
    this.publish()
    return this.refresh()
  }

  decide(merge: boolean) {
    if (!this.view.choice) return
    const guest = merge ? this.guest ?? null : null
    const keys = Object.fromEntries((guest?.words ?? []).map(({ id }) => [id, crypto.randomUUID()]))
    const action = { type: 'import', id: crypto.randomUUID(), guest, keys } satisfies CloudAction
    this.cache.pending.unshift(action)
    this.persistAction(action)
    this.publish()
    return this.refresh()
  }

  discardConflict() {
    if (!this.conflict || this.running) return
    this.complete(this.nextAction()?.id)
    this.conflict = false
    this.publish(true)
    return this.refresh()
  }

  refresh = (): Promise<void> => {
    const signal = this.controller?.signal
    if (!signal || signal.aborted) return Promise.resolve()
    if (this.running) return this.running

    this.offline = false
    this.publish()
    const run = this.sync(signal).catch((error: { code?: string } | undefined) => {
      if (signal.aborted) return
      const permanent = error?.code && ['22023', '23503', '23505', '23514', '42501'].includes(error.code)
      this.conflict = Boolean(permanent && this.cache.pending.length)
      this.offline = !this.conflict
    }).finally(() => {
      if (signal.aborted) return
      this.running = undefined
      this.publish()
    })
    this.running = run
    this.publish()
    return run
  }

  private outboxKey(id: string) {
    return `${accountStorageKey(this.userId)}:pending:${id}`
  }

  private persistAction(action: CloudAction) {
    const at = this.lastQueuedAt = Math.max(Date.now(), this.lastQueuedAt + 1)
    try {
      if (!this.storage) throw new Error('Storage unavailable')
      this.storage.setItem(this.outboxKey(action.id), JSON.stringify({ at, action }))
    } catch {
      this.unpersisted.add(action.id)
    }
  }

  private complete(id: string | undefined) {
    if (!id) return
    this.cache.pending = this.cache.pending.filter((action) => action.id !== id)
    this.unpersisted.delete(id)
    try { this.storage?.removeItem(this.outboxKey(id)) } catch { /* a receipt makes future retries safe */ }
  }

  private catalog() {
    const words = new Map(this.bundled.map((word) => [word.id, word]))
    for (const word of this.cache.catalog) words.set(word.id, word)
    return [...words.values()]
  }

  private importChoice(): CloudView['choice'] {
    const snapshot = this.cache.snapshot
    if (!this.catalogReady || !this.confirmed || !snapshot || snapshot.imported || !this.guest ||
      this.cache.pending.some(({ type }) => type === 'import')) return null
    return snapshot.progress.length || snapshot.personal.length ? 'existing' : 'empty'
  }

  private isDormant(action: CloudAction) {
    if (!this.catalogKnown || action.type !== 'study' || action.word.personalId || !action.word.catalogId) return false
    const id = action.word.catalogId
    return !this.cache.catalog.some((word) => word.catalogId === id) &&
      !this.cache.snapshot?.progress.some((row) => row.kind === 'catalog' && row.id === id)
  }

  private nextAction() {
    return this.cache.pending.find((action) => !this.isDormant(action))
  }

  private buildView(): CloudView {
    const catalog = this.catalog()
    let snapshot = this.cache.snapshot ?? emptyCloud
    for (const action of this.cache.pending) {
      if (this.isDormant(action)) continue
      const plan = planAction(snapshot, action, catalog)
      if (!plan) break
      snapshot = plan.snapshot
    }

    return {
      progress: projectProgress(snapshot, catalog),
      status: this.offline ? 'offline'
        : this.running || this.nextAction() || !this.confirmed ? 'syncing' : 'synced',
      choice: this.importChoice(),
      conflict: this.conflict,
      storageFailed: this.storageFailed || this.unpersisted.size > 0,
      dormant: this.cache.pending.some((action) => this.isDormant(action)),
    }
  }

  private publish(save = false) {
    if (save) {
      try {
        if (!this.storage) throw new Error('Storage unavailable')
        const { snapshot, catalog } = this.cache
        this.storage.setItem(accountStorageKey(this.userId), JSON.stringify({ snapshot, catalog }))
        this.storageFailed = false
      } catch {
        this.storageFailed = true
      }
    }
    this.view = this.buildView()
    for (const listener of this.listeners) listener()
  }

  private async sync(signal: AbortSignal) {
    let attempt = 0
    while (!signal.aborted) {
      const action = this.nextAction()
      const snapshot = await this.transport.read(action?.id, signal)
      if (signal.aborted) return
      this.cache.snapshot = snapshot
      this.confirmed = true
      this.publish(true)
      if (!this.catalogReady) return
      if (!action || this.importChoice()) {
        this.conflict = false
        // A new action might have arrived while reading the initial snapshot.
        if (!action && this.nextAction() && !this.importChoice()) continue
        return
      }
      if (this.nextAction()?.id !== action.id) continue

      if (snapshot.acknowledged || (action.type === 'import' && snapshot.imported && !action.guest)) {
        this.complete(action.id)
        this.conflict = false
        this.publish(true)
        attempt = 0
        continue
      }
      if (action.type === 'import' && snapshot.imported) {
        this.conflict = true
        return
      }

      const plan = planAction(snapshot, action, this.catalog())
      if (!plan) {
        this.conflict = true
        return
      }
      this.conflict = false

      const result = await this.transport.write(action, snapshot.version, plan, signal)
      if (signal.aborted) return
      this.cache.snapshot = result
      if (result.acknowledged) {
        this.complete(action.id)
        attempt = 0
      } else if (++attempt >= 4) {
        throw new Error('Progress changed repeatedly')
      }
      this.publish(true)
    }
  }
}
