import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/test/**',
        'src/types/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      thresholds: {
        // Baseline réel au 19/02/2026 (~42% global, 91% services, 89% hooks)
        // Augmenter progressivement — Cible Q2: 60% | Cible finale: 70%
        statements: 38,
        branches: 26,
        functions: 28,
        lines: 38,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
