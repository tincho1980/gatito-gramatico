import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const API_URL = process.env.GATITA_API_URL ?? 'http://127.0.0.1:8787';

export default defineConfig({
  // Las variables VITE_* (URL y clave publicable de Supabase) salen del .env.local de la raíz.
  envDir: '..',
  // Versión de la app en los reportes de error: el commit en el CI, la fecha en otro lado.
  define: {
    __APP_VERSION__: JSON.stringify(
      process.env.GITHUB_SHA?.slice(0, 7) ?? new Date().toISOString().slice(0, 16),
    ),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    // En desarrollo la API es `wrangler dev` (npm run dev -w api).
    proxy: { '/api': API_URL },
  },
  // `vite preview` (e2e): la misma API local, en el puerto que diga GATITA_API_URL.
  preview: { proxy: { '/api': API_URL } },
  plugins: [
    react(),
    tailwindcss(),
    // PWA (plan, etapa 6): se instala y se juega sin red. El service worker precachea el
    // shell, las fuentes y el banco de palabras; una versión nueva se activa cuando el chico
    // toca "Actualizar" (UpdatePrompt), nunca a mitad de una ronda.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'La Gatita Gramática',
        short_name: 'Gatita',
        description: 'Practicá la acentuación jugando con la gatita.',
        lang: 'es-AR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ec4899',
        background_color: '#fff1f2',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,json}'],
        // El español usa solo el subconjunto latin de las fuentes: el resto no se precachea.
        globIgnores: ['**/*-{latin-ext,cyrillic,cyrillic-ext,greek,hebrew,vietnamese}-*.woff2'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Las librerías cambian poco: en su propio archivo, una versión nueva del juego no
        // obliga a bajarlas otra vez.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
          lib: ['dexie', 'dexie-react-hooks', 'zustand', 'zod'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
