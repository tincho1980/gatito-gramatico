// Íconos de la PWA a partir de public/icon.svg: `npm run icons -w app`.
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#ec4899' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#ec4899' } },
  },
  images: ['public/icon.svg'],
});
