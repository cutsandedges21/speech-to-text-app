import { useSyncExternalStore } from 'react'
import { installMode, isIos } from './platform'

/** Chrome/Edge/Android only; not in the DOM types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const ios = isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)

let offer: BeforeInstallPromptEvent | null = null
let installed = standalone()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

// Listening from the moment this module loads: the browser can make its offer
// before React has mounted anything.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault() // keep it for our button instead of the browser's mini-bar
  offer = e as BeforeInstallPromptEvent
  emit()
})
window.addEventListener('appinstalled', () => {
  installed = true
  offer = null
  emit()
})

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getMode = () => installMode({ standalone: installed, ios, canPrompt: offer !== null })

/** Shows the browser's own install dialog (Chrome, Edge, Android). */
async function promptInstall() {
  const event = offer
  if (!event) return
  offer = null // each offer can only be used once
  emit()
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') {
    installed = true
    emit()
  }
}

export function useInstall() {
  const mode = useSyncExternalStore(subscribe, getMode)
  return { mode, promptInstall }
}
