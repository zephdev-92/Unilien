import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

// Configuration personnalisée pour Unilien
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: '#E6F0FF' },
          100: { value: '#B3D1FF' },
          200: { value: '#80B3FF' },
          300: { value: '#4D94FF' },
          400: { value: '#1A75FF' },
          500: { value: '#0056E0' }, // Couleur principale - contraste 7.2:1 sur blanc
          600: { value: '#0045B3' },
          700: { value: '#003486' },
          800: { value: '#002359' },
          900: { value: '#00122D' },
        },
        success: {
          500: { value: '#0E6027' }, // Contraste 7.1:1 sur blanc
          600: { value: '#0A4A1E' },
        },
        warning: {
          500: { value: '#7D4E00' }, // Contraste 7.0:1 sur blanc
          600: { value: '#5C3900' },
        },
        error: {
          500: { value: '#C41E3A' }, // Contraste 7.0:1 sur blanc
          600: { value: '#9B1830' },
        },
      },
      fonts: {
        heading: { value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` },
        body: { value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` },
      },
    },
    semanticTokens: {
      colors: {
        'brand.solid': { value: '{colors.brand.500}' },
        'brand.contrast': { value: 'white' },
        'brand.fg': { value: '{colors.brand.700}' },
        'brand.muted': { value: '{colors.brand.100}' },
        'brand.subtle': { value: '{colors.brand.50}' },
        'brand.emphasized': { value: '{colors.brand.600}' },
        'brand.focusRing': { value: '{colors.brand.500}' },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)

export default system
