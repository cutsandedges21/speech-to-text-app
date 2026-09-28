import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { Folder } from '../library/library'
import { snappy } from '../motion'

interface Props {
  folderId: string | null
  folders: Folder[]
  onChange: (folderId: string | null) => void
  onNewFolder: () => void
}

/** "in Unfiled ⌄": a pill that opens a small menu of folders, replacing the native <select>. */
export function FolderPicker({ folderId, folders, onChange, onNewFolder }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const label = folders.find((f) => f.id === folderId)?.name ?? 'Unfiled'
  const options = [{ id: null, name: 'Unfiled' }, ...folders]

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (id: string | null) => {
    setOpen(false)
    if (id !== folderId) onChange(id)
  }

  return (
    <div className="folder-picker" ref={rootRef}>
      <span className="folder-picker-in">in</span>
      <button
        type="button"
        className={`folder-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Folder: ${label}`}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="folder-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.2h7a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
        </svg>
        <span className="folder-trigger-label">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={snappy}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
        <svg className="folder-chev" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="folder-menu"
            role="menu"
            aria-label="Move to folder"
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 560, damping: 34 }}
          >
            <div className="folder-menu-scroll">
              {options.map((o, i) => {
                const selected = o.id === folderId
                return (
                  <motion.button
                    key={o.id ?? 'unfiled'}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={`folder-option${selected ? ' is-selected' : ''}`}
                    onClick={() => pick(o.id)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...snappy, delay: 0.03 + Math.min(i, 8) * 0.025 }}
                  >
                    <span className="folder-option-name">{o.name}</span>
                    {selected && (
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </motion.button>
                )
              })}
            </div>
            <button
              type="button"
              role="menuitem"
              className="folder-option is-new"
              onClick={() => {
                setOpen(false)
                onNewFolder()
              }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New folder
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
