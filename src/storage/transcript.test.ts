import { describe, expect, test } from 'vitest'
import { loadTranscript, saveTranscript } from './transcript'

function memoryStore() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

const brokenStore = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('transcript storage', () => {
  test('returns an empty string when nothing is saved', () => {
    expect(loadTranscript(memoryStore())).toBe('')
  })

  test('saved text comes back on the next load', () => {
    const store = memoryStore()
    saveTranscript('Hello there.', store)
    expect(loadTranscript(store)).toBe('Hello there.')
  })

  test('a storage failure never crashes the app', () => {
    expect(() => saveTranscript('x', brokenStore)).not.toThrow()
    expect(loadTranscript(brokenStore)).toBe('')
  })
})
