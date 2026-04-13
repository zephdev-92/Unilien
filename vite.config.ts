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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return

          // xlsx + pako : import dynamique → chunk séparé, chargé seulement au clic "Exporter Excel"
          if (id.includes('/xlsx/') || id.includes('/pako/')) return 'vendor-xlsx'

          // @react-pdf/renderer et ses dépendances : chargé seulement sur DocumentsPage/PlanningPage
          if (
            id.includes('@react-pdf') ||
            id.includes('/fontkit/') ||
            id.includes('/hyphen/') ||
            id.includes('/linebreak/') ||
            id.includes('/blob-stream/')
          ) return 'vendor-pdf'

          // @ark-ui + @zag-js en premier (dépendances primitives de Chakra)
          if (id.includes('@ark-ui') || id.includes('@zag-js') || id.includes('@zagjs')) return 'vendor-ark'

          // Emotion (CSS-in-JS runtime, chargé avant Chakra)
          if (id.includes('@emotion')) return 'vendor-emotion'

          // framer-motion / motion
          if (
            id.includes('framer-motion') ||
            id.includes('/motion-dom/') ||
            id.includes('/motion-utils/')
          ) return 'vendor-motion'

          // Chakra UI + @floating-ui (dépend d'Emotion + Ark)
          if (id.includes('@chakra-ui') || id.includes('@floating-ui')) return 'vendor-chakra'

          // Supabase
          if (id.includes('@supabase')) return 'vendor-supabase'

          // date-fns
          if (id.includes('date-fns')) return 'vendor-dates'

          // Formulaires + validation
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'vendor-forms'

          // Tout le reste (React, react-dom, react-router, zustand, dompurify, etc.)
          return 'vendor-core'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
