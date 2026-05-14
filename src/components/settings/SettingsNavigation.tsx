/**
 * Navigation latérale (sidebar desktop + tabs scrollables mobile)
 * pour la page Paramètres.
 */

import { useRef, useState, useCallback, useEffect } from 'react'
import { Box, VStack, Text, Button } from '@chakra-ui/react'
import { NAV_SECTIONS, type PanelId } from './navigationConfig'

interface SettingsNavigationProps {
  activePanel: PanelId
  onSelectPanel: (id: PanelId) => void
  userRole: string
}

export function SettingsNavigation({ activePanel, onSelectPanel, userRole }: SettingsNavigationProps) {
  const navRef = useRef<HTMLDivElement>(null)
  const [showPrev, setShowPrev] = useState(false)
  const [showNext, setShowNext] = useState(false)

  const updateArrows = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setShowPrev(el.scrollLeft > 4)
    setShowNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    updateArrows()
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows])

  const scrollNav = useCallback((dir: 'prev' | 'next') => {
    const el = navRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'next' ? 150 : -150, behavior: 'smooth' })
  }, [])

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.roles || item.roles.includes(userRole)
    ),
  })).filter((section) => section.items.length > 0)

  return (
    <Box
      minW={{ md: '210px' }}
      w={{ base: '100%', md: '210px' }}
      flexShrink={0}
      borderRightWidth={{ base: '0', md: '1px' }}
      borderBottomWidth={{ base: '1px', md: '0' }}
      borderColor="border.default"
      bg="bg.surface"
      py={{ base: 0, md: 3 }}
      position={{ base: 'relative', md: 'fixed' }}
      top={{ md: '60px' }}
      bottom={{ md: '0' }}
      zIndex={{ md: 100 }}
      overflowY={{ md: 'auto' }}
    >
      {showPrev && (
        <Box
          as="button"
          onClick={() => scrollNav('prev')}
          display={{ base: 'flex', md: 'none' }}
          position="absolute"
          left="4px"
          top="50%"
          transform="translateY(-50%)"
          zIndex={2}
          w="28px"
          h="28px"
          borderRadius="50%"
          border="2px solid"
          borderColor="brand.500"
          bg="bg.surface"
          color="brand.500"
          alignItems="center"
          justifyContent="center"
          _hover={{ bg: 'brand.500', color: 'white' }}
          transition="background 0.15s ease, color 0.15s ease"
          aria-label="Défiler vers la gauche"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><polyline points="15 18 9 12 15 6" /></svg>
        </Box>
      )}

      {showNext && (
        <Box
          as="button"
          onClick={() => scrollNav('next')}
          display={{ base: 'flex', md: 'none' }}
          position="absolute"
          right="4px"
          top="50%"
          transform="translateY(-50%)"
          zIndex={2}
          w="28px"
          h="28px"
          borderRadius="50%"
          border="2px solid"
          borderColor="brand.500"
          bg="bg.surface"
          color="brand.500"
          alignItems="center"
          justifyContent="center"
          _hover={{ bg: 'brand.500', color: 'white' }}
          transition="background 0.15s ease, color 0.15s ease"
          aria-label="Défiler vers la droite"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" width={14} height={14}><polyline points="9 18 15 12 9 6" /></svg>
        </Box>
      )}

      <Box
        ref={navRef}
        overflowX={{ base: 'auto', md: 'visible' }}
        display={{ base: 'flex', md: 'block' }}
        gap={0}
        px={{ base: '36px', md: 0 }}
        css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {visibleSections.map((section) => (
          <Box key={section.label} mb={{ md: 4 }} display={{ base: 'flex', md: 'block' }} flexShrink={0}>
            <Text
              fontSize="xs"
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing="0.06em"
              color="text.muted"
              px={5}
              pb={2}
              display={{ base: 'none', md: 'block' }}
            >
              {section.label}
            </Text>
            <VStack gap={0} align="stretch" display={{ base: 'flex', md: 'flex' }} flexDirection={{ base: 'row', md: 'column' }}>
              {section.items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  justifyContent="flex-start"
                  fontWeight={activePanel === item.id ? '700' : '500'}
                  color={activePanel === item.id ? 'brand.fg' : 'text.muted'}
                  bg={activePanel === item.id ? 'color-mix(in srgb, var(--chakra-colors-brand-500) 30%, transparent)' : 'transparent'}
                  onClick={() => onSelectPanel(item.id)}
                  whiteSpace="nowrap"
                  gap={2}
                  borderRadius={{ base: '6px', md: '6px' }}
                  fontSize="sm"
                  px={{ base: 3, md: 5 }}
                  py={{ base: '12px', md: '9px' }}
                  h="auto"
                  mx="5px"
                  my={{ base: activePanel === item.id ? '5px' : 0, md: 0 }}
                  w={{ md: 'calc(100% - 10px)' }}
                  flexShrink={0}
                  _hover={{ bg: 'brand.subtle', color: 'brand.500', borderRadius: '6px', my: { base: '5px', md: 0 } }}
                  transition="background 0.15s ease, color 0.15s ease"
                  css={{ '& svg': { width: { base: '14px', md: '16px' }, height: { base: '14px', md: '16px' } } }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </VStack>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
