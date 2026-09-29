import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import type { WorkerRequest, WorkerResponse } from './protocol'

/**
 * Moonshine Base, 8-bit: ~63 MB download. Built for live captions: its work
 * scales with the clip's length, where Whisper pads every clip to 30 s.
 * Measured on 30 LibriSpeech test-other clips (2026-09-28): 7.5% of words
 * wrong vs 13.6% for whisper-tiny.en, and ~4x faster per sentence.
 * Faster but less accurate: 'onnx-community/moonshine-tiny-ONNX' (~28 MB, 10.9%).
 */
const MODEL_ID = 'onnx-community/moonshine-base-ONNX'

/** Models this app used before. Their cached files are deleted to free space on the phone. */
const RETIRED_MODELS = ['onnx-community/whisper-tiny.en']

// Model files come from the Hugging Face CDN and are cached by the browser.
env.allowLocalModels = false

let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null

function post(message: WorkerResponse) {
  self.postMessage(message)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Only after the new model works, so a failed download never leaves the phone with nothing. */
async function deleteRetiredModels() {
  try {
    const cache = await caches.open(env.cacheKey)
    for (const request of await cache.keys()) {
      if (RETIRED_MODELS.some((id) => request.url.includes(`/${id}/`))) await cache.delete(request)
    }
  } catch {
    // Only costs disk space.
  }
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
    void deleteRetiredModels()
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
