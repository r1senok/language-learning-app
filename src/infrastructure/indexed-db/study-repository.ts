import { emptySession } from '../../domain/study/session'
import type { StudyRepository, StudySession } from '../../domain/study/session'

const storeName = 'study'
const sessionKey = 'session'

export function createStudyRepository(name = 'sonavara-progress'): StudyRepository {
  let connection: Promise<IDBDatabase> | undefined

  function open() {
    connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(storeName)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          connection = undefined
        }
        resolve(db)
      }
    }).catch((error: unknown) => {
      connection = undefined
      throw error
    })
    return connection
  }

  async function access(change?: (session: StudySession) => StudySession) {
    const db = await open()
    return new Promise<StudySession>((resolve, reject) => {
      const transaction = db.transaction(storeName, change ? 'readwrite' : 'readonly')
      const store = transaction.objectStore(storeName)
      const request = store.get(sessionKey)
      let result: StudySession

      request.onsuccess = () => {
        const current = (request.result as StudySession | undefined) ?? emptySession
        try {
          result = change ? change(current) : current
          if (change && result !== current) store.put(result, sessionKey)
        } catch (error) {
          transaction.abort()
          reject(error)
        }
      }
      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error ?? new Error('Study transaction aborted'))
    })
  }

  return { read: () => access(), update: (change) => access(change) }
}
