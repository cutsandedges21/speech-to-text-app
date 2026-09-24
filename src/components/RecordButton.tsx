import type { CSSProperties } from 'react'
import type { Status } from '../live/useLiveTranscriber'

interface Props {
  status: Status
  /** Current mic loudness (RMS). */
  level: number
  onStart: () => void
  onStop: () => void
}

export function RecordButton({ status, level, onStart, onStop }: Props) {
  const listening = status === 'listening'
  const disabled = status === 'loading' || status === 'load-failed' || status === 'starting'
  // Speech sits around 0.02–0.2 RMS; stretch that across the ring's range.
  const ring = Math.min(1, Math.sqrt(level) * 2.2)

  return (
    <button
      type="button"
      className={`record${listening ? ' is-listening' : ''}${status === 'starting' ? ' is-starting' : ''}`}
      style={{ '--level': listening ? ring : 0 } as CSSProperties}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
      aria-pressed={listening}
    >
      <span className="record-ring" aria-hidden="true" />
      <span className="record-core" aria-hidden="true">
        {listening ? (
          <svg viewBox="0 0 24 24" width="26" height="26">
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11.5" rx="3" fill="currentColor" stroke="none" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
          </svg>
        )}
      </span>
    </button>
  )
}
