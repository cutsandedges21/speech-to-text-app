import { useLayoutEffect, useRef } from 'react'

interface Props {
  committed: string
  draft: string
  listening: boolean
}

export function TranscriptView({ committed, draft, listening }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Follow new text only while the reader is already at the bottom.
  const pinned = useRef(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [committed, draft])

  const onScroll = () => {
    const el = ref.current
    if (el) pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
  }

  const empty = !committed && !draft

  return (
    <main className="transcript" ref={ref} onScroll={onScroll}>
      {empty ? (
        <div className="transcript-empty">
          <p className="transcript-prompt">{listening ? 'Listening…' : 'Tap the mic and start talking.'}</p>
          <p className="transcript-note">Whisper runs on your phone. Nothing you say is uploaded.</p>
        </div>
      ) : (
        <p className="transcript-text" role="log" aria-live="polite">
          {committed}
          {draft && (
            <span className="draft" aria-hidden="true">
              {committed ? ' ' : ''}
              {draft}
            </span>
          )}
        </p>
      )}
    </main>
  )
}
