interface Props {
  progress: number
  failed: boolean
  onRetry: () => void
}

export function ModelLoadingBar({ progress, failed, onRetry }: Props) {
  if (failed) {
    return (
      <div className="loader is-failed" role="alert">
        <span>Speech model download failed. Check your connection.</span>
        <button type="button" className="text-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  }

  const done = progress >= 1
  return (
    <div className="loader" role="status">
      <div className="loader-label">
        <span>{done ? 'Preparing speech model' : 'Downloading speech model'}</span>
        <span className="loader-pct">{done ? '' : `${Math.round(progress * 100)}%`}</span>
      </div>
      <div className="loader-track">
        <div className="loader-fill" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <p className="loader-note">One time, about 44 MB. After this it works offline.</p>
    </div>
  )
}
