import { AnimatePresence, motion } from 'motion/react'
import type { Folder } from '../library/library'
import { soft } from '../motion'
import { FolderPicker } from './FolderPicker'

interface Props {
  title: string
  /** Changes when the title should animate (another recording, a rename), not on every auto-title word. */
  titleKey: string
  /** False on the blank "new recording" screen. */
  renamable: boolean
  folderId: string | null
  folders: Folder[]
  onRename: () => void
  onFolderChange: (folderId: string | null) => void
  onNewFolder: () => void
}

export function RecordingHeader({ title, titleKey, renamable, folderId, folders, onRename, onFolderChange, onNewFolder }: Props) {
  return (
    <div className="rec-header">
      <h2 className="rec-heading">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={titleKey}
            className="rec-heading-inner"
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={soft}
          >
            {renamable ? (
              <button type="button" onClick={onRename} title="Rename">
                {title}
              </button>
            ) : (
              title
            )}
          </motion.span>
        </AnimatePresence>
      </h2>
      <FolderPicker folderId={folderId} folders={folders} onChange={onFolderChange} onNewFolder={onNewFolder} />
    </div>
  )
}
