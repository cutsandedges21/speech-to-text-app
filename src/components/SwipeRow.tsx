import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { snappy } from '../motion'

/** Two 72 px buttons, like the LifeOS gym rows (which use 2 × 70). */
const ACTIONS_WIDTH = 144

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTap: () => void
  onRename: () => void
  onDelete: () => void
  current: boolean
  children: ReactNode
}

/**
 * Swipe left to reveal Rename and Delete. The gesture is LifeOS's
 * SwipeableExerciseRow (drag on x, constrained to the buttons' width, a little
 * elastic, buttons fading in over the first 40 px). Added here: it snaps open
 * or shut on release, and a tap on an open row closes it.
 */
export function SwipeRow({ open, onOpenChange, onTap, onRename, onDelete, current, children }: Props) {
  const x = useMotionValue(0)
  const actionsOpacity = useTransform(x, [0, -40], [0, 1])
  const renameX = useTransform(x, [0, -ACTIONS_WIDTH], [24, 0])
  const deleteX = useTransform(x, [0, -ACTIONS_WIDTH], [12, 0])
  // A drag ends with a click on the row underneath; this tells the two apart.
  const dragged = useRef(false)

  useEffect(() => {
    const controls = animate(x, open ? -ACTIONS_WIDTH : 0, snappy)
    return () => controls.stop()
  }, [open, x])

  const onDragEnd = (_: PointerEvent, info: PanInfo) => {
    const fling = info.velocity.x
    const next = fling < -350 ? true : fling > 350 ? false : x.get() < -ACTIONS_WIDTH / 2
    // Same state as before means the effect won't re-run, so settle here.
    if (next === open) animate(x, next ? -ACTIONS_WIDTH : 0, snappy)
    onOpenChange(next)
  }

  const onClick = () => {
    if (dragged.current) return
    if (open) onOpenChange(false)
    else onTap()
  }

  return (
    <div className="swipe">
      <motion.div className="swipe-actions" style={{ opacity: actionsOpacity }} aria-hidden={!open}>
        <motion.button
          type="button"
          className="swipe-btn is-rename"
          style={{ x: renameX }}
          tabIndex={open ? 0 : -1}
          onClick={() => {
            onOpenChange(false)
            onRename()
          }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4z" />
          </svg>
          Rename
        </motion.button>
        <motion.button
          type="button"
          className="swipe-btn is-delete"
          style={{ x: deleteX }}
          tabIndex={open ? 0 : -1}
          onClick={onDelete}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
          </svg>
          Delete
        </motion.button>
      </motion.div>

      <motion.div
        className="swipe-front"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -ACTIONS_WIDTH, right: 0 }}
        dragElastic={0.1}
        dragMomentum={false}
        style={{ x }}
        onPointerDown={() => {
          dragged.current = false
        }}
        onDragStart={() => {
          dragged.current = true
        }}
        onDragEnd={onDragEnd}
      >
        <button type="button" className="rec-row" aria-current={current ? 'true' : undefined} onClick={onClick}>
          {current && <motion.span layoutId="rec-current" className="rec-current" transition={snappy} aria-hidden="true" />}
          {children}
        </button>
      </motion.div>
    </div>
  )
}
