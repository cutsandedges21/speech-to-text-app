import { AnimatePresence, motion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { snappy } from '../motion'

interface Props {
  committed: string
  draft: string
  listening: boolean
  /** Shows the "Install utter" button on the empty page. Omitted once installed. */
  onInstall?: () => void
}

export function TranscriptView({ committed, draft, listening, onInstall }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Follow new text only while the reader is already at the bottom.
  const pinned = useRef(true)
  // An opened recording starts at the top; only new text scrolls.
  const mounted = useRef(false)

  // Where the newest finished sentence starts. It inks in from draft grey, so the
  // switch from italic guess to final text reads as one motion.
  const [prev, setPrev] = useState(committed)
  const [freshFrom, setFreshFrom] = useState(committed.length)
  if (committed !== prev) {
    setPrev(committed)
    setFreshFrom(committed.startsWith(prev) ? prev.length : committed.length)
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (el && mounted.current && pinned.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    mounted.current = true
  }, [committed, draft])

  // Only scrolling up unpins. The smooth follow-scroll moves down in steps that
  // can briefly sit far from the bottom, and must not count as the reader leaving.
  const lastTop = useRef(0)
  const onScroll = () => {
    const el = ref.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) pinned.current = true
    else if (el.scrollTop < lastTop.current) pinned.current = false
    lastTop.current = el.scrollTop
  }

  const empty = !committed && !draft

  return (
    <main className="transcript" ref={ref} onScroll={onScroll}>
      {empty ? (
        <div className="transcript-empty">
          <p className="transcript-prompt">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={listening ? 'on' : 'off'}
                className="transcript-prompt-text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={snappy}
              >
                {listening ? 'Listening…' : 'Tap the mic and start talking.'}
              </motion.span>
            </AnimatePresence>
          </p>
          <p className="transcript-note">utter runs on your phone. Nothing you say is uploaded.</p>
          <AnimatePresence initial={false}>
            {onInstall && !listening && (
              <motion.button
                key="install"
                type="button"
                className="install-pill"
                onClick={onInstall}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
                transition={{ ...snappy, delay: 0.35 }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v10M8 10.5l4 4 4-4M5 19h14" />
                </svg>
                Install utter
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <p className="transcript-text" role="log" aria-live="polite">
          {committed.slice(0, freshFrom)}
          <span key={freshFrom} className="fresh">
            {committed.slice(freshFrom)}
          </span>
          {draft && (
            <span key={`d${freshFrom}`} className="draft" aria-hidden="true">
              {committed ? ' ' : ''}
              {draft}
            </span>
          )}
          {listening && <span className="caret" aria-hidden="true" />}
        </p>
      )}
    </main>
  )
}
