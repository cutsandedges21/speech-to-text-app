export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (const s of samples) sum += s * s
  return Math.sqrt(sum / samples.length)
}

export interface SpeechDetectorOptions {
  /** Level below which audio is always silence, whatever the room sounds like. */
  minThreshold?: number
  /** Speech must be this many times louder than the background noise. */
  noiseMultiplier?: number
  /** How fast the noise estimate creeps up toward a louder background (per chunk). */
  noiseRise?: number
}

/**
 * Energy-based speech detector that adapts to the room. It tracks the
 * background level: it drops instantly on quieter chunks and creeps up slowly
 * on louder ones. A fan or traffic stops counting as speech within a few
 * seconds, and the pauses between words keep the estimate low.
 */
export function createSpeechDetector({
  minThreshold = 0.008,
  noiseMultiplier = 3,
  noiseRise = 0.005,
}: SpeechDetectorOptions = {}): (chunk: Float32Array) => boolean {
  // Starts at 0 so talking right away isn't mistaken for background noise.
  let noiseFloor = 0

  return (chunk) => {
    const level = rms(chunk)
    const isSpeech = level > Math.max(minThreshold, noiseFloor * noiseMultiplier)

    if (level < noiseFloor) noiseFloor = level
    else noiseFloor += (level - noiseFloor) * noiseRise
    return isSpeech
  }
}
