/**
 * Folders and recordings. Every function is pure: it returns a new library
 * (or the same one when nothing changed) and never edits its input.
 */

export interface Folder {
  id: string
  name: string
  createdAt: number
}

export interface Recording {
  id: string
  /** null = Unfiled */
  folderId: string | null
  /** null = use the automatic title from the text */
  title: string | null
  text: string
  createdAt: number
  updatedAt: number
}

export interface Library {
  version: 1
  folders: Folder[]
  recordings: Recording[]
}

export interface FolderGroup {
  folder: Folder
  recordings: Recording[]
}

const TITLE_WORDS = 6

export function emptyLibrary(): Library {
  return { version: 1, folders: [], recordings: [] }
}

export function addFolder(lib: Library, name: string, id: string, now: number): Library {
  const trimmed = name.trim()
  if (!trimmed) return lib
  return { ...lib, folders: [...lib.folders, { id, name: trimmed, createdAt: now }] }
}

export function renameFolder(lib: Library, id: string, name: string): Library {
  const trimmed = name.trim()
  if (!trimmed) return lib
  return { ...lib, folders: lib.folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)) }
}

/** Removes the folder. Its recordings are kept and move to Unfiled. */
export function deleteFolder(lib: Library, id: string): Library {
  return {
    ...lib,
    folders: lib.folders.filter((f) => f.id !== id),
    recordings: lib.recordings.map((r) => (r.folderId === id ? { ...r, folderId: null } : r)),
  }
}

export function addRecording(lib: Library, id: string, folderId: string | null, now: number): Library {
  const recording: Recording = { id, folderId, title: null, text: '', createdAt: now, updatedAt: now }
  return { ...lib, recordings: [...lib.recordings, recording] }
}

function updateRecording(lib: Library, id: string, change: (r: Recording) => Recording): Library {
  if (!lib.recordings.some((r) => r.id === id)) return lib
  return { ...lib, recordings: lib.recordings.map((r) => (r.id === id ? change(r) : r)) }
}

export function setRecordingText(lib: Library, id: string, text: string, now: number): Library {
  return updateRecording(lib, id, (r) => ({ ...r, text, updatedAt: now }))
}

/** A blank title switches back to the automatic one. */
export function renameRecording(lib: Library, id: string, title: string): Library {
  return updateRecording(lib, id, (r) => ({ ...r, title: title.trim() || null }))
}

export function moveRecording(lib: Library, id: string, folderId: string | null): Library {
  if (folderId !== null && !lib.folders.some((f) => f.id === folderId)) return lib
  return updateRecording(lib, id, (r) => ({ ...r, folderId }))
}

export function deleteRecording(lib: Library, id: string): Library {
  return { ...lib, recordings: lib.recordings.filter((r) => r.id !== id) }
}

/** Used when a mic session ends: a recording where nothing was said isn't worth keeping. */
export function deleteIfEmpty(lib: Library, id: string): Library {
  const recording = lib.recordings.find((r) => r.id === id)
  return recording && !recording.text.trim() ? deleteRecording(lib, id) : lib
}

export function recordingTitle(recording: Recording): string {
  if (recording.title) return recording.title
  const words = recording.text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'New recording'
  const start = words.slice(0, TITLE_WORDS).join(' ').replace(/[.,!?;:]+$/, '')
  return words.length > TITLE_WORDS ? `${start}…` : start
}

const newestFirst = (a: Recording, b: Recording) => b.createdAt - a.createdAt

export function groupLibrary(lib: Library): { folders: FolderGroup[]; unfiled: Recording[] } {
  const folders = [...lib.folders]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .map((folder) => ({
      folder,
      recordings: lib.recordings.filter((r) => r.folderId === folder.id).sort(newestFirst),
    }))
  const folderIds = new Set(lib.folders.map((f) => f.id))
  const unfiled = lib.recordings
    .filter((r) => r.folderId === null || !folderIds.has(r.folderId))
    .sort(newestFirst)
  return { folders, unfiled }
}
