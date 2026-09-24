import { createResampler } from './resample'

export type MicErrorKind = 'denied' | 'not-found' | 'insecure' | 'unsupported' | 'other'

export class MicError extends Error {
  readonly kind: MicErrorKind
  constructor(kind: MicErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export interface Mic {
  stop(): Promise<void>
}

export interface MicOptions {
  /** 16 kHz mono chunks, ~43 ms each. */
  onAudio: (chunk: Float32Array) => void
  /** The OS took the mic away (phone call, another app). */
  onEnded?: () => void
}

/** Safari 16.4+: tells iOS we record and play, so the built-in mic is used. */
function setAudioSession(type: 'play-and-record' | 'auto') {
  const session = (navigator as { audioSession?: { type: string } }).audioSession
  if (session) session.type = type
}

function toMicError(error: unknown): MicError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return new MicError('denied', 'Microphone access was blocked')
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return new MicError('not-found', 'No microphone found')
  return new MicError('other', error instanceof Error ? error.message : String(error))
}

/**
 * Starts the mic and streams 16 kHz audio to `onAudio`.
 * Call it straight from a tap handler: iOS only lets audio start inside a user
 * gesture, so the AudioContext is created before anything is awaited.
 */
export async function startMic({ onAudio, onEnded }: MicOptions): Promise<Mic> {
  if (!window.isSecureContext) throw new MicError('insecure', 'The microphone only works over https')
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
    throw new MicError('unsupported', "This browser can't record audio")
  }

  const context = new AudioContext()
  const resumed = context.resume()
  setAudioSession('play-and-record')

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (error) {
    setAudioSession('auto')
    context.close().catch(() => {})
    throw toMicError(error)
  }

  try {
    await resumed
    await context.audioWorklet.addModule(`${import.meta.env.BASE_URL}mic-processor.js`)
    const source = context.createMediaStreamSource(stream)
    const collector = new AudioWorkletNode(context, 'mic-processor')
    // Some browsers only run nodes that reach the speakers; route through a muted gain.
    const muted = context.createGain()
    muted.gain.value = 0
    source.connect(collector).connect(muted).connect(context.destination)

    const resample = createResampler(context.sampleRate)
    collector.port.onmessage = (event: MessageEvent<Float32Array>) => onAudio(resample(event.data))
    stream.getAudioTracks()[0]?.addEventListener('ended', () => onEnded?.())

    let stopped = false
    return {
      async stop() {
        if (stopped) return
        stopped = true
        collector.port.onmessage = null
        source.disconnect()
        collector.disconnect()
        stream.getTracks().forEach((track) => track.stop())
        setAudioSession('auto')
        await context.close()
      },
    }
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop())
    setAudioSession('auto')
    context.close().catch(() => {})
    throw toMicError(error)
  }
}
