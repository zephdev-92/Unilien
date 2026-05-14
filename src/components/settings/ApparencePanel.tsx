import React, { useState } from 'react'
import {
  Box,
  HStack,
  VStack,
  Text,
  Card,
} from '@chakra-ui/react'
import { PanelHeader, ToggleRow } from './SettingsShared'

const APPARENCE_STORAGE_KEY = 'unilien-apparence'

type PaletteId = 'ardoise' | 'foret' | 'indigo' | 'rubis'

interface PaletteDef {
  label: string
  swatch: string
  vars: Record<string, string>
}

const PALETTES: Record<PaletteId, PaletteDef> = {
  ardoise: {
    label: 'Ardoise',
    swatch: '#3D5166',
    vars: {
      '--chakra-colors-brand-50': '#EDF1F5',
      '--chakra-colors-brand-100': '#C2D2E0',
      '--chakra-colors-brand-200': '#97B3C7',
      '--chakra-colors-brand-300': '#6D93AD',
      '--chakra-colors-brand-400': '#4E6478',
      '--chakra-colors-brand-500': '#3D5166',
      '--chakra-colors-brand-600': '#2E3F50',
      '--chakra-colors-brand-700': '#1F2C3B',
      '--chakra-colors-brand-800': '#151E29',
      '--chakra-colors-brand-900': '#0B1017',
    },
  },
  foret: {
    label: 'Forêt',
    swatch: '#2D6A4F',
    vars: {
      '--chakra-colors-brand-50': '#E9F5F0',
      '--chakra-colors-brand-100': '#B7DDD0',
      '--chakra-colors-brand-200': '#85C5B0',
      '--chakra-colors-brand-300': '#53AD90',
      '--chakra-colors-brand-400': '#3B8870',
      '--chakra-colors-brand-500': '#2D6A4F',
      '--chakra-colors-brand-600': '#22503C',
      '--chakra-colors-brand-700': '#183829',
      '--chakra-colors-brand-800': '#0E2018',
      '--chakra-colors-brand-900': '#050D08',
    },
  },
  indigo: {
    label: 'Indigo',
    swatch: '#4338CA',
    vars: {
      '--chakra-colors-brand-50': '#EEECFB',
      '--chakra-colors-brand-100': '#C9C4F4',
      '--chakra-colors-brand-200': '#A49DED',
      '--chakra-colors-brand-300': '#7F76E6',
      '--chakra-colors-brand-400': '#5B52DB',
      '--chakra-colors-brand-500': '#4338CA',
      '--chakra-colors-brand-600': '#342BA0',
      '--chakra-colors-brand-700': '#251F76',
      '--chakra-colors-brand-800': '#17134D',
      '--chakra-colors-brand-900': '#090724',
    },
  },
  rubis: {
    label: 'Rubis',
    swatch: '#9D174D',
    vars: {
      '--chakra-colors-brand-50': '#FDF0F5',
      '--chakra-colors-brand-100': '#F8C6D9',
      '--chakra-colors-brand-200': '#F29CBE',
      '--chakra-colors-brand-300': '#E566A3',
      '--chakra-colors-brand-400': '#C73D7A',
      '--chakra-colors-brand-500': '#9D174D',
      '--chakra-colors-brand-600': '#7B123C',
      '--chakra-colors-brand-700': '#580D2B',
      '--chakra-colors-brand-800': '#36081A',
      '--chakra-colors-brand-900': '#14030A',
    },
  },
}

function applyPalette(id: PaletteId) {
  const palette = PALETTES[id]
  const root = document.documentElement
  Object.entries(palette.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

function loadApparenceSettings(): { darkMode: boolean; density: 'comfortable' | 'compact'; palette: PaletteId } {
  try {
    const raw = localStorage.getItem(APPARENCE_STORAGE_KEY)
    return raw ? { palette: 'ardoise', ...JSON.parse(raw) } : { darkMode: false, density: 'comfortable', palette: 'ardoise' }
  } catch { return { darkMode: false, density: 'comfortable', palette: 'ardoise' } }
}

function applyDensity(density: 'comfortable' | 'compact') {
  document.documentElement.setAttribute('data-density', density)
}

export function ApparencePanel() {
  const [settings, setSettings] = useState(() => {
    const s = loadApparenceSettings()
    applyDensity(s.density)
    applyPalette(s.palette)
    return s
  })

  const update = (patch: Partial<typeof settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      localStorage.setItem(APPARENCE_STORAGE_KEY, JSON.stringify(next))
      if (next.density !== prev.density) applyDensity(next.density)
      if (next.palette !== prev.palette) applyPalette(next.palette)
      if (next.darkMode !== prev.darkMode) {
        if (next.darkMode) document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Apparence"
        subtitle="Personnalisez l'interface selon vos préférences visuelles."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Thème</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <ToggleRow
            label="Mode sombre"
            description="Réduit la fatigue visuelle en environnement peu éclairé."
            checked={settings.darkMode}
            onChange={() => update({ darkMode: !settings.darkMode })}
          />
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Densité de l'interface</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={4} role="radiogroup" aria-label="Densité de l'interface">
            {(['comfortable', 'compact'] as const).map((d) => (
              <Box
                key={d}
                flex={1}
                borderWidth="2px"
                borderColor={settings.density === d ? 'brand.500' : 'border.default'}
                borderRadius="10px"
                p={4}
                cursor="pointer"
                onClick={() => update({ density: d })}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    update({ density: d })
                  }
                }}
                role="radio"
                aria-checked={settings.density === d}
                aria-label={d === 'comfortable' ? 'Confortable' : 'Compact'}
                tabIndex={0}
                transition="border-color 0.15s ease"
              >
                <Text fontWeight="medium" fontSize="sm" mb={1}>
                  {d === 'comfortable' ? 'Confortable' : 'Compact'}
                </Text>
                <Text fontSize="xs" color="text.muted">
                  {d === 'comfortable'
                    ? "Plus d'espace entre les éléments"
                    : "Interface plus dense, plus d'informations visibles"}
                </Text>
              </Box>
            ))}
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Palette de couleurs</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={3} wrap="wrap" role="radiogroup" aria-label="Palette de couleurs">
            {(Object.entries(PALETTES) as [PaletteId, PaletteDef][]).map(([id, p]) => {
              const isSelected = settings.palette === id
              return (
                <Box
                  key={id}
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  gap={2}
                  cursor="pointer"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={p.label}
                  tabIndex={0}
                  onClick={() => update({ palette: id })}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); update({ palette: id }) }
                  }}
                  p={2}
                  borderRadius="10px"
                  transition="background 0.15s ease"
                  _hover={{ bg: 'bg.muted' }}
                >
                  <Box
                    w="36px"
                    h="36px"
                    borderRadius="full"
                    bg={p.swatch}
                    borderWidth={isSelected ? '3px' : '2px'}
                    borderColor={isSelected ? p.swatch : 'border.default'}
                    outline={isSelected ? `3px solid ${p.swatch}` : 'none'}
                    outlineOffset="2px"
                    transition="outline 0.15s ease, border-color 0.15s ease"
                  />
                  <Text fontSize="xs" fontWeight={isSelected ? '600' : '400'} color={isSelected ? 'brand.fg' : 'text.muted'}>
                    {p.label}
                  </Text>
                </Box>
              )
            })}
          </HStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2} align="center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true" style={{ flexShrink: 0 }}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
        <Text fontSize="sm" color="text.muted">Ces paramètres sont enregistrés localement sur votre appareil.</Text>
      </HStack>
    </VStack>
  )
}
