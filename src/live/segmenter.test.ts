import { describe, expect, test } from 'vitest'
import { Segmenter } from './segmenter'

const TENTH = 1600 // 0.1 s at 16 kHz
const speech = () => new Float32Array(TENTH).fill(0.2)
const quiet = () => new Float32Array(TENTH)

/** Push `seconds` of audio, return every event that came back. */
function feed(seg: Segmenter, seconds: number, isSpeech: boolean) {
  const events = []
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    events.push(seg.push(isSpeech ? speech() : quiet(), isSpeech))
  }
  return events
}

describe('Segmenter', () => {
  test('silence alone never triggers work', () => {
    const seg = new Segmenter()
    const events = feed(seg, 5, false)
    expect(events.every((e) => e === 'none')).toBe(true)
  })

  test('asks for a draft after half a second of talking', () => {
    const seg = new Segmenter()
    const events = feed(seg, 0.5, true)
    expect(events.at(-1)).toBe('draft')
    expect(events.slice(0, -1).every((e) => e === 'none')).toBe(true)
  })

  test('asks for the next draft only after another half second of new audio', () => {
    const seg = new Segmenter()
    feed(seg, 0.5, true)
    seg.takeDraft()
    const events = feed(seg, 0.5, true)
    expect(events.slice(0, -1).every((e) => e === 'none')).toBe(true)
    expect(events.at(-1)).toBe('draft')
  })

  test('keeps asking for a draft until one is taken', () => {
    const seg = new Segmenter()
    feed(seg, 0.5, true)
    expect(feed(seg, 0.2, true)).toEqual(['draft', 'draft'])
  })

  test('finalizes after 0.5 s of silence following speech', () => {
    const seg = new Segmenter()
    feed(seg, 0.5, true)
    const events = feed(seg, 0.5, false)
    expect(events.at(-1)).toBe('finalize')
    expect(events.slice(0, -1)).not.toContain('finalize')
  })

  test('finalizes nonstop talking at 20 seconds', () => {
    const seg = new Segmenter()
    const events = feed(seg, 20, true)
    expect(events.indexOf('finalize')).toBe(199)
  })

  test('final audio keeps 0.3 s of lead-in and trims trailing silence to 0.3 s', () => {
    const seg = new Segmenter()
    feed(seg, 2, false) // only the last 0.3 s is kept as lead-in
    feed(seg, 1, true)
    feed(seg, 0.7, false)
    expect(seg.takeFinal()?.length).toBe(TENTH * (3 + 10 + 3))
  })

  test('a click too short to be a word is thrown away', () => {
    const seg = new Segmenter()
    feed(seg, 0.1, true)
    feed(seg, 0.7, false)
    expect(seg.takeFinal()).toBeNull()
  })

  test('starts fresh after finalizing', () => {
    const seg = new Segmenter()
    feed(seg, 1, true)
    feed(seg, 0.7, false)
    seg.takeFinal()
    expect(feed(seg, 3, false).every((e) => e === 'none')).toBe(true)
  })

  test('draft audio is everything in the current sentence so far', () => {
    const seg = new Segmenter()
    feed(seg, 1.5, true)
    expect(seg.takeDraft().length).toBe(TENTH * 15)
  })

  test('each finalized sentence gets a new id', () => {
    const seg = new Segmenter()
    const first = seg.segmentId
    feed(seg, 1, true)
    feed(seg, 0.7, false)
    seg.takeFinal()
    expect(seg.segmentId).toBe(first + 1)
  })
})
