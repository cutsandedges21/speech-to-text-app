import { motion } from 'motion/react'
import { useEffect } from 'react'
import { bouncy } from '../motion'

export interface Toast {
  id: number
  message: string
  undo: () => void
}

/** Same as LifeOS: one toast at a time, gone after 6 s. */
export const TOAST_MS = 6000

interface Props {
  toast: Toast
  onDismiss: () => void
}

/** "Deleted …  Undo", after LifeOS's UndoToast. The bar drains as the time runs out. */
export function UndoToast({ toast, onDismiss }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  const undo = () => {
    toast.undo()
    onDismiss()
  }

  return (
    <motion.div
      className="toast"
      role="status"
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.97, transition: { duration: 0.2 } }}
      transition={bouncy}
    >
      <span className="toast-message">{toast.message}</span>
      <motion.button type="button" className="toast-undo" onClick={undo} whileTap={{ scale: 0.92 }}>
        Undo
      </motion.button>
      <span className="toast-timer" style={{ animationDuration: `${TOAST_MS}ms` }} aria-hidden="true" />
    </motion.div>
  )
}
