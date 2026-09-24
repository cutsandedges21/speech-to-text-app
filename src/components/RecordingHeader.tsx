import type { Folder } from '../library/library'

interface Props {
  title: string
  /** False on the blank "new recording" screen. */
  renamable: boolean
  folderId: string | null
  folders: Folder[]
  onRename: () => void
  onFolderChange: (folderId: string | null) => void
}

export function RecordingHeader({ title, renamable, folderId, folders, onRename, onFolderChange }: Props) {
  return (
    <div className="rec-header">
      <h2 className="rec-heading">
        {renamable ? (
          <button type="button" onClick={onRename} title="Rename">
            {title}
          </button>
        ) : (
          title
        )}
      </h2>
      <label className="folder-picker">
        <span>in</span>
        <select value={folderId ?? ''} onChange={(e) => onFolderChange(e.target.value || null)} aria-label="Folder">
          <option value="">Unfiled</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </label>
    </div>
  )
}
