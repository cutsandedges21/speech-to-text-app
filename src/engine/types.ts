/**
 * Anything that turns 16 kHz mono audio into text. Any Transformers.js
 * speech model runs through WorkerEngine; a different runtime means writing
 * another class with this shape.
 */
export interface SpeechEngine {
  /** Downloads/prepares the model. `onProgress` gets 0..1. */
  load(onProgress?: (fraction: number) => void): Promise<void>
  transcribe(audio: Float32Array): Promise<string>
  dispose(): void
}
