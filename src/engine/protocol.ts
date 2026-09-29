/** Messages between the app and the speech model's web worker. */
export type WorkerRequest =
  | { type: 'load' }
  | { type: 'transcribe'; id: number; audio: Float32Array }

export type WorkerResponse =
  | { type: 'progress'; fraction: number }
  | { type: 'ready' }
  | { type: 'load-error'; message: string }
  | { type: 'result'; id: number; text: string }
  | { type: 'error'; id: number; message: string }
