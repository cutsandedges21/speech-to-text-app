import { useEffect, useState, type ReactNode } from 'react'
import { recordingTitle, type FolderGroup, type Recording } from '../library/library'

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
  onClose: () => void
  onOpenRecording: (id: string) => void
  onNewRecording: (folderId: string | null) => void
  onAddFolder: () => void
  onRenameFolder: (id: string) => void
  onDeleteFolder: (id: string) => void
}

export function SideNav({
  groups,
  openId,
  openFolderId,
  isOpen,
  onClose,
  onOpenRecording,
  onNewRecording,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([UNFILED]))
  const [menuFor, setMenuFor] = useState<string | null>(null)

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

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const list = (recordings: Recording[]) =>
    recordings.length === 0 ? (
      <p className="group-empty">Nothing here yet</p>
    ) : (
      <ul className="rec-list">
        {recordings.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="rec-row"
              aria-current={r.id === openId ? 'true' : undefined}
              onClick={() => onOpenRecording(r.id)}
            >
              <span className="rec-title">{recordingTitle(r)}</span>
              <span className="rec-date">{formatDate.format(r.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    )

  const act = (action: () => void) => () => {
    setMenuFor(null)
    action()
  }

  return (
    <>
      <div className={`scrim${isOpen ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <nav className={`sidenav${isOpen ? ' is-open' : ''}`} aria-label="Recordings">
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
          {groups.folders.map(({ folder, recordings }) => (
            <Group
              key={folder.id}
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
          ))}

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
          <span className="group-count">{count}</span>
        </button>
        {menu && (
          <button type="button" className="icon-btn" aria-label={`${name} options`} aria-expanded={menuOpen} onClick={onMenu}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        )}
      </div>
      {menuOpen && <div className="group-menu">{menu}</div>}
      {expanded && children}
    </section>
  )
}
