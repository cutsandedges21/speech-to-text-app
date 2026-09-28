/**
 * installed: running from the home screen / as an installed app, so no button.
 * ios: Safari can't be asked to install, so the button opens the step-by-step guide.
 * prompt: Chrome, Edge or Android offered their own install dialog.
 * none: this browser can't install web apps.
 */
export type InstallMode = 'installed' | 'ios' | 'prompt' | 'none'

export function isIos(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) return true
  // iPadOS requests desktop sites and says it's a Mac; only the touchscreen gives it away.
  return platform === 'MacIntel' && maxTouchPoints > 1
}

export function installMode(env: { standalone: boolean; ios: boolean; canPrompt: boolean }): InstallMode {
  if (env.standalone) return 'installed'
  if (env.ios) return 'ios'
  return env.canPrompt ? 'prompt' : 'none'
}
