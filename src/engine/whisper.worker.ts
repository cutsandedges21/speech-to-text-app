import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol'

/**
 * English-only tiny Whisper, 8-bit quantized: ~44 MB download.
 * For better accuracy try 'onnx-community/whisper-base.en' (bigger, slower).
 */
const MODEL_ID = 'onnx-community/whisper-tiny.en'

// Model files come from the Hugging Face CDN and are cached by the browser.
env.allowLocalModels = false

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function post(message: WorkerResponse) {
  self.postMessage(message)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function load(): Promise<AutomaticSpeechRecognitionPipeline> {
  asr ??= (async () => {
    const pipe = await pipeline('automatic-speech-recognition', MODEL_ID, {
      // WASM (CPU) is the reliable path on iPhone; WebGPU is a later upgrade.
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (info) => {
        if (info.status === 'progress_total') post({ type: 'progress', fraction: info.progress / 100 })
      },
    })
    await pipe(new Float32Array(16000)) // warm-up so the first real pass is fast
    return pipe
  })()
  asr.catch(() => (asr = null)) // allow a retry after a failed download
  return asr
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'load') {
    try {
      await load()
      post({ type: 'ready' })
    } catch (error) {
      post({ type: 'load-error', message: errorMessage(error) })
    }
    return
  }

  try {
    const pipe = await load()
    const output = await pipe(message.audio)
    const text = Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text
    post({ type: 'result', id: message.id, text })
  } catch (error) {
    post({ type: 'error', id: message.id, message: errorMessage(error) })
  }
}
