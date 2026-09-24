import { addRecording, emptyLibrary, setRecordingText, type Library } from './library'

/**
 * All reads and writes of saved recordings go through here, so moving to
 * IndexedDB later (needed if audio is ever saved) only touches this file.
 */

export const LIBRARY_KEY = 'speech-to-text:library'
/** Where v1 kept its single running transcript. */
export const OLD_TRANSCRIPT_KEY = 'speech-to-text:transcript'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function isLibrary(value: unknown): value is Library {
  const v = value as Library | null
  return v?.version === 1 && Array.isArray(v.folders) && Array.isArray(v.recordings)
}

export function loadLibrary(
  store: KeyValueStore = localStorage,
  newId: () => string = () => crypto.randomUUID(),
  now: number = Date.now(),
): Library {
  try {
    const saved = store.getItem(LIBRARY_KEY)
    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved)
      return isLibrary(parsed) ? parsed : emptyLibrary()
    }

    // First launch after the folders update: keep the old transcript as a recording.
    const old = store.getItem(OLD_TRANSCRIPT_KEY)?.trim()
    if (!old) return emptyLibrary()
    const id = newId()
    const lib = setRecordingText(addRecording(emptyLibrary(), id, null, now), id, old, now)
    if (saveLibrary(lib, store)) store.removeItem(OLD_TRANSCRIPT_KEY)
    return lib
  } catch {
    return emptyLibrary()
  }
}

/** Returns false if the phone's storage is full or blocked. */
export function saveLibrary(lib: Library, store: KeyValueStore = localStorage): boolean {
  try {
    store.setItem(LIBRARY_KEY, JSON.stringify(lib))
    return true
  } catch {
    return false
  }
}
