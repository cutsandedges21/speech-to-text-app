const KEY = 'speech-to-text:transcript'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export function loadTranscript(store: KeyValueStore = localStorage): string {
  try {
    return store.getItem(KEY) ?? ''
  } catch {
    return ''
  }
}

/** Best effort: if storage is full or blocked, the text just isn't saved. */
export function saveTranscript(text: string, store: KeyValueStore = localStorage): void {
  try {
    store.setItem(KEY, text)
  } catch {
    // ignore
  }
}
