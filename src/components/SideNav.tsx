import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { recordingTitle, type FolderGroup, type Recording } from '../library/library'
import { collapse, snappy, soft } from '../motion'
import { SwipeRow } from './SwipeRow'

const UNFILED = 'unfiled'

const formatDate = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface Props {
  groups: { folders: FolderGroup[]; unfiled: Recording[] }
  openId: string | null
  /** Folder of the open recording (null = Unfiled); expanded automatically. */
  openFolderId: string | null
  isOpen: boolean
  /** A dialog is open on top. */
  inert: boolean
  onClose: () => void
  onOpenRecording: (id: string) => void
  onNewRecording: (folderId: string | null) => void
  onAddFolder: () => void
  onRenameFolder: (id: string) => void
  onDeleteFolder: (id: string) => void
  onRenameRecording: (id: string) => void
  onDeleteRecording: (id: string) => void
}

export function SideNav({
  groups,
  openId,
  openFolderId,
  isOpen,
  inert,
  onClose,
  onOpenRecording,
  onNewRecording,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameRecording,
  onDeleteRecording,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([UNFILED]))
  const [menuFor, setMenuFor] = useState<string | null>(null)
  /** The one recording row swiped open, if any. */
  const [swiped, setSwiped] = useState<string | null>(null)

  // Opening a recording from anywhere reveals its folder.
  const openKey = openId ? (openFolderId ?? UNFILED) : null
  useEffect(() => {
    if (openKey) setExpanded((prev) => (prev.has(openKey) ? prev : new Set(prev).add(openKey)))
  }, [openKey])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // A closed drawer shouldn't reopen with a row still swiped.
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (!isOpen) setSwiped(null)
  }

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  // The list stays mounted when it empties, so the last row can still animate out.
  const list = (recordings: Recording[]) => (
    <>
      <AnimatePresence initial={false}>
        {recordings.length === 0 && (
          <motion.div key="empty" className="collapse-wrap" {...collapse}>
            <p className="group-empty">Nothing here yet</p>
          </motion.div>
        )}
      </AnimatePresence>
      <ul className="rec-list">
        <AnimatePresence initial={false}>
          {recordings.map((r) => (
            <motion.li
              key={r.id}
              className="rec-item"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0, x: -48 }}
              transition={{ height: soft, opacity: { duration: 0.22 }, x: soft }}
            >
              <SwipeRow
                open={swiped === r.id}
                onOpenChange={(open) => setSwiped(open ? r.id : (cur) => (cur === r.id ? null : cur))}
                onTap={() => onOpenRecording(r.id)}
                onRename={() => onRenameRecording(r.id)}
                onDelete={() => {
                  setSwiped(null)
                  onDeleteRecording(r.id)
                }}
                current={r.id === openId}
              >
                <span className="rec-title">{recordingTitle(r)}</span>
                <span className="rec-date">{formatDate.format(r.createdAt)}</span>
              </SwipeRow>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  )

  const act = (action: () => void) => () => {
    setMenuFor(null)
    action()
  }

  return (
    <>
      <div className={`scrim${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <nav className={`sidenav${isOpen ? ' is-open' : ''}`} aria-label="Recordings" inert={inert || undefined}>
        <div className="sidenav-head">
          <span className="sidenav-title">Recordings</span>
          <button type="button" className="icon-btn sidenav-close" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="sidenav-actions">
          <button type="button" className="pill-btn" onClick={() => onNewRecording(null)}>
            New recording
          </button>
          <button type="button" className="pill-btn" onClick={onAddFolder}>
            + Folder
          </button>
        </div>

        <div className="sidenav-scroll">
          <AnimatePresence initial={false}>
            {groups.folders.map(({ folder, recordings }) => (
              <motion.div key={folder.id} {...collapse} className="group-wrap">
                <Group
                  name={folder.name}
                  count={recordings.length}
                  expanded={expanded.has(folder.id)}
                  onToggle={() => toggle(folder.id)}
                  menuOpen={menuFor === folder.id}
                  onMenu={() => setMenuFor(menuFor === folder.id ? null : folder.id)}
                  menu={
                    <>
                      <button type="button" className="chip" onClick={act(() => onNewRecording(folder.id))}>
                        Record here
                      </button>
                      <button type="button" className="chip" onClick={act(() => onRenameFolder(folder.id))}>
                        Rename
                      </button>
                      <button type="button" className="chip is-danger" onClick={act(() => onDeleteFolder(folder.id))}>
                        Delete
                      </button>
                    </>
                  }
                >
                  {list(recordings)}
                </Group>
              </motion.div>
            ))}
          </AnimatePresence>

          <Group
            name="Unfiled"
            count={groups.unfiled.length}
            expanded={expanded.has(UNFILED)}
            onToggle={() => toggle(UNFILED)}
          >
            {list(groups.unfiled)}
          </Group>
        </div>
      </nav>
    </>
  )
}

interface GroupProps {
  name: string
  count: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  menu?: ReactNode
  menuOpen?: boolean
  onMenu?: () => void
}

function Group({ name, count, expanded, onToggle, children, menu, menuOpen, onMenu }: GroupProps) {
  return (
    <section className="group">
      <div className="group-row">
        <button type="button" className="group-toggle" aria-expanded={expanded} onClick={onToggle}>
          <svg className="chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
          <span className="group-name">{name}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={count}
              className="group-count"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={snappy}
            >
              {count}
            </motion.span>
          </AnimatePresence>
        </button>
        {menu && (
          // Three dots that fold into an X while the menu is open, so it reads as "tap to close".
          <button
            type="button"
            className={`icon-btn dots${menuOpen ? ' is-open' : ''}`}
            aria-label={menuOpen ? `Close ${name} options` : `${name} options`}
            aria-expanded={menuOpen}
            onClick={onMenu}
          >
            <span className="dot dot-a" aria-hidden="true" />
            <span className="dot dot-b" aria-hidden="true" />
            <span className="dot dot-c" aria-hidden="true" />
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div key="menu" className="group-menu-wrap" {...collapse}>
            <div className="group-menu">{menu}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div key="body" className="group-body" {...collapse}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
