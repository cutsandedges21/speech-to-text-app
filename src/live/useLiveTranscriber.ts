import { useCallback, useEffect, useRef, useState } from 'react'
import { MicError, startMic, type Mic } from '../audio/mic'
import { rms } from '../audio/silence'
import { WhisperEngine } from '../engine/whisperEngine'
import { loadTranscript, saveTranscript } from '../storage/transcript'
import { LiveTranscriber, type LiveText } from './liveTranscriber'

export type Status = 'loading' | 'load-failed' | 'ready' | 'starting' | 'listening'

const MIC_MESSAGES: Record<MicError['kind'], string> = {
  denied: 'Microphone is blocked. Allow it in Settings → Safari → Microphone, then tap the mic again.',
  'not-found': 'No microphone found.',
  insecure: 'The microphone only works when the app is opened over https.',
  unsupported: "This browser can't record audio.",
  other: "Couldn't start the microphone.",
}

/** Wires the mic, the Whisper engine and the live transcriber into React state. */
export function useLiveTranscriber() {
  const [status, setStatus] = useState<Status>('loading')
  const [progress, setProgress] = useState(0)
  const [text, setText] = useState<LiveText>(() => ({ committed: loadTranscript(), draft: '' }))
  const [error, setError] = useState<string | null>(null)
  const [level, setLevel] = useState(0)

  const engineRef = useRef<WhisperEngine | null>(null)
  const liveRef = useRef<LiveTranscriber | null>(null)
  const micRef = useRef<Mic | null>(null)

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
    const engine = new WhisperEngine()
    engineRef.current = engine
    liveRef.current = new LiveTranscriber({
      engine,
      onChange: setText,
      onError: () => setError("Missed a bit there. Keep talking and it'll pick back up."),
      initialText: loadTranscript(),
    })
    loadModel()
    return () => {
      void micRef.current?.stop()
      micRef.current = null
      engineRef.current = null
      engine.dispose()
    }
  }, [loadModel])

  useEffect(() => saveTranscript(text.committed), [text.committed])

  const stop = useCallback(() => {
    void micRef.current?.stop()
    micRef.current = null
    liveRef.current?.stop()
    setLevel(0)
    setStatus((s) => (s === 'listening' || s === 'starting' ? 'ready' : s))
  }, [])

  /** Must be called directly from a tap so iOS allows audio to start. */
  const start = useCallback(() => {
    const live = liveRef.current
    if (!live) return
    setError(null)
    setStatus('starting')
    startMic({
      onAudio: (chunk) => {
        live.pushAudio(chunk)
        setLevel(rms(chunk))
      },
      onEnded: stop,
    })
      .then((mic) => {
        micRef.current = mic
        setStatus('listening')
      })
      .catch((err: unknown) => {
        setStatus('ready')
        setError(err instanceof MicError ? MIC_MESSAGES[err.kind] : MIC_MESSAGES.other)
      })
  }, [stop])

  // iOS cuts the mic when the app goes to the background; finish the sentence cleanly.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && micRef.current) stop()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [stop])

  const clear = useCallback(() => liveRef.current?.clear(), [])

  return { status, progress, text, error, level, start, stop, clear, retryLoad: loadModel }
}
