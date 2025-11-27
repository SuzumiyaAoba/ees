/**
 * IndexedDB storage for FileSystemDirectoryHandle
 * Allows persisting directory handles across sessions
 */

const DB_NAME = 'EES_DirectoryHandles'
const DB_VERSION = 1
const STORE_NAME = 'handles'

interface StoredHandle {
  id: string
  handle: FileSystemDirectoryHandle
  directoryName: string
  savedAt: number
}

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Save directory handle to IndexedDB
 */
export async function saveDirectoryHandle(
  id: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const data: StoredHandle = {
      id,
      handle,
      directoryName: handle.name,
      savedAt: Date.now(),
    }

    const request = store.put(data)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

/**
 * Get directory handle from IndexedDB
 */
export async function getDirectoryHandle(
  id: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => {
      const result = request.result as StoredHandle | undefined
      resolve(result?.handle || null)
    }
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

/**
 * Check if we still have permission to access the directory
 */
export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // Request permission (will return 'granted' if already granted)
    const permission = await handle.requestPermission({ mode: 'read' })
    return permission === 'granted'
  } catch {
    return false
  }
}

/**
 * Delete directory handle from IndexedDB
 */
export async function deleteDirectoryHandle(id: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}

/**
 * List all stored directory handles
 */
export async function listDirectoryHandles(): Promise<StoredHandle[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)

    transaction.oncomplete = () => db.close()
  })
}
