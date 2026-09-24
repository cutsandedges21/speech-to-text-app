import { createSpeechDetector } from '../audio/silence'
import type { SpeechEngine } from '../engine/types'
import { appendText, cleanTranscript } from './filter'
import { Segmenter } from './segmenter'

export interface LiveText {
  /** Finished sentences. Won't change. */
  committed: string
  /** The sentence being spoken right now. May still change. */
  draft: string
}

export interface LiveTranscriberOptions {
  engine: Pick<SpeechEngine, 'transcribe'>
  onChange: (text: LiveText) => void
  onError?: (error: unknown) => void
  initialText?: string
  isSpeech?: (chunk: Float32Array) => boolean
  segmenter?: Segmenter
}

interface FinalJob {
  audio: Float32Array
  segmentId: number
}

/**
 * Feeds mic audio through the segmenter and runs the model one job at a
 * time. Finished sentences are queued and never dropped. Drafts run only when
 * the model is free, so a slow phone gets fewer draft updates, never a backlog.
 */
export class LiveTranscriber {
  private readonly engine: Pick<SpeechEngine, 'transcribe'>
  private readonly onChange: (text: LiveText) => void
  private readonly onError: (error: unknown) => void
  private readonly isSpeech: (chunk: Float32Array) => boolean
  private readonly segmenter: Segmenter

  private committed: string
  private draft = ''
  private draftSegmentId: number | null = null
  private finals: FinalJob[] = []
  private busy = false
  /** Bumped by clear() so results from before the clear are thrown away. */
  private epoch = 0
  private idleWaiters: (() => void)[] = []

  constructor(options: LiveTranscriberOptions) {
    this.engine = options.engine
    this.onChange = options.onChange
    this.onError = options.onError ?? (() => {})
    this.isSpeech = options.isSpeech ?? createSpeechDetector()
    this.segmenter = options.segmenter ?? new Segmenter()
    this.committed = options.initialText ?? ''
  }

  get text(): LiveText {
    return { committed: this.committed, draft: this.draft }
  }

  pushAudio(chunk: Float32Array): void {
    const event = this.segmenter.push(chunk, this.isSpeech(chunk))
    if (event === 'finalize') this.endSentence()
    else if (event === 'draft' && !this.busy && this.finals.length === 0) this.runDraft()
  }

  /** Mic stopped: finish whatever sentence was in progress. */
  stop(): void {
    this.endSentence()
  }

  clear(): void {
    this.epoch++
    this.finals = []
    this.committed = ''
    this.draft = ''
    this.draftSegmentId = null
    this.emit()
  }

  /** Resolves once every queued sentence has been transcribed. */
  idle(): Promise<void> {
    if (!this.busy && this.finals.length === 0) return Promise.resolve()
    return new Promise((resolve) => this.idleWaiters.push(resolve))
  }

  private endSentence(): void {
    const segmentId = this.segmenter.segmentId
    const audio = this.segmenter.takeFinal()
    if (audio) {
      this.finals.push({ audio, segmentId })
      this.pump()
    } else if (this.draftSegmentId === segmentId) {
      this.draft = '' // the "sentence" was only a cough; drop its draft
      this.emit()
    }
  }

  private pump(): void {
    if (this.busy) return
    const job = this.finals.shift()
    if (job) {
      void this.runFinal(job)
      return
    }
    const waiters = this.idleWaiters
    this.idleWaiters = []
    waiters.forEach((resolve) => resolve())
  }

  private runDraft(): void {
    const segmentId = this.segmenter.segmentId
    const audio = this.segmenter.takeDraft()
    void this.run(audio, (text) => {
      this.draft = text
      this.draftSegmentId = segmentId
    })
  }

  private runFinal({ audio, segmentId }: FinalJob): Promise<void> {
    return this.run(
      audio,
      (text) => {
        this.committed = appendText(this.committed, text)
      },
      () => {
        if (this.draftSegmentId === segmentId) {
          this.draft = ''
          this.draftSegmentId = null
        }
      },
    )
  }

  /** Runs one transcription. `always` runs even if the model threw. */
  private async run(audio: Float32Array, apply: (text: string) => void, always?: () => void) {
    const epoch = this.epoch
    this.busy = true
    try {
      const text = cleanTranscript(await this.engine.transcribe(audio))
      if (epoch === this.epoch) apply(text)
    } catch (error) {
      if (epoch === this.epoch) this.onError(error)
    } finally {
      if (epoch === this.epoch) always?.()
      this.busy = false
      this.emit()
      this.pump()
    }
  }

  private emit(): void {
    this.onChange(this.text)
  }
}
