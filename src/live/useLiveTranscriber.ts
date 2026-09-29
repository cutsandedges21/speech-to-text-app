import { useCallback, useEffect, useRef, useState } from 'react'
import { MicError, startMic, type Mic } from '../audio/mic'
import { rms } from '../audio/silence'
import { WorkerEngine } from '../engine/workerEngine'
import { LiveTranscriber } from './liveTranscriber'

export type Status = 'loading' | 'load-failed' | 'ready' | 'starting' | 'listening'

const MIC_MESSAGES: Record<MicError['kind'], string> = {
  denied: 'Microphone is blocked. Allow it in Settings → Safari → Microphone, then tap the mic again.',
  'not-found': 'No microphone found.',
  insecure: 'The microphone only works when the app is opened over https.',
  unsupported: "This browser can't record audio.",
  other: "Couldn't start the microphone.",
}

export interface LiveTranscriberCallbacks {
  /** Finished sentences for a recording so far. Can arrive after stop(). */
  onText: (recordingId: string, committed: string) => void
  /** Every sentence of the session has been transcribed. */
  onSessionEnd: (recordingId: string) => void
}

interface Session {
  recordingId: string
  live: LiveTranscriber
  ended: boolean
}

/**
 * Wires the mic and the speech engine into React state. Each mic session
 * gets its own LiveTranscriber bound to one recording, so a sentence that
 * finishes after Stop still lands in the right recording.
 */
export function useLiveTranscriber(callbacks: LiveTranscriberCallbacks) {
  const [status, setStatus] = useState<Status>('loading')
  const [progress, setProgress] = useState(0)
  const [draft, setDraft] = useState<{ recordingId: string; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)

  const engineRef = useRef<WorkerEngine | null>(null)
  const micRef = useRef<Mic | null>(null)
  const sessionRef = useRef<Session | null>(null)
  // Read through a ref so late results never call a stale callback.
  const callbacksRef = useRef(callbacks)
  useEffect(() => {
    callbacksRef.current = callbacks
  })

  const loadModel = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    // React dev mode mounts twice; ignore results from an engine that was replaced.
    const current = () => engineRef.current === engine
    setStatus('loading')
    setError(null)
    engine
      .load((p) => current() && setProgress(p))
      .then(() => current() && setStatus('ready'))
      .catch(() => current() && setStatus('load-failed'))
  }, [])

  useEffect(() => {
    const engine = new WorkerEngine()
    engineRef.current = engine
    loadModel()
    return () => {
      void micRef.current?.stop()
      micRef.current = null
      engineRef.current = null
      engine.dispose()
    }
  }, [loadModel])

  const endSession = useCallback((session: Session) => {
    if (session.ended) return
    session.ended = true
    session.live.stop()
    void session.live.idle().then(() => callbacksRef.current.onSessionEnd(session.recordingId))
  }, [])

  const stop = useCallback(() => {
    void micRef.current?.stop()
    micRef.current = null
    if (sessionRef.current) endSession(sessionRef.current)
    setLevel(0)
    setStatus((s) => (s === 'listening' || s === 'starting' ? 'ready' : s))
  }, [endSession])

  /** Records into `recordingId`. Must be called directly from a tap so iOS allows audio to start. */
  const start = useCallback(
    (recordingId: string) => {
      const engine = engineRef.current
      if (!engine) return

      let saved = ''
      const session: Session = {
        recordingId,
        ended: false,
        live: new LiveTranscriber({
          engine,
          onChange: (text) => {
            if (text.committed !== saved) {
              saved = text.committed
              callbacksRef.current.onText(recordingId, text.committed)
            }
            if (sessionRef.current === session) setDraft({ recordingId, text: text.draft })
          },
          onError: () => setError("Missed a bit there. Keep talking and it'll pick back up."),
        }),
      }
      sessionRef.current = session
      setDraft(null)
      setError(null)
      setStatus('starting')

      startMic({
        onAudio: (chunk) => {
          session.live.pushAudio(chunk)
          setLevel(rms(chunk))
        },
        onEnded: stop,
      })
        .then((mic) => {
          micRef.current = mic
          setStatus('listening')
        })
        .catch((err: unknown) => {
          endSession(session)
          setStatus('ready')
          setError(err instanceof MicError ? MIC_MESSAGES[err.kind] : MIC_MESSAGES.other)
        })
    },
    [stop, endSession],
  )

  // iOS cuts the mic when the app goes to the background; finish the sentence cleanly.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && micRef.current) stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stop])

  return { status, progress, draft, error, level, start, stop, retryLoad: loadModel }
}
