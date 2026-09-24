// Runs on the audio thread. Collects raw mic samples and hands them to the
// page in batches of 2048 frames (~43 ms at 48 kHz).
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.buffer = new Float32Array(2048)
    this.filled = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.filled++] = channel[i]
        if (this.filled === this.buffer.length) {
          this.port.postMessage(this.buffer, [this.buffer.buffer])
          this.buffer = new Float32Array(2048)
          this.filled = 0
        }
      }
    }
    return true
  }
}

registerProcessor('mic-processor', MicProcessor)
