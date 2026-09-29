import { describe, expect, test, vi } from 'vitest'
import { LiveTranscriber } from './liveTranscriber'

const TENTH = 1600
const isSpeech = (chunk: Float32Array) => chunk[0] !== 0

/** Push `seconds` of audio at a fixed level (0 = silence). */
function feed(live: LiveTranscriber, seconds: number, level: number) {
  for (let i = 0; i < Math.round(seconds * 10); i++) {
    live.pushAudio(new Float32Array(TENTH).fill(level))
  }
}

/** Replies 'A.' for audio containing level 0.2 and 'B.' for level 0.4. */
const reply = (audio: Float32Array) => (audio.some((v) => v > 0.3) ? 'B.' : 'A.')

function instantEngine(answer: (audio: Float32Array) => string = reply) {
  const calls: Float32Array[] = []
  return {
    calls,
    transcribe: async (audio: Float32Array) => {
      calls.push(audio)
      return answer(audio)
    },
  }
}

/** Every call waits until open() is called. */
function gatedEngine(answer: (audio: Float32Array) => string = reply) {
  let open!: () => void
  const gate = new Promise<void>((resolve) => (open = resolve))
  const calls: Float32Array[] = []
  return {
    calls,
    open: () => open(),
    transcribe: async (audio: Float32Array) => {
      calls.push(audio)
      await gate
      return answer(audio)
    },
  }
}

function setup(engine: { transcribe: (a: Float32Array) => Promise<string> }, initialText = '') {
  const onChange = vi.fn()
  const onError = vi.fn()
  const live = new LiveTranscriber({ engine, onChange, onError, isSpeech, initialText })
  return { live, onChange, onError }
}

describe('LiveTranscriber', () => {
  test('a sentence followed by a pause lands in the committed text', async () => {
    const { live } = setup(instantEngine())
    feed(live, 1.5, 0.2)
    feed(live, 0.7, 0)
    await live.idle()
    expect(live.text).toEqual({ committed: 'A.', draft: '' })
  })

  test('shows draft text while you are still talking', async () => {
    const { live } = setup(instantEngine())
    feed(live, 1, 0.2)
    await live.idle()
    expect(live.text).toEqual({ committed: '', draft: 'A.' })
  })

  test('tells the UI whenever the text changes', async () => {
    const { live, onChange } = setup(instantEngine())
    feed(live, 1, 0.2)
    await live.idle()
    expect(onChange).toHaveBeenLastCalledWith({ committed: '', draft: 'A.' })
  })

  test('silence never runs the model', async () => {
    const engine = instantEngine()
    const { live } = setup(engine)
    feed(live, 5, 0)
    await live.idle()
    expect(engine.calls).toHaveLength(0)
  })

  test('never drops a finished sentence while the model is busy', async () => {
    const engine = gatedEngine()
    const { live } = setup(engine)
    feed(live, 1, 0.2) // draft of A starts and blocks
    feed(live, 0.7, 0) // A finishes while busy
    feed(live, 1, 0.4)
    feed(live, 0.7, 0) // B finishes while busy
    engine.open()
    await live.idle()
    expect(live.text).toEqual({ committed: 'A. B.', draft: '' })
  })

  test('stop() finishes the sentence in progress', async () => {
    const { live } = setup(instantEngine())
    feed(live, 1.5, 0.2)
    live.stop()
    await live.idle()
    expect(live.text).toEqual({ committed: 'A.', draft: '' })
  })

  test('clear() empties the text and ignores results still in flight', async () => {
    const engine = gatedEngine()
    const { live } = setup(engine)
    feed(live, 1, 0.2)
    feed(live, 0.7, 0)
    live.clear()
    engine.open()
    await live.idle()
    expect(live.text).toEqual({ committed: '', draft: '' })
  })

  test('continues from previously saved text', async () => {
    const { live } = setup(instantEngine(), 'Earlier.')
    feed(live, 1, 0.2)
    feed(live, 0.7, 0)
    await live.idle()
    expect(live.text.committed).toBe('Earlier. A.')
  })

  test('filters out Whisper junk output', async () => {
    const { live } = setup(instantEngine(() => ' [BLANK_AUDIO]'))
    feed(live, 1, 0.2)
    feed(live, 0.7, 0)
    await live.idle()
    expect(live.text).toEqual({ committed: '', draft: '' })
  })

  test('reports a model error and keeps working', async () => {
    let broken = true
    const { live, onError } = setup({
      transcribe: async () => {
        if (broken) throw new Error('boom')
        return 'B.'
      },
    })
    feed(live, 0.3, 0.2)
    feed(live, 0.7, 0) // this sentence's draft and final both fail
    await live.idle()
    expect(onError).toHaveBeenCalled()
    expect(live.text.committed).toBe('')

    broken = false
    feed(live, 0.3, 0.2)
    feed(live, 0.7, 0)
    await live.idle()
    expect(live.text.committed).toBe('B.')
  })
})
