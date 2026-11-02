import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'JStudy — Estudio Pro',
        short_name: 'JStudy',
        description: 'SPA educativa de alta gama con flashcards, quiz, pomodoro, notas y dashboard',
        theme_color: '#040812',
        background_color: '#040812',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Flashcards',
            short_name: 'Flashcards',
            description: 'Repaso con repetición espaciada Leitner',
            url: '/?view=flashcards',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Quiz',
            short_name: 'Quiz',
            description: 'Quiz interactivo multiformato',
            url: '/?view=quiz',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Pomodoro',
            short_name: 'Pomodoro',
            description: 'Temporizador de enfoque con alarmas armónicas',
            url: '/?view=pomodoro',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
        // Excluimos explícitamente las llamadas a Firestore y APIs externas de Google del Service Worker
        navigateFallbackDenylist: [/^\/__\/auth/, /^\/google\.firestore/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true
  }
});
