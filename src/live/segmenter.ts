export interface SegmenterOptions {
  sampleRate?: number
  /** Re-transcribe the in-progress sentence after this much new audio. */
  draftEverySec?: number
  /** A pause this long ends the sentence. */
  endSilenceSec?: number
  /** Nonstop talking gets cut into sentences this long, so no single pass gets slow. */
  maxSegmentSec?: number
  /** Audio kept from before speech starts, so the first word isn't clipped. */
  preRollSec?: number
  /** Trailing silence kept on a finished sentence. */
  postRollSec?: number
  /** Sentences with less speech than this (a click, a cough) are dropped. */
  minSpeechSec?: number
}

/**
 * - `draft`: time to re-transcribe the in-progress sentence (call takeDraft)
 * - `finalize`: the sentence is over (call takeFinal)
 */
export type SegmenterEvent = 'none' | 'draft' | 'finalize'

/**
 * Splits a live 16 kHz mic stream into sentences. It holds no timers and runs
 * no model. It only says when a draft or final transcription is due.
 */
export class Segmenter {
  private readonly draftEvery: number
  private readonly endSilence: number
  private readonly maxSegment: number
  private readonly preRoll: number
  private readonly postRoll: number
  private readonly minSpeech: number

  private chunks: Float32Array[] = []
  private total = 0
  private speechSamples = 0
  private trailingSilence = 0
  private draftMark = 0
  private id = 0

  constructor({
    sampleRate = 16000,
    draftEverySec = 0.5,
    endSilenceSec = 0.7,
    maxSegmentSec = 20,
    preRollSec = 0.3,
    postRollSec = 0.3,
    minSpeechSec = 0.25,
  }: SegmenterOptions = {}) {
    this.draftEvery = draftEverySec * sampleRate
    this.endSilence = endSilenceSec * sampleRate
    this.maxSegment = maxSegmentSec * sampleRate
    this.preRoll = preRollSec * sampleRate
    this.postRoll = postRollSec * sampleRate
    this.minSpeech = minSpeechSec * sampleRate
  }

  /** Increments every time a sentence ends. Used to spot stale drafts. */
  get segmentId(): number {
    return this.id
  }

  push(chunk: Float32Array, isSpeech: boolean): SegmenterEvent {
    this.chunks.push(chunk)
    this.total += chunk.length

    if (this.speechSamples === 0 && !isSpeech) {
      while (this.total - this.chunks[0].length >= this.preRoll) {
        this.total -= this.chunks.shift()!.length
      }
      return 'none'
    }

    if (isSpeech) {
      this.speechSamples += chunk.length
      this.trailingSilence = 0
    } else {
      this.trailingSilence += chunk.length
    }

    if (this.trailingSilence >= this.endSilence || this.total >= this.maxSegment) return 'finalize'
    if (this.total - this.draftMark >= this.draftEvery) return 'draft'
    return 'none'
  }

  takeDraft(): Float32Array {
    this.draftMark = this.total
    return this.concat(this.total)
  }

  /** Ends the sentence. Returns its audio, or null if it held no real speech. */
  takeFinal(): Float32Array | null {
    const extraSilence = Math.max(0, this.trailingSilence - this.postRoll)
    const audio = this.speechSamples >= this.minSpeech ? this.concat(this.total - extraSilence) : null

    this.chunks = []
    this.total = 0
    this.speechSamples = 0
    this.trailingSilence = 0
    this.draftMark = 0
    this.id++
    return audio
  }

  private concat(length: number): Float32Array {
    const out = new Float32Array(length)
    let offset = 0
    for (const c of this.chunks) {
      if (offset >= length) break
      out.set(c.subarray(0, length - offset), offset)
      offset += c.length
    }
    return out
  }
}
