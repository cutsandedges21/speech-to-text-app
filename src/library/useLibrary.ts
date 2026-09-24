import { useCallback, useEffect, useState } from 'react'
import type { Library } from './library'
import { loadLibrary, saveLibrary } from './store'

/** The saved folders and recordings, kept in React state and written to storage on every change. */
export function useLibrary() {
  const [library, setLibrary] = useState<Library>(() => loadLibrary())
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => setSaveFailed(!saveLibrary(library)), [library])

  /** Pass one of the pure functions from library.ts, e.g. update((lib) => addFolder(lib, ...)). */
  const update = useCallback((change: (lib: Library) => Library) => setLibrary(change), [])

  return { library, update, saveFailed }
}
