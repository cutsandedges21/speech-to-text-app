/**
 * Streaming resampler: feed it mic chunks at the device rate, get 16 kHz back.
 * Each output sample is the average of the input samples it covers, which
 * doubles as a cheap low-pass filter when downsampling. State carries across
 * calls, so chunked input produces the same output as one big buffer.
 */
export function createResampler(
  inputRate: number,
  outputRate = 16000,
): (chunk: Float32Array) => Float32Array {
  if (inputRate === outputRate) return (chunk) => chunk.slice()

  const ratio = inputRate / outputRate
  let pending = new Float32Array(0) // input not yet turned into output
  let pendingStart = 0 // absolute input index of pending[0]
  let nextOut = 0 // absolute index of the next output sample

  return (chunk) => {
    const buf = new Float32Array(pending.length + chunk.length)
    buf.set(pending)
    buf.set(chunk, pending.length)
    const bufEnd = pendingStart + buf.length

    const out: number[] = []
    for (;;) {
      const start = Math.floor(nextOut * ratio)
      const stop = Math.max(Math.floor((nextOut + 1) * ratio), start + 1)
      if (stop > bufEnd) break
      let sum = 0
      for (let j = start; j < stop; j++) sum += buf[j - pendingStart]
      out.push(sum / (stop - start))
      nextOut++
    }

    const keepFrom = Math.floor(nextOut * ratio)
    pending = buf.slice(keepFrom - pendingStart)
    pendingStart = keepFrom
    return Float32Array.from(out)
  }
}
