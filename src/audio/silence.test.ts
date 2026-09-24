import { describe, expect, test } from 'vitest'
import { createSpeechDetector, rms } from './silence'

const CHUNK = 683 // ~43 ms at 16 kHz, what the mic delivers

function tone(amplitude: number, n = CHUNK): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin((2 * Math.PI * 220 * i) / 16000)
  return out
}

let seed = 1
function noise(amplitude: number, n = CHUNK): Float32Array {
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    out[i] = amplitude * ((seed / 2147483648) * 2 - 1)
  }
  return out
}

describe('rms', () => {
  test('is 0 for silence', () => {
    expect(rms(new Float32Array(100))).toBe(0)
  })

  test('is amplitude / sqrt(2) for a sine wave', () => {
    expect(rms(tone(0.5, 16000))).toBeCloseTo(0.5 / Math.SQRT2, 3)
  })
})

describe('createSpeechDetector', () => {
  test('digital silence is not speech', () => {
    expect(createSpeechDetector()(new Float32Array(CHUNK))).toBe(false)
  })

  test('faint room hiss is not speech', () => {
    const isSpeech = createSpeechDetector()
    expect(isSpeech(noise(0.004))).toBe(false)
  })

  test('a normal speaking level is speech', () => {
    const isSpeech = createSpeechDetector()
    expect(isSpeech(tone(0.2))).toBe(true)
  })

  test('talking from the very first chunk keeps counting as speech', () => {
    const isSpeech = createSpeechDetector()
    const results = Array.from({ length: 10 }, () => isSpeech(tone(0.2)))
    expect(results.every(Boolean)).toBe(true)
  })

  test('steady loud background noise stops counting as speech after a few seconds', () => {
    const isSpeech = createSpeechDetector()
    let last = true
    for (let i = 0; i < 100; i++) last = isSpeech(noise(0.05)) // ~4.3 s
    expect(last).toBe(false)
  })

  test('speech over that background noise is still detected', () => {
    const isSpeech = createSpeechDetector()
    for (let i = 0; i < 100; i++) isSpeech(noise(0.05))
    expect(isSpeech(tone(0.3))).toBe(true)
  })
})
