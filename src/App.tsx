import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ModelLoadingBar } from './components/ModelLoadingBar'
import { RecordButton } from './components/RecordButton'
import { RecordingHeader } from './components/RecordingHeader'
import { SideNav } from './components/SideNav'
import { TranscriptView } from './components/TranscriptView'
import {
  addFolder,
  addRecording,
  deleteFolder,
  deleteIfEmpty,
  deleteRecording,
  groupLibrary,
  moveRecording,
  recordingTitle,
  renameFolder,
  renameRecording,
  setRecordingText,
} from './library/library'
import { useLibrary } from './library/useLibrary'
import { useLiveTranscriber, type Status } from './live/useLiveTranscriber'

const STATUS_LABEL: Record<Status, string> = {
  loading: 'Loading',
  'load-failed': 'No model',
  ready: 'Ready',
  starting: 'Starting',
  listening: 'Listening',
}

/** A flag that turns itself off `ms` after `flash()` is called. */
function useFlash(ms: number) {
  const [on, setOn] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const reset = () => {
    window.clearTimeout(timer.current)
    setOn(false)
  }
  const flash = () => {
    window.clearTimeout(timer.current)
    setOn(true)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }
  return { on, flash, reset }
}

export default function App() {
  const { library, update, saveFailed } = useLibrary()
  const [openId, setOpenId] = useState<string | null>(null)
  /** Where the next recording goes when no recording is open. */
  const [blankFolderId, setBlankFolderId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const { status, progress, draft, error, level, start, stop, retryLoad } = useLiveTranscriber({
    onText: (id, committed) => update((lib) => setRecordingText(lib, id, committed, Date.now())),
    onSessionEnd: (id) => update((lib) => deleteIfEmpty(lib, id)),
  })

  const copied = useFlash(1500)
  const copyFailed = useFlash(4000)
  const confirmDelete = useFlash(3000)

  const groups = useMemo(() => groupLibrary(library), [library])
  const folders = useMemo(() => groups.folders.map((g) => g.folder), [groups])
  const open = library.recordings.find((r) => r.id === openId) ?? null
  const folderExists = (id: string | null) => id === null || folders.some((f) => f.id === id)
  const currentFolderId = open ? open.folderId : folderExists(blankFolderId) ? blankFolderId : null

  const busy = status === 'listening' || status === 'starting'
  const draftText = open && draft?.recordingId === open.id ? draft.text : ''
  const fullText = [open?.text, draftText].filter(Boolean).join(' ')

  const closeNav = useCallback(() => setNavOpen(false), [])

  const record = () => {
    const id = crypto.randomUUID()
    update((lib) => addRecording(lib, id, currentFolderId, Date.now()))
    setOpenId(id)
    confirmDelete.reset()
    start(id) // directly inside the tap, so iOS lets the mic start
  }

  const openRecording = (id: string) => {
    setOpenId(id)
    confirmDelete.reset()
    setNavOpen(false)
  }

  const newRecording = (folderId: string | null) => {
    setOpenId(null)
    setBlankFolderId(folderId)
    setNavOpen(false)
  }

  const addNewFolder = () => {
    const name = window.prompt('New folder name')
    if (name?.trim()) update((lib) => addFolder(lib, name, crypto.randomUUID(), Date.now()))
  }

  const renameAFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id)
    const name = folder && window.prompt('Rename folder', folder.name)
    if (name) update((lib) => renameFolder(lib, id, name))
  }

  const deleteAFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id)
    if (folder && window.confirm(`Delete the folder "${folder.name}"? Its recordings move to Unfiled.`)) {
      update((lib) => deleteFolder(lib, id))
    }
  }

  const renameOpen = () => {
    if (!open) return
    const title = window.prompt('Rename recording (leave empty to use the first words)', recordingTitle(open))
    if (title !== null) update((lib) => renameRecording(lib, open.id, title))
  }

  const changeFolder = (folderId: string | null) => {
    if (open) update((lib) => moveRecording(lib, open.id, folderId))
    else setBlankFolderId(folderId)
  }

  const copy = () => {
    navigator.clipboard.writeText(fullText).then(copied.flash, copyFailed.flash)
  }

  // Two taps so one stray touch can't delete a recording.
  const onDelete = () => {
    if (!open) return
    if (!confirmDelete.on) return confirmDelete.flash()
    update((lib) => deleteRecording(lib, open.id))
    setBlankFolderId(open.folderId)
    setOpenId(null)
    confirmDelete.reset()
  }

  const notice = copyFailed.on
    ? "Couldn't copy. Press and hold the text to select it instead."
    : (error ?? (saveFailed ? 'Storage is full. New text may not be saved.' : null))

  return (
    <div className="shell">
      <SideNav
        groups={groups}
        openId={open?.id ?? null}
        openFolderId={open?.folderId ?? null}
        isOpen={navOpen}
        onClose={closeNav}
        onOpenRecording={openRecording}
        onNewRecording={newRecording}
        onAddFolder={addNewFolder}
        onRenameFolder={renameAFolder}
        onDeleteFolder={deleteAFolder}
      />

      <div className="app" inert={navOpen || undefined}>
        <header className="top">
          <div className="top-left">
            <button type="button" className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open recordings">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
            <h1 className="brand">Speech to Text</h1>
          </div>
          <span className={`status status-${status}`}>
            <span className="status-dot" aria-hidden="true" />
            {STATUS_LABEL[status]}
          </span>
        </header>

        <div className="page">
          <RecordingHeader
            title={open ? recordingTitle(open) : 'New recording'}
            renamable={open !== null}
            folderId={currentFolderId}
            folders={folders}
            onRename={renameOpen}
            onFolderChange={changeFolder}
          />
          <TranscriptView
            key={openId ?? 'blank'}
            committed={open?.text ?? ''}
            draft={draftText}
            listening={busy && open !== null}
          />
        </div>

        <footer className="dock">
          {notice && (
            <p className="notice" role="alert">
              {notice}
            </p>
          )}
          {(status === 'loading' || status === 'load-failed') && (
            <ModelLoadingBar progress={progress} failed={status === 'load-failed'} onRetry={retryLoad} />
          )}
          <div className="dock-row">
            <button type="button" className="text-btn" onClick={onDelete} disabled={!open || busy}>
              {confirmDelete.on ? 'Tap again' : 'Delete'}
            </button>
            <RecordButton status={status} level={level} onStart={record} onStop={stop} />
            <button type="button" className="text-btn" onClick={copy} disabled={!fullText}>
              {copied.on ? 'Copied' : 'Copy'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
