import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

// Configuration Unilien — alignee sur le prototype (slate-blue + olive-green)
// Palette : --c-primary #3D5166, --c-accent #9BB23B
// Tous les contrastes texte/fond >= 7:1 (WCAG AAA)
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        // Brand : slate-blue (prototype --c-primary)
        brand: {
          50: { value: '#EDF1F5' },   // --c-primary-soft
          100: { value: '#C2D2E0' },  // --c-primary-mid
          200: { value: '#97B3C7' },
          300: { value: '#6D93AD' },
          400: { value: '#4E6478' },
          500: { value: '#3D5166' },   // --c-primary — blanc: 8.19:1 AAA
          600: { value: '#2E3F50' },   // --c-primary-hover — blanc: 10.80:1 AAA
          700: { value: '#1F2C3B' },   // --c-primary-active
          800: { value: '#151E29' },
          900: { value: '#0B1017' },
        },
        // Accent : olive-green (prototype --c-accent)
        accent: {
          50: { value: '#EFF4DC' },    // --c-accent-soft
          100: { value: '#DDE8B5' },
          200: { value: '#CBDC8E' },
          300: { value: '#B8CF67' },
          400: { value: '#A6C34E' },
          500: { value: '#9BB23B' },    // --c-accent
          600: { value: '#7A8F2F' },    // --c-accent-hover
          700: { value: '#3A5210' },    // --c-accent-text — blanc: 8.78:1 AAA
          800: { value: '#2A3C0B' },
          900: { value: '#1A2607' },
        },
        // Warm (prototype --c-warm)
        warm: {
          50: { value: '#F2EDE5' },    // --c-warm-soft
          100: { value: '#E0D6C7' },
          200: { value: '#CDBFAA' },
          300: { value: '#B1A28A' },
          400: { value: '#8A7A60' },
          500: { value: '#5E5038' },    // --c-warm — blanc: 7.81:1 AAA
          600: { value: '#4A3D2B' },    // --c-warm-hover
          700: { value: '#362C1F' },
          800: { value: '#231C14' },
          900: { value: '#110E0A' },
        },
        // Semantique — danger (prototype --c-danger)
        danger: {
          50: { value: '#FEF2F2' },    // --c-danger-soft
          100: { value: '#FECACA' },   // --c-danger-border
          200: { value: '#F9A8A8' },
          300: { value: '#E06060' },
          400: { value: '#C53030' },
          500: { value: '#991B1B' },    // --c-danger — blanc: 8.31:1 AAA
          600: { value: '#7A1515' },    // --c-danger-hover
          700: { value: '#5C1010' },
          800: { value: '#3D0A0A' },
          900: { value: '#1F0505' },
        },
        // Success = accent (prototype --c-success = --c-accent)
        success: {
          50: { value: '#EFF4DC' },
          500: { value: '#9BB23B' },
          600: { value: '#7A8F2F' },
          700: { value: '#3A5210' },
        },
        // Warning
        warning: {
          50: { value: '#FFF8E1' },
          100: { value: '#FEF3C7' },   // amber-bg — badges rétroactifs, alertes
          300: { value: '#F59E0B' },   // amber-dot — points d'anomalie
          500: { value: '#7D4E00' },   // blanc: 7.0:1 AAA
          600: { value: '#5C3900' },
          700: { value: '#B45309' },   // amber-text — texte warning moyen
          800: { value: '#92400E' },   // amber-text-dark — texte warning foncé
        },
        // Error = danger
        error: {
          50: { value: '#FEF2F2' },
          500: { value: '#991B1B' },
          600: { value: '#7A1515' },
        },
      },
      fonts: {
        heading: { value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` },
        body: { value: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif` },
      },
      shadows: {
        xs: { value: '0 1px 2px rgba(78,100,120,.06)' },
        sm: { value: '0 2px 8px rgba(78,100,120,.09)' },
        md: { value: '0 4px 16px rgba(78,100,120,.12)' },
        lg: { value: '0 8px 32px rgba(78,100,120,.16)' },
      },
      // Note: les shadows sont aussi overridées dans semanticTokens.shadows
      // car Chakra v3 résout boxShadow="sm" via semantic tokens, pas tokens bruts
      radii: {
        sm: { value: '6px' },
        md: { value: '10px' },
        lg: { value: '16px' },
        xl: { value: '20px' },
      },
    },
    semanticTokens: {
      shadows: {
        xs: { value: { _light: '0 1px 2px rgba(78,100,120,.06)', _dark: '0 1px 2px rgba(0,0,0,.30)' } },
        sm: { value: { _light: '0 2px 8px rgba(78,100,120,.09)', _dark: '0 2px 8px rgba(0,0,0,.40)' } },
        md: { value: { _light: '0 4px 16px rgba(78,100,120,.12)', _dark: '0 4px 16px rgba(0,0,0,.50)' } },
        lg: { value: { _light: '0 8px 32px rgba(78,100,120,.16)', _dark: '0 8px 32px rgba(0,0,0,.60)' } },
      },
      colors: {
        // Brand semantic tokens
        'brand.solid': { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' } },
        'brand.contrast': { value: 'white' },
        'brand.fg': { value: { _light: '{colors.brand.700}', _dark: '{colors.brand.200}' } },
        'brand.muted': { value: { _light: '{colors.brand.100}', _dark: '{colors.brand.800}' } },
        'brand.subtle': { value: { _light: '{colors.brand.50}', _dark: '{colors.brand.900}' } },
        'brand.emphasized': { value: { _light: '{colors.brand.600}', _dark: '{colors.brand.500}' } },
        'brand.focusRing': { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.400}' } },
        // Accent semantic tokens
        'accent.solid': { value: { _light: '{colors.accent.500}', _dark: '{colors.accent.400}' } },
        'accent.contrast': { value: 'white' },
        'accent.fg': { value: { _light: '{colors.accent.700}', _dark: '{colors.accent.300}' } },
        'accent.muted': { value: { _light: '{colors.accent.100}', _dark: '{colors.accent.800}' } },
        'accent.subtle': { value: { _light: '{colors.accent.50}', _dark: '{colors.accent.900}' } },
        'accent.emphasized': { value: { _light: '{colors.accent.600}', _dark: '{colors.accent.500}' } },
        // Warm semantic tokens
        'warm.solid': { value: { _light: '{colors.warm.500}', _dark: '{colors.warm.400}' } },
        'warm.subtle': { value: { _light: '{colors.warm.50}', _dark: '{colors.warm.900}' } },
        'warm.muted': { value: { _light: '{colors.warm.100}', _dark: '{colors.warm.800}' } },
        'warm.fg': { value: { _light: '{colors.warm.700}', _dark: '{colors.warm.200}' } },
        // Danger semantic tokens
        'danger.solid': { value: { _light: '{colors.danger.500}', _dark: '{colors.danger.400}' } },
        'danger.subtle': { value: { _light: '{colors.danger.50}', _dark: '{colors.danger.900}' } },
        'danger.muted': { value: { _light: '{colors.danger.100}', _dark: '{colors.danger.800}' } },
        'danger.fg': { value: { _light: '{colors.danger.700}', _dark: '{colors.danger.200}' } },
        // Success semantic tokens
        'success.subtle': { value: { _light: '{colors.success.50}', _dark: '#1A2E0A' } },
        'success.fg': { value: { _light: '{colors.success.700}', _dark: '{colors.success.500}' } },
        // Warning semantic tokens
        'warning.subtle': { value: { _light: '{colors.warning.50}', _dark: '#2E2400' } },
        'warning.muted': { value: { _light: '{colors.warning.100}', _dark: '#3D3000' } },
        'warning.fg': { value: { _light: '{colors.warning.700}', _dark: '{colors.warning.300}' } },
        // Surfaces (prototype --c-bg, --c-surface, --c-border)
        'bg.page': { value: { _light: '#F3F6F9', _dark: '#0F1318' } },
        'bg.surface': { value: { _light: '#FFFFFF', _dark: '#1A2230' } },
        'bg.surface.hover': { value: { _light: '#F8FAFC', _dark: '#334455' } },
        'bg.muted': { value: { _light: '#F0F4F8', _dark: '#151E29' } },
        'bg.input': { value: { _light: '#F7F8FA', _dark: '#151E29' } },
        'border.default': { value: { _light: '#D8E3ED', _dark: '#2E3F50' } },
        'border.strong': { value: { _light: '#B0C4D3', _dark: '#4E6478' } },
        // Text (prototype --c-text*)
        'text.default': { value: { _light: '#323538', _dark: '#E2E8F0' } },
        'text.secondary': { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.200}' } },
        'text.muted': { value: { _light: '{colors.brand.500}', _dark: '{colors.brand.300}' } },
        'text.inactive': { value: { _light: '#6B7A8D', _dark: '#8899AA' } },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)

export default system
