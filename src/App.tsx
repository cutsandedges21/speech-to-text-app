import { useEffect, useRef, useState } from 'react'
import { ModelLoadingBar } from './components/ModelLoadingBar'
import { RecordButton } from './components/RecordButton'
import { TranscriptView } from './components/TranscriptView'
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
  const { status, progress, text, error, level, start, stop, clear, retryLoad } = useLiveTranscriber()
  const copied = useFlash(1500)
  const copyFailed = useFlash(4000)
  const confirmClear = useFlash(3000)

  const fullText = [text.committed, text.draft].filter(Boolean).join(' ')
  const listening = status === 'listening'

  const copy = () => {
    navigator.clipboard.writeText(fullText).then(copied.flash, copyFailed.flash)
  }

  // Two taps so one stray touch can't wipe the transcript.
  const onClear = () => {
    if (!confirmClear.on) return confirmClear.flash()
    clear()
    confirmClear.reset()
  }

  return (
    <div className="app">
      <header className="top">
        <h1 className="brand">Speech to Text</h1>
        <span className={`status status-${status}`}>
          <span className="status-dot" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </span>
      </header>

      <TranscriptView committed={text.committed} draft={text.draft} listening={listening} />

      <footer className="dock">
        {(error || copyFailed.on) && (
          <p className="notice" role="alert">
            {copyFailed.on ? "Couldn't copy. Press and hold the text to select it instead." : error}
          </p>
        )}
        {(status === 'loading' || status === 'load-failed') && (
          <ModelLoadingBar progress={progress} failed={status === 'load-failed'} onRetry={retryLoad} />
        )}
        <div className="dock-row">
          <button type="button" className="text-btn" onClick={onClear} disabled={!fullText}>
            {confirmClear.on ? 'Tap again' : 'Clear'}
          </button>
          <RecordButton status={status} level={level} onStart={start} onStop={stop} />
          <button type="button" className="text-btn" onClick={copy} disabled={!fullText}>
            {copied.on ? 'Copied' : 'Copy'}
          </button>
        </div>
      </footer>
    </div>
  )
}
