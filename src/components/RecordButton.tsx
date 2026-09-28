import { motion, useSpring, useTransform } from 'motion/react'
import { useEffect } from 'react'
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
  const loudness = listening ? Math.min(1, Math.sqrt(level) * 2.2) : 0

  // The mic reports in bursts; a spring turns them into one continuous swell.
  const voice = useSpring(0, { stiffness: 260, damping: 20, mass: 0.7 })
  useEffect(() => voice.set(loudness), [loudness, voice])
  const ringScale = useTransform(voice, [0, 1], [1, 1.42])
  const ringOpacity = useTransform(voice, [0, 1], [0.35, 1])
  const coreScale = useTransform(voice, [0, 1], [1, 1.045])

  return (
    <button
      type="button"
      className={`record${listening ? ' is-listening' : ''}${status === 'starting' ? ' is-starting' : ''}`}
      disabled={disabled}
      onClick={listening ? onStop : onStart}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
      aria-pressed={listening}
    >
      <span className="record-ring-wrap" aria-hidden="true">
        <motion.span className="record-ring" style={{ scale: ringScale, opacity: ringOpacity }} />
      </span>
      {/* Two waves roll out once when the mic goes live. */}
      {listening && (
        <>
          <span className="record-wave" aria-hidden="true" />
          <span className="record-wave is-late" aria-hidden="true" />
        </>
      )}
      <motion.span className="record-core" style={{ scale: coreScale }} aria-hidden="true">
        <span className="record-press">
          <svg className="record-icon is-mic" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11.5" rx="3" fill="currentColor" stroke="none" />
            <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
          </svg>
          <svg className="record-icon is-stop" viewBox="0 0 24 24" width="26" height="26">
            <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
          </svg>
        </span>
      </motion.span>
    </button>
  )
}
