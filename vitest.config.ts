import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
        // Baseline réel au 12/02/2026 — augmenter progressivement
        // Cible Q1: 30% | Cible Q2: 60% | Cible finale: 70%
        statements: 14,
        branches: 10,
        functions: 12,
        lines: 14,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
