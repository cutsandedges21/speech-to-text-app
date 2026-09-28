import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { bouncy, snappy } from '../motion'

export interface PromptRequest {
  id: number
  title: string
  value?: string
  placeholder?: string
  hint?: string
  confirmLabel: string
  /** An empty answer is allowed (a recording falls back to its automatic title). */
  allowEmpty?: boolean
  onConfirm: (value: string) => void
}

interface Props {
  request: PromptRequest
  onClose: () => void
}

/** How long the check mark shows before the card lifts away. */
const ACCEPT_MS = 460

/**
 * The in-app replacement for window.prompt. Must be opened with flushSync from
 * the tap handler: iOS only raises the keyboard for a focus() made during the tap.
 */
export function PromptDialog({ request, onClose }: Props) {
  const [value, setValue] = useState(request.value ?? '')
  const [accepted, setAccepted] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useLayoutEffect(() => {
    const input = inputRef.current
    input?.focus({ preventScroll: true })
    input?.select()
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (accepted) return
    if (!request.allowEmpty && !value.trim()) {
      setShake(true)
      inputRef.current?.focus()
      return
    }
    setAccepted(true)
    inputRef.current?.blur() // drops the iOS keyboard while the check plays
    timer.current = window.setTimeout(() => {
      request.onConfirm(value)
      onClose()
    }, ACCEPT_MS)
  }

  const cancel = () => {
    if (!accepted) onClose()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation() // the side nav also closes on Escape
    cancel()
  }

  const titleId = `dialog-title-${request.id}`
  const hintId = `dialog-hint-${request.id}`

  return (
    <div className="dialog-layer" onKeyDown={onKeyDown}>
      <motion.div
        className="dialog-scrim"
        onClick={cancel}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.24, delay: accepted ? 0.06 : 0 } }}
        transition={{ duration: 0.28 }}
      />
      <motion.form
        className={`dialog${accepted ? ' is-accepted' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={request.hint ? hintId : undefined}
        onSubmit={submit}
        initial={{ opacity: 0, y: 26, scale: 0.94 }}
        animate={accepted ? { opacity: 1, y: 0, scale: [1, 1.025, 1] } : { opacity: 1, y: 0, scale: 1 }}
        exit={
          accepted
            ? { opacity: 0, y: -22, scale: 0.97, transition: { duration: 0.26, ease: [0.4, 0, 1, 1] } }
            : { opacity: 0, y: 16, scale: 0.96, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }
        }
        transition={accepted ? { duration: 0.32, ease: 'easeOut' } : bouncy}
      >
        <motion.h2
          id={titleId}
          className="dialog-title"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.05 }}
        >
          {request.title}
        </motion.h2>

        <motion.input
          ref={inputRef}
          className={`dialog-input${shake ? ' is-shaking' : ''}`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onAnimationEnd={() => setShake(false)}
          placeholder={request.placeholder}
          aria-label={request.title}
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={accepted}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.09 }}
        />

        {request.hint && (
          <motion.p
            id={hintId}
            className="dialog-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.14, duration: 0.3 }}
          >
            {request.hint}
          </motion.p>
        )}

        <motion.div
          className="dialog-actions"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...snappy, delay: 0.13 }}
        >
          <button type="button" className="text-btn" onClick={cancel} disabled={accepted}>
            Cancel
          </button>
          {/* Shrinks from a pill into a circle, then the check draws itself. */}
          <motion.button
            type="submit"
            className="dialog-confirm"
            initial={false}
            animate={{ width: accepted ? 44 : 'auto' }}
            transition={snappy}
            aria-label={accepted ? 'Saved' : undefined}
          >
            {accepted ? (
              <motion.svg
                key="check"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={bouncy}
              >
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
                />
              </motion.svg>
            ) : (
              <span>{request.confirmLabel}</span>
            )}
          </motion.button>
        </motion.div>
      </motion.form>
    </div>
  )
}
