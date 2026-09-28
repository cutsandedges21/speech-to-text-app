import { describe, expect, test } from 'vitest'
import { installMode, isIos } from './platform'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0 Mobile/15E148 Safari/604.1'
// iPadOS asks for desktop sites by default and reports itself as a Mac
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15'
const MAC_SAFARI = IPAD_DESKTOP_MODE
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0 Mobile Safari/537.36'

describe('isIos', () => {
  test('iPhone Safari and iPhone Chrome', () => {
    expect(isIos(IPHONE_SAFARI, 'iPhone', 5)).toBe(true)
    expect(isIos(IPHONE_CHROME, 'iPhone', 5)).toBe(true)
  })

  test('iPad pretending to be a Mac', () => {
    expect(isIos(IPAD_DESKTOP_MODE, 'MacIntel', 5)).toBe(true)
  })

  test('a real Mac and Android are not iOS', () => {
    expect(isIos(MAC_SAFARI, 'MacIntel', 0)).toBe(false)
    expect(isIos(ANDROID_CHROME, 'Linux armv8l', 5)).toBe(false)
  })
})

describe('installMode', () => {
  test('already installed wins over everything', () => {
    expect(installMode({ standalone: true, ios: true, canPrompt: true })).toBe('installed')
  })

  test('iOS gets the guide, since Safari has no install prompt', () => {
    expect(installMode({ standalone: false, ios: true, canPrompt: false })).toBe('ios')
  })

  test('Chrome, Edge and Android use their own prompt', () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: true })).toBe('prompt')
  })

  test('browsers with no way to install get no button', () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: false })).toBe('none')
  })
})
