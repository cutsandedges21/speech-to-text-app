import { motion, useReducedMotion, type PanInfo } from 'motion/react'
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { bouncy, snappy } from '../motion'

interface Props {
  onClose: () => void
}

interface Step {
  icon: ReactNode
  title: string
  detail: string
}

const STEPS: Step[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5v11M8 7.5l4-4 4 4" />
        <path d="M8.5 10.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2h-1.5" />
      </svg>
    ),
    title: 'Tap Share',
    detail: "It's in Safari's toolbar. If you don't see it, tap ⋯ first.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M12 8.5v7M8.5 12h7" />
      </svg>
    ),
    title: 'Tap Add to Home Screen',
    detail: "Scroll down the list if it isn't showing.",
  },
  {
    icon: <img src="/logo.svg" alt="" width="44" height="44" />,
    title: 'Tap Add',
    detail: 'Leave "Open as Web App" on if you see it. Then open utter from your Home Screen.',
  },
]

/** How long each step stays highlighted in the demo loop. */
const STEP_MS = 1900

/** The "Install utter" sheet for iPhone and iPad, where Safari can't be asked to install. */
export function InstallGuide({ onClose }: Props) {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  // Walks through the steps on a loop, like a tiny demo.
  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), STEP_MS)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  // Drag the sheet down to dismiss it, like any iOS sheet.
  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose()
  }

  return (
    <div className="sheet-layer" onKeyDown={onKeyDown}>
      <motion.div
        className="dialog-scrim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.24 } }}
        transition={{ duration: 0.3 }}
      />
      <motion.section
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.6 }}
        onDragEnd={onDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="sheet-grabber" aria-hidden="true" />

        <motion.div
          className="sheet-hero"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...bouncy, delay: 0.1 }}
        >
          <img src="/logo.svg" alt="" width="64" height="64" />
        </motion.div>

        <motion.h2
          id="install-title"
          className="sheet-title"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.14 }}
        >
          Install utter
        </motion.h2>
        <motion.p
          className="sheet-lede"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.18 }}
        >
          It goes on your Home Screen, opens full screen, and works offline after the first launch.
        </motion.p>

        <ol className="steps">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              className={`step${i === active ? ' is-active' : ''}`}
              onClick={() => setActive(i)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...snappy, delay: 0.24 + i * 0.07 }}
            >
              {i === active && <motion.span layoutId="step-active" className="step-highlight" transition={snappy} />}
              <span className="step-icon" aria-hidden="true">
                {step.icon}
              </span>
              <span className="step-text">
                <span className="step-title">
                  <span className="step-num">{i + 1}</span>
                  {step.title}
                </span>
                <span className="step-detail">{step.detail}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <motion.button
          type="button"
          className="sheet-done"
          onClick={onClose}
          autoFocus
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.46 }}
          whileTap={{ scale: 0.97 }}
        >
          Got it
        </motion.button>
      </motion.section>
    </div>
  )
}
