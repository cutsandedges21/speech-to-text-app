import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// The logo is a full-bleed dark square, so iOS and Android icons need no extra padding.
const ink = { background: '#1d1b17' }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0, resizeOptions: ink },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: ink },
  },
  images: ['public/logo.svg'],
})
