import type { WorkerRequest, WorkerResponse } from './protocol'
import type { SpeechEngine } from './types'

interface Pending<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/** Runs Whisper in a web worker so the UI never freezes during a pass. */
export class WhisperEngine implements SpeechEngine {
  private readonly worker: Worker
  private readonly pending = new Map<number, Pending<string>>()
  private loading: (Pending<void> & { onProgress?: (fraction: number) => void }) | null = null
  private progress = 0
  private nextId = 0

  constructor() {
    this.worker = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data)
    this.worker.onerror = (event) => this.failAll(new Error(event.message || 'Speech model crashed'))
  }

  load(onProgress?: (fraction: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loading = { resolve, reject, onProgress }
      this.send({ type: 'load' })
    })
  }

  transcribe(audio: Float32Array): Promise<string> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.send({ type: 'transcribe', id, audio }, [audio.buffer])
    })
  }

  dispose(): void {
    this.worker.terminate()
    this.failAll(new Error('Speech engine closed'))
  }

  private send(message: WorkerRequest, transfer: Transferable[] = []) {
    this.worker.postMessage(message, transfer)
  }

  private handle(message: WorkerResponse) {
    switch (message.type) {
      case 'progress':
        // Totals grow as new files are discovered; never let the bar go backwards.
        this.progress = Math.max(this.progress, Math.min(1, message.fraction))
        this.loading?.onProgress?.(this.progress)
        break
      case 'ready':
        this.loading?.resolve()
        this.loading = null
        break
      case 'load-error':
        this.loading?.reject(new Error(message.message))
        this.loading = null
        break
      case 'result':
        this.pending.get(message.id)?.resolve(message.text)
        this.pending.delete(message.id)
        break
      case 'error':
        this.pending.get(message.id)?.reject(new Error(message.message))
        this.pending.delete(message.id)
        break
    }
  }

  private failAll(error: Error) {
    this.loading?.reject(error)
    this.loading = null
    this.pending.forEach((p) => p.reject(error))
    this.pending.clear()
  }
}
