import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { InstallGuide } from './components/InstallGuide'
import { ModelLoadingBar } from './components/ModelLoadingBar'
import { PromptDialog, type PromptRequest } from './components/PromptDialog'
import { RecordButton } from './components/RecordButton'
import { RecordingHeader } from './components/RecordingHeader'
import { SideNav } from './components/SideNav'
import { ThemeToggle } from './components/ThemeToggle'
import { TranscriptView } from './components/TranscriptView'
import { UndoToast, type Toast } from './components/UndoToast'
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
  restoreFolder,
  restoreRecording,
  setRecordingText,
} from './library/library'
import { useInstall } from './install/useInstall'
import { useLibrary } from './library/useLibrary'
import { useLiveTranscriber, type Status } from './live/useLiveTranscriber'
import { collapse, snappy } from './motion'

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
  const flash = () => {
    window.clearTimeout(timer.current)
    setOn(true)
    timer.current = window.setTimeout(() => setOn(false), ms)
  }
  return { on, flash }
}

export default function App() {
  const { library, update, saveFailed } = useLibrary()
  const [openId, setOpenId] = useState<string | null>(null)
  /** Where the next recording goes when no recording is open. */
  const [blankFolderId, setBlankFolderId] = useState<string | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [dialog, setDialog] = useState<PromptRequest | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const install = useInstall()
  /** The recording the mic is writing into. */
  const liveId = useRef<string | null>(null)

  const { status, progress, draft, error, level, start, stop, retryLoad } = useLiveTranscriber({
    onText: (id, committed) => update((lib) => setRecordingText(lib, id, committed, Date.now())),
    onSessionEnd: (id) => update((lib) => deleteIfEmpty(lib, id)),
  })

  const copied = useFlash(1500)
  const copyFailed = useFlash(4000)

  const groups = useMemo(() => groupLibrary(library), [library])
  const folders = useMemo(() => groups.folders.map((g) => g.folder), [groups])
  const open = library.recordings.find((r) => r.id === openId) ?? null
  const folderExists = (id: string | null) => id === null || folders.some((f) => f.id === id)
  const currentFolderId = open ? open.folderId : folderExists(blankFolderId) ? blankFolderId : null

  const busy = status === 'listening' || status === 'starting'
  const draftText = open && draft?.recordingId === open.id ? draft.text : ''
  const fullText = [open?.text, draftText].filter(Boolean).join(' ')

  const closeNav = useCallback(() => setNavOpen(false), [])
  const dismissToast = useCallback(() => setToast(null), [])

  /** Opens the in-app prompt. flushSync so its input is focused inside the tap and iOS shows the keyboard. */
  const ask = (request: Omit<PromptRequest, 'id'>) => flushSync(() => setDialog({ ...request, id: Date.now() }))

  const showUndo = (message: string, undo: () => void) => setToast({ id: Date.now(), message, undo })

  const record = () => {
    const id = crypto.randomUUID()
    update((lib) => addRecording(lib, id, currentFolderId, Date.now()))
    setOpenId(id)
    liveId.current = id
    start(id) // directly inside the tap, so iOS lets the mic start
  }

  const openRecording = (id: string) => {
    setOpenId(id)
    setNavOpen(false)
  }

  const newRecording = (folderId: string | null) => {
    setOpenId(null)
    setBlankFolderId(folderId)
    setNavOpen(false)
  }

  const createFolder = (then?: (id: string) => void) =>
    ask({
      title: 'New folder',
      placeholder: 'Folder name',
      confirmLabel: 'Create',
      onConfirm: (name) => {
        const id = crypto.randomUUID()
        update((lib) => addFolder(lib, name, id, Date.now()))
        then?.(id)
      },
    })

  const renameAFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id)
    if (!folder) return
    ask({
      title: 'Rename folder',
      value: folder.name,
      confirmLabel: 'Save',
      onConfirm: (name) => update((lib) => renameFolder(lib, id, name)),
    })
  }

  // Deleting is instant with an Undo, like LifeOS. Its recordings move to Unfiled.
  const deleteAFolder = (id: string) => {
    const folder = folders.find((f) => f.id === id)
    if (!folder) return
    const inside = library.recordings.filter((r) => r.folderId === id).map((r) => r.id)
    update((lib) => deleteFolder(lib, id))
    showUndo(`Deleted folder “${folder.name}”`, () => update((lib) => restoreFolder(lib, folder, inside)))
  }

  const renameARecording = (id: string) => {
    const recording = library.recordings.find((r) => r.id === id)
    if (!recording) return
    ask({
      title: 'Rename recording',
      value: recordingTitle(recording),
      hint: 'Leave it empty to use the first words.',
      confirmLabel: 'Save',
      allowEmpty: true,
      onConfirm: (title) => update((lib) => renameRecording(lib, id, title)),
    })
  }

  const deleteARecording = (id: string) => {
    const recording = library.recordings.find((r) => r.id === id)
    if (!recording) return
    if (busy && liveId.current === id) stop()
    const wasOpen = openId === id
    update((lib) => deleteRecording(lib, id))
    if (wasOpen) {
      setBlankFolderId(recording.folderId)
      setOpenId(null)
    }
    showUndo(`Deleted “${recordingTitle(recording)}”`, () => {
      update((lib) => restoreRecording(lib, recording))
      if (wasOpen) setOpenId((current) => current ?? recording.id)
    })
  }

  const changeFolder = (folderId: string | null) => {
    if (open) update((lib) => moveRecording(lib, open.id, folderId))
    else setBlankFolderId(folderId)
  }

  const copy = () => {
    navigator.clipboard.writeText(fullText).then(copied.flash, copyFailed.flash)
  }

  const notice = copyFailed.on
    ? "Couldn't copy. Press and hold the text to select it instead."
    : (error ?? (saveFailed ? 'Storage is full. New text may not be saved.' : null))

  const loaderShown = status === 'loading' || status === 'load-failed'

  // iPhone gets the guide; Chrome, Edge and Android get their own install dialog.
  const onInstall =
    install.mode === 'ios' ? () => setGuideOpen(true) : install.mode === 'prompt' ? install.promptInstall : undefined

  return (
    <MotionConfig reducedMotion="user">
      <div className="shell">
        <SideNav
          groups={groups}
          openId={open?.id ?? null}
          openFolderId={open?.folderId ?? null}
          isOpen={navOpen}
          inert={dialog !== null}
          onClose={closeNav}
          onOpenRecording={openRecording}
          onNewRecording={newRecording}
          onAddFolder={() => createFolder()}
          onRenameFolder={renameAFolder}
          onDeleteFolder={deleteAFolder}
          onRenameRecording={renameARecording}
          onDeleteRecording={deleteARecording}
        />

        <div className="app" inert={navOpen || dialog !== null || guideOpen || undefined}>
          <header className="top">
            <div className="top-left">
              <button type="button" className="icon-btn menu-btn" onClick={() => setNavOpen(true)} aria-label="Open recordings">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
              </button>
              <h1 className="brand">utter</h1>
            </div>
            <div className="top-right">
              <ThemeToggle />
              <span className={`status status-${status}`}>
                <span className="status-dot" aria-hidden="true" />
                <span className="status-label">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={status}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={snappy}
                    >
                      {STATUS_LABEL[status]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </div>
          </header>

          <div className="page">
            <RecordingHeader
              title={open ? recordingTitle(open) : 'New recording'}
              titleKey={`${openId ?? 'blank'}:${open?.title ?? ''}`}
              renamable={open !== null}
              folderId={currentFolderId}
              folders={folders}
              onRename={() => open && renameARecording(open.id)}
              onFolderChange={changeFolder}
              onNewFolder={() => createFolder(changeFolder)}
            />
            <TranscriptView
              key={openId ?? 'blank'}
              committed={open?.text ?? ''}
              draft={draftText}
              listening={busy && open !== null}
              onInstall={onInstall}
            />
          </div>

          <footer className="dock">
            <AnimatePresence initial={false}>
              {notice && (
                <motion.div key="notice" className="collapse-wrap" {...collapse}>
                  <p className="notice" role="alert">
                    {notice}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {loaderShown && (
                <motion.div key="loader" className="collapse-wrap" {...collapse}>
                  <ModelLoadingBar progress={progress} failed={status === 'load-failed'} onRetry={retryLoad} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="dock-row">
              <button type="button" className="text-btn" onClick={() => open && deleteARecording(open.id)} disabled={!open || busy}>
                Delete
              </button>
              <RecordButton status={status} level={level} onStart={record} onStop={stop} />
              <button type="button" className="text-btn swap-btn" onClick={copy} disabled={!fullText}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={copied.on ? 'copied' : 'copy'}
                    className="swap-label"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    transition={snappy}
                  >
                    {copied.on && (
                      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                    {copied.on ? 'Copied' : 'Copy'}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </footer>
        </div>

        <AnimatePresence>{toast && <UndoToast key={toast.id} toast={toast} onDismiss={dismissToast} />}</AnimatePresence>
        <AnimatePresence>{guideOpen && <InstallGuide key="install" onClose={() => setGuideOpen(false)} />}</AnimatePresence>
        <AnimatePresence>{dialog && <PromptDialog key={dialog.id} request={dialog} onClose={() => setDialog(null)} />}</AnimatePresence>
      </div>
    </MotionConfig>
  )
}
