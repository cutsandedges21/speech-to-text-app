import { describe, expect, test } from 'vitest'
import { createResampler } from './resample'

function sine(freq: number, rate: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.round(rate * seconds))
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * freq * i) / rate)
  return out
}

function zeroCrossings(x: Float32Array): number {
  let n = 0
  for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 !== x[i] < 0) n++
  return n
}

describe('createResampler', () => {
  test('passes 16 kHz audio through unchanged', () => {
    const input = Float32Array.from([0.1, -0.2, 0.3])
    expect(Array.from(createResampler(16000)(input))).toEqual(Array.from(input))
  })

  test('turns one second of 48 kHz audio into one second of 16 kHz audio', () => {
    const out = createResampler(48000)(new Float32Array(48000))
    expect(out.length).toBe(16000)
  })

  test('upsamples 8 kHz Bluetooth mic audio to 16 kHz', () => {
    const out = createResampler(8000)(new Float32Array(8000).fill(0.25))
    expect(out.length).toBe(16000)
    for (const v of out) expect(v).toBeCloseTo(0.25, 5)
  })

  test('keeps a constant signal at the same level', () => {
    const out = createResampler(44100)(new Float32Array(44100).fill(0.5))
    for (const v of out) expect(v).toBeCloseTo(0.5, 5)
  })

  test('keeps the pitch of a 440 Hz tone', () => {
    const out = createResampler(48000)(sine(440, 48000, 1))
    // 440 Hz crosses zero 880 times per second
    expect(zeroCrossings(out)).toBeGreaterThanOrEqual(878)
    expect(zeroCrossings(out)).toBeLessThanOrEqual(882)
  })

  test('gives the same result when audio arrives in odd-sized chunks', () => {
    const input = sine(300, 48000, 0.5)
    const whole = createResampler(48000)(input)

    const streamed = createResampler(48000)
    const parts: number[] = []
    for (let i = 0; i < input.length; i += 128) {
      parts.push(...streamed(input.subarray(i, i + 128)))
    }

    expect(parts.length).toBe(whole.length)
    parts.forEach((v, i) => expect(v).toBeCloseTo(whole[i], 6))
  })
})
