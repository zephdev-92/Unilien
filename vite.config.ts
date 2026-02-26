import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png', 'sw-push.js'],
      manifest: {
        name: 'Unilien',
        short_name: 'Unilien',
        description: 'Application de gestion des auxiliaires de vie pour personnes en situation de handicap',
        theme_color: '#2B6CB0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Importer le code push dans le service worker
        importScripts: ['sw-push.js'],
        runtimeCaching: [
          // Pas de cache sur /rest/v1/ : toutes les tables contiennent des
          // données utilisateur sensibles (profils, contrats, données handicap).
          // Seul le storage (avatars, fichiers statiques) est mis en cache.
          {
            urlPattern: /^https:\/\/.*supabase\.co\/storage\/v1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 semaine
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
