/**
 * Light or dark, ported from the student-notes app. A module-level store (read
 * with useSyncExternalStore) because the theme is one class on <html>.
 * With no saved choice the app follows the phone's setting, live.
 */

import { flushSync } from 'react-dom'
import { runThemeChange, willUseViewTransition, type TransitionOrigin } from './themeTransition'

export type Theme = 'light' | 'dark'

/** Also read by the pre-paint script in index.html. Change both together. */
export const THEME_STORAGE_KEY = 'utter:theme'

/** Browser chrome colour per theme (the iOS status bar). Matches --paper in index.css. */
const CHROME: Record<Theme, string> = { light: '#f3eee3', dark: '#161512' }

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null // Safari private mode throws; the theme must never stop the app
  }
}

const systemTheme = (): Theme => (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light')

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[theme])
}

let current: Theme = 'light'
let initialised = false
const listeners = new Set<() => void>()

function write(theme: Theme, sync: boolean) {
  current = theme
  applyTheme(theme)
  // The view transition photographs the page when the callback returns, so React
  // has to have re-rendered the toggle by then.
  if (sync) flushSync(() => listeners.forEach((l) => l()))
  else listeners.forEach((l) => l())
}

function change(theme: Theme, origin?: TransitionOrigin) {
  if (theme === current) return
  runThemeChange(() => write(theme, willUseViewTransition()), origin)
}

function init() {
  if (initialised) return
  initialised = true
  // The pre-paint script already set the class; this only catches the store up.
  current = readStored() ?? systemTheme()
  applyTheme(current)
  window.matchMedia(DARK_QUERY).addEventListener('change', (e) => {
    if (!readStored()) change(e.matches ? 'dark' : 'light')
  })
}

export function subscribe(listener: () => void): () => void {
  init()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getTheme(): Theme {
  init()
  return current
}

/** Switches to the opposite of what is on screen and remembers the choice. */
export function toggleTheme(origin?: TransitionOrigin) {
  init()
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // A blocked store costs persistence, not the switch.
  }
  change(next, origin)
}
