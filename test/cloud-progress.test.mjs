import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CloudSync, accountStorageKey } from '../src/services/cloudSync.ts'
import { emptyCloud, planAction, projectProgress } from '../src/domain/cloudProgress.ts'

const uid = () => crypto.randomUUID()
const first = { id: 1, catalogId: uid(), estonian: 'tere', russian: 'привет', emojis: [], category: 'Общение', progress: 0 }
const second = { id: uid(), catalogId: uid(), estonian: 'töö', russian: 'работа', emojis: [], category: 'Общение', progress: 0 }
const legacy = { id: 9, estonian: 'kass', russian: 'кот', emojis: ['🐈'], category: 'Дом', progress: 0 }
const catalog = [first, second, legacy]
const action = (word, expected, stage, placement = 'append') =>
  ({ id: uid(), type: 'study', word, expected, stage, placement, random: 0 })

function storage() {
  const values = new Map()
  return {
    get length() { return values.size },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function server() {
  const accounts = new Map()
  function account(id) {
    if (!accounts.has(id)) accounts.set(id, {
      data: { ...structuredClone(emptyCloud), version: '0' }, operations: new Set(), writes: 0,
    })
    return accounts.get(id)
  }
  const api = { offline: false, loseResponse: false, beforeWrite: null, account }
  api.transport = (user) => ({
    async read(operation) {
      if (api.offline) throw Error('offline')
      const { data, operations } = account(user)
      return structuredClone({ ...data, acknowledged: operations.has(operation) })
    },
    async write(operation, version, plan) {
      if (api.offline) throw Error('offline')
      if (api.beforeWrite) {
        const callback = api.beforeWrite
        api.beforeWrite = null
        await callback()
      }
      const state = account(user)
      if (state.operations.has(operation.id)) return structuredClone({ ...state.data, acknowledged: true })
      if (state.data.version !== version) return structuredClone({ ...state.data, acknowledged: false })
      const ids = new Map(plan.personal.map((person) => [person.id, uid()]))
      const personal = state.data.personal.concat(plan.personal.map((person) => ({
        ...person, id: ids.get(person.id), client_key: person.id,
      })))
      const progress = new Map(state.data.progress.map((row) => [row.id, row]))
      for (const row of plan.progress) {
        const id = row.kind === 'personal' ? ids.get(row.id) ?? row.id : row.id
        progress.set(id, { ...row, id, revision: (row.revision ?? 0) + 1 })
      }
      state.writes++
      state.data = { version: String(state.writes), personal, progress: [...progress.values()],
        imported: plan.snapshot.imported, acknowledged: false }
      state.operations.add(operation.id)
      if (api.loseResponse) { api.loseResponse = false; throw Error('response lost') }
      return structuredClone({ ...state.data, acknowledged: true })
    },
  })
  return api
}

const device = async (api, user, disk = storage(), guest) => {
  const sync = new CloudSync(user, api.transport(user), disk, guest, catalog)
  sync.setCatalog(catalog)
  await sync.start()
  return sync
}
const stage = (sync, word) => sync.getView().progress.words.find(({ id }) => id === word.id)?.progress
const queue = (sync) => sync.getView().progress.queue

test('saves and restores both study directions, queue additions/removals and learned stage', async () => {
  const api = server(), user = uid()
  const sync = await device(api, user)
  await sync.enqueue(action(first, 0, 1))
  await sync.enqueue(action(second, 0, 1))
  await sync.enqueue(action(first, 1, 2, 'answer'))
  assert.deepEqual(queue(sync), [second.id, first.id])
  await sync.enqueue(action(second, 1, 1, 'answer'))
  assert.deepEqual(queue(sync), [first.id, second.id])
  await sync.enqueue(action(first, 2, 3, 'answer'))
  await sync.enqueue(action(second, 1, 0))
  const other = await device(api, user)
  assert.equal(stage(other, first), 3)
  assert.equal(stage(other, second), 0)
  assert.deepEqual(queue(other), [])
  assert.equal(other.getView().status, 'synced')
})

test('transfers once after confirmation, preserves learned progress and imports personal words', async () => {
  const api = server(), user = uid()
  const firstDevice = await device(api, user)
  await firstDevice.enqueue(action(first, 0, 1))
  await firstDevice.enqueue(action(first, 1, 2, 'answer'))
  await firstDevice.enqueue(action(first, 2, 3, 'answer'))
  const personal = { ...legacy, id: 123456789, progress: 1 }
  const guest = { words: [{ ...first, progress: 1 }, personal], queue: [first.id, personal.id] }
  const secondDevice = await device(api, user, storage(), guest)
  assert.equal(secondDevice.getView().choice, 'existing')
  assert.equal(api.account(user).data.personal.length, 0)
  await secondDevice.decide(true)
  assert.equal(stage(secondDevice, first), 3)
  assert.equal(api.account(user).data.personal.length, 1)
  assert.deepEqual(queue(secondDevice), [personal.id])
  assert.deepEqual(guest.queue, [first.id, personal.id])

  const restored = await device(api, user, storage(), guest)
  assert.equal(restored.getView().choice, null)
  assert.deepEqual(queue(restored), queue(secondDevice))
  assert.equal(api.account(user).data.personal.length, 1)
})

test('uses cloud explicitly without altering local source or repeating the prompt', async () => {
  const api = server(), user = uid()
  const guest = { words: [{ ...legacy, progress: 2 }], queue: [legacy.id] }
  const sync = await device(api, user, storage(), guest)
  assert.equal(sync.getView().choice, 'empty')
  await sync.decide(false)
  assert.deepEqual(queue(sync), [])
  assert.deepEqual(guest.queue, [legacy.id])
  assert.equal((await device(api, user, storage(), guest)).getView().choice, null)
})

test('preserves bundled progress without a published legacy mapping', async () => {
  const api = server(), user = uid()
  const sync = await device(api, user)
  await sync.enqueue(action(legacy, 0, 1))
  assert.equal(api.account(user).data.personal[0].legacy_id, legacy.id)
  const restored = await device(api, user)
  assert.equal(stage(restored, legacy), 1)
  assert.deepEqual(queue(restored), [legacy.id])
})

test('rebases independent device actions and asks before dropping a conflicting action', async () => {
  const api = server(), user = uid()
  const a = await device(api, user)
  const b = await device(api, user)
  api.beforeWrite = () => b.enqueue(action(second, 0, 1))
  await a.enqueue(action(first, 0, 1))
  assert.deepEqual(queue(a), [second.id, first.id])
  await b.refresh()
  await a.enqueue(action(first, 1, 2, 'answer'))
  await b.enqueue(action(first, 1, 0))
  assert.equal(b.getView().conflict, true)
  assert.equal(stage(b, first), 2)
  await b.discardConflict()
  assert.equal(b.getView().conflict, false)
  assert.equal(stage(b, first), 2)
})

test('retries offline changes from disk and acknowledges a committed request only once', async () => {
  const api = server(), user = uid(), disk = storage()
  const a = await device(api, user, disk)
  api.offline = true
  await a.enqueue(action(first, 0, 1))
  await a.enqueue(action(first, 1, 2, 'answer'))
  assert.equal(a.getView().status, 'offline')
  assert.equal(stage(a, first), 2)
  assert.equal(api.account(user).writes, 0)
  a.stop()

  const b = await device(api, user, disk)
  assert.equal(stage(b, first), 2)
  api.offline = false
  api.loseResponse = true
  await b.refresh()
  assert.equal(b.getView().status, 'offline')
  assert.equal(api.account(user).writes, 1)
  await b.refresh()
  assert.equal(api.account(user).writes, 2)
  assert.equal(stage(b, first), 2)
  assert.equal(b.getView().status, 'synced')
})

test('switching accounts isolates local caches and unsent actions', async () => {
  const api = server(), user = uid(), other = uid(), disk = storage()
  disk.setItem('takku-estonian-v1', 'guest snapshot')
  const a = await device(api, user, disk)
  await a.enqueue(action(first, 0, 1))
  api.offline = true
  await a.enqueue(action(first, 1, 2, 'answer'))
  a.stop()
  const b = await device(api, other, disk)
  assert.equal(stage(b, first), 0)
  assert.deepEqual(queue(b), [])
  assert.equal(disk.getItem('takku-estonian-v1'), 'guest snapshot')
  assert.notEqual(accountStorageKey(user), accountStorageKey(other))
  api.offline = false
  await b.refresh()
  assert.equal(api.account(other).data.progress.length, 0)
  assert.equal(api.account(user).data.progress[0].stage, 1)
  const resumed = await device(api, user, disk)
  assert.equal(stage(resumed, first), 2)
})

test('an existing cloud snapshot and queued operations do not overwrite hidden catalog rows', () => {
  const hidden = { id: uid(), kind: 'catalog', stage: 1, queue_position: 0, revision: 1 }
  const current = { ...emptyCloud, progress: [hidden] }
  const plan = planAction(current, action(first, 0, 1), catalog)
  assert.deepEqual(plan.progress.map(({ id }) => id), [first.catalogId])
  assert.deepEqual(projectProgress(plan.snapshot, catalog).queue, [first.id])
})

test('a concurrent import is surfaced and the losing guest copy is left intact', async () => {
  const api = server(), user = uid()
  const guest1 = { words: [{ ...first, progress: 1 }], queue: [first.id] }
  const guest2 = { words: [{ ...second, progress: 1 }], queue: [second.id] }
  const a = await device(api, user, storage(), guest1)
  const b = await device(api, user, storage(), guest2)
  await a.decide(true)
  await b.decide(true)
  assert.equal(b.getView().conflict, true)
  assert.deepEqual(guest2.queue, [second.id])
  assert.equal(api.account(user).data.progress.length, 1)
  await b.discardConflict()
  assert.deepEqual(queue(b), [first.id])
  assert.equal(b.getView().choice, null)
})

test('offline tabs sharing localStorage persist separate operations', async () => {
  const api = server(), user = uid(), disk = storage()
  const a = await device(api, user, disk)
  const b = await device(api, user, disk)
  api.offline = true
  await a.enqueue(action(first, 0, 1))
  await b.enqueue(action(second, 0, 1))
  a.stop()
  b.stop()
  api.offline = false
  const restored = await device(api, user, disk)
  assert.equal(api.account(user).writes, 2)
  assert.ok(queue(restored).includes(first.id))
  assert.ok(queue(restored).includes(second.id))
})

test('hidden catalog rows do not make a visible missed card repeat immediately', () => {
  const current = { ...emptyCloud, progress: [
    { id: first.catalogId, kind: 'catalog', stage: 1, queue_position: 0, revision: 1 },
    { id: uid(), kind: 'catalog', stage: 1, queue_position: 1, revision: 1 },
    { id: second.catalogId, kind: 'catalog', stage: 1, queue_position: 2, revision: 1 },
  ] }
  const plan = planAction(current, action(first, 1, 1, 'answer'), catalog)
  assert.deepEqual(projectProgress(plan.snapshot, catalog).queue, [second.id, first.id])
})
