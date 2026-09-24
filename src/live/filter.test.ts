import { describe, expect, test } from 'vitest'
import { appendText, cleanTranscript } from './filter'

describe('cleanTranscript', () => {
  test('trims the leading space Whisper adds', () => {
    expect(cleanTranscript(' Hello there.')).toBe('Hello there.')
  })

  test('collapses repeated whitespace', () => {
    expect(cleanTranscript('Hello   there\n friend')).toBe('Hello there friend')
  })

  test('removes bracketed sound tags', () => {
    expect(cleanTranscript('[BLANK_AUDIO]')).toBe('')
    expect(cleanTranscript('Okay [MUSIC] so')).toBe('Okay so')
  })

  test('removes parenthesized sound tags', () => {
    expect(cleanTranscript('(upbeat music) Hi')).toBe('Hi')
  })

  test('drops known silence hallucinations', () => {
    expect(cleanTranscript(' Thank you.')).toBe('')
    expect(cleanTranscript(' you')).toBe('')
    expect(cleanTranscript('Thanks for watching!')).toBe('')
  })

  test('keeps a hallucination phrase when it is part of a real sentence', () => {
    expect(cleanTranscript('Thank you for the coffee.')).toBe('Thank you for the coffee.')
  })
})

describe('appendText', () => {
  test('starts the transcript with the first sentence', () => {
    expect(appendText('', 'Hello.')).toBe('Hello.')
  })

  test('joins sentences with one space', () => {
    expect(appendText('Hello.', 'How are you?')).toBe('Hello. How are you?')
  })

  test('ignores empty text', () => {
    expect(appendText('Hello.', '')).toBe('Hello.')
  })
})
