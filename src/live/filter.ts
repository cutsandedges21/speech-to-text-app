/**
 * Phrases Whisper invents when it hears silence or noise (it was trained on
 * subtitled videos). Dropped only when they make up the whole result.
 */
const HALLUCINATIONS = new Set([
  'you',
  'thank you',
  'thanks for watching',
  'thank you for watching',
  'thank you so much for watching',
  'please subscribe',
])

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z ]/g, '').trim()
}

export function cleanTranscript(raw: string): string {
  const text = raw
    .replace(/\[[^\]]*\]/g, ' ') // [BLANK_AUDIO], [MUSIC]
    .replace(/\([^)]*\)/g, ' ') // (upbeat music)
    .replace(/\s+/g, ' ')
    .trim()
  return HALLUCINATIONS.has(normalize(text)) ? '' : text
}

export function appendText(transcript: string, text: string): string {
  if (!text) return transcript
  return transcript ? `${transcript} ${text}` : text
}
