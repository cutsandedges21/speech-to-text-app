import { describe, expect, test } from 'vitest'
import { addFolder, emptyLibrary } from './library'
import { LIBRARY_KEY, loadLibrary, OLD_TRANSCRIPT_KEY, saveLibrary } from './store'

function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const brokenStore = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {},
}

const newId = () => 'id-1'

describe('library storage', () => {
  test('starts empty when nothing is saved', () => {
    expect(loadLibrary(memoryStore(), newId, 0)).toEqual(emptyLibrary())
  })

  test('a saved library comes back on the next load', () => {
    const store = memoryStore()
    const lib = addFolder(emptyLibrary(), 'Errands', 'f1', 1)
    expect(saveLibrary(lib, store)).toBe(true)
    expect(loadLibrary(store, newId, 0)).toEqual(lib)
  })

  test('moves the old single transcript into one Unfiled recording', () => {
    const store = memoryStore({ [OLD_TRANSCRIPT_KEY]: 'Earlier words.' })
    const lib = loadLibrary(store, newId, 42)
    expect(lib.recordings).toEqual([
      { id: 'id-1', folderId: null, title: null, text: 'Earlier words.', createdAt: 42, updatedAt: 42 },
    ])
    expect(store.data.has(OLD_TRANSCRIPT_KEY)).toBe(false)
    expect(JSON.parse(store.data.get(LIBRARY_KEY)!)).toEqual(lib)
  })

  test('a blank old transcript does not create a recording', () => {
    const store = memoryStore({ [OLD_TRANSCRIPT_KEY]: '  ' })
    expect(loadLibrary(store, newId, 0).recordings).toEqual([])
  })

  test('unreadable saved data starts an empty library instead of crashing', () => {
    const store = memoryStore({ [LIBRARY_KEY]: '{not json' })
    expect(loadLibrary(store, newId, 0)).toEqual(emptyLibrary())
  })

  test('a storage failure never crashes the app', () => {
    expect(loadLibrary(brokenStore, newId, 0)).toEqual(emptyLibrary())
    expect(saveLibrary(emptyLibrary(), brokenStore)).toBe(false)
  })
})
