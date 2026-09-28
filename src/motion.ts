import type { Transition } from 'motion/react'

/** Springs shared across the app, so every moving part settles the same way. */
export const snappy: Transition = { type: 'spring', stiffness: 520, damping: 38 }
export const soft: Transition = { type: 'spring', stiffness: 320, damping: 32 }
export const bouncy: Transition = { type: 'spring', stiffness: 420, damping: 24 }

/** Height-and-fade reveal for anything that opens in place (menus, groups, notices). */
export const collapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { height: soft, opacity: { duration: 0.2 } },
} as const
