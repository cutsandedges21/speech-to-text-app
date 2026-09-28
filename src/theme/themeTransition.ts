/**
 * The light/dark change as an animation, ported from the student-notes app.
 *
 * With the View Transitions API (Safari 18+, Chrome) the browser snapshots the
 * page before and after, and the new theme is revealed through a circle growing
 * from the toggle. Without it, every colour cross-fades instead.
 * Reduced motion gets neither: the theme still changes, just instantly.
 */

/* The circle grows past the furthest corner so coverage finishes while it is
   still moving, instead of creeping the last few pixels. */
const REVEAL_OVERSHOOT = 1.25

/* The sweep's timing lives in index.css. This is only the fallback's. */
const FALLBACK_MS = 420

const TRANSITION_ATTR = 'data-theme-transition'
const FALLBACK_CLASS = 'theme-transitioning'

export interface TransitionOrigin {
  x: number
  y: number
}

interface ViewTransition {
  finished: Promise<void>
  skipTransition: () => void
}

type StartViewTransition = (callback: () => void | Promise<void>) => ViewTransition

function viewTransitionApi(): StartViewTransition | null {
  const start = (document as Document & { startViewTransition?: StartViewTransition }).startViewTransition
  return typeof start === 'function' ? start.bind(document) : null
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Whether the next change will be a circle sweep (the toggle icon snaps instead of springing then). */
export function willUseViewTransition(): boolean {
  return !prefersReducedMotion() && viewTransitionApi() !== null
}

function revealRadius({ x, y }: TransitionOrigin): number {
  const w = window.innerWidth
  const h = window.innerHeight
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * REVEAL_OVERSHOOT
}

let active: ViewTransition | null = null
let fallbackTimer: ReturnType<typeof setTimeout> | undefined

/** `apply` must make the whole change synchronously: the "after" snapshot is taken when it returns. */
export function runThemeChange(apply: () => void, origin?: TransitionOrigin): void {
  if (prefersReducedMotion()) {
    apply()
    return
  }

  const start = viewTransitionApi()
  if (!start) {
    const root = document.documentElement
    root.classList.add(FALLBACK_CLASS)
    apply()
    clearTimeout(fallbackTimer)
    fallbackTimer = setTimeout(() => root.classList.remove(FALLBACK_CLASS), FALLBACK_MS)
    return
  }

  const root = document.documentElement
  const point = origin ?? { x: window.innerWidth - 80, y: 40 }
  root.style.setProperty('--theme-origin-x', `${point.x}px`)
  root.style.setProperty('--theme-origin-y', `${point.y}px`)
  root.style.setProperty('--theme-reveal-r', `${revealRadius(point)}px`)
  root.setAttribute(TRANSITION_ATTR, '')

  // A second tap mid-sweep finishes the first at once instead of queueing behind it.
  active?.skipTransition()
  const transition = start(apply)
  active = transition

  void transition.finished
    .catch(() => undefined)
    .finally(() => {
      if (active !== transition) return
      active = null
      root.removeAttribute(TRANSITION_ATTR)
      root.style.removeProperty('--theme-origin-x')
      root.style.removeProperty('--theme-origin-y')
      root.style.removeProperty('--theme-reveal-r')
    })
}
