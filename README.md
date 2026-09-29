# utter

Live speech-to-text that runs the Moonshine speech model on your phone, inside Safari. No server, no API key, no cost. Add it to the iPhone home screen and it behaves like an app. After the first launch it works offline.

## Use it on an iPhone

1. Open the app's URL in Safari.
2. Tap Share → Add to Home Screen.
3. Open it from the home screen and tap the mic. The first launch downloads the speech model (about 63 MB, one time).

Grey italic text is the sentence you're still speaking and may still change. It turns solid black once you pause.

Each tap of the mic makes a new recording. Tap ≡ to see your recordings, make folders, and use a folder's ⋯ menu to record straight into it. Tap a recording's title to rename it, and use the "in … ▾" picker to move it. Recordings are stored on the phone only.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 (the mic works on localhost)
npm test         # unit tests for the audio + transcription logic
npm run build    # production build into dist/
npm run deploy   # deploy to Vercel (run `npx vercel login` once first)
```

The iPhone mic needs https, so test on the phone with a Vercel deploy, not the dev server.

## How it works

```
mic ──► audio/mic.ts ──► live/liveTranscriber.ts ──► engine/workerEngine.ts ──► engine/speech.worker.ts
        16 kHz chunks    silence detector +           posts audio to a           Transformers.js runs
                         segmenter decide when        web worker                 Moonshine Base (WASM)
                         to run a draft or lock
                         in a sentence
```

| File | Job |
|---|---|
| `src/audio/mic.ts` | Mic capture via an AudioWorklet (`public/mic-processor.js`), resampled to 16 kHz |
| `src/audio/silence.ts` | Speech/silence detector that adapts to background noise |
| `src/live/segmenter.ts` | Splits audio into sentences: draft every 0.5 s, sentence ends after 0.7 s of silence or 20 s of talking |
| `src/live/liveTranscriber.ts` | Runs the model one job at a time; finished sentences are never dropped |
| `src/live/filter.ts` | Removes silence junk (`[BLANK_AUDIO]`, a lone "Thank you.") |
| `src/engine/speech.worker.ts` | Loads and runs the model; deletes cached files of models the app no longer uses |
| `src/live/useLiveTranscriber.ts` | React hook: mic + engine, one live transcriber per recording session |
| `src/library/library.ts` | Folders and recordings as pure functions (add, rename, move, delete, titles) |
| `src/library/store.ts` | Saves the library to localStorage; the one file to change for IndexedDB |
| `src/components/SideNav.tsx` | Folder drawer (phone) / sidebar (900 px and wider) |

## Upgrades

- **Model:** `MODEL_ID` in `src/engine/speech.worker.ts`. Measured 2026-09-28 on 30 LibriSpeech test-other clips (share of words wrong / speed vs the old model): moonshine-base 7.5% / ~4x faster (current), moonshine-tiny 10.9% / ~7x faster, whisper-base.en 9.8% / about the same, whisper-tiny.en 13.6% (the old model). Add the old ID to `RETIRED_MODELS` when switching.
- **Faster on new iPhones:** switch `device` to `'webgpu'` (iOS 26+). Untested.
- **Other languages:** Moonshine has per-language models (e.g. `onnx-community/moonshine-base-ja-ONNX`), or use a multilingual Whisper.
- **Timing knobs:** the options at the top of `src/live/segmenter.ts`.
