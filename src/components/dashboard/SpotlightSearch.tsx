import { useRef, useEffect } from 'react'
import { Box, Dialog, Flex, Input, Portal, Text } from '@chakra-ui/react'
import { NavIcon } from '@/components/ui'
import { CATEGORY_LABELS } from '@/services/searchService'
import type { SearchResult, SearchCategory } from '@/services/searchService'
import type { UseSpotlightSearchReturn } from '@/hooks/useSpotlightSearch'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Regroupe les résultats par catégorie en préservant l'ordre */
function groupByCategory(results: SearchResult[]): { category: SearchCategory; items: SearchResult[] }[] {
  const map = new Map<SearchCategory, SearchResult[]>()
  for (const r of results) {
    const existing = map.get(r.category)
    if (existing) {
      existing.push(r)
    } else {
      map.set(r.category, [r])
    }
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
}

// ── Search icon ──────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      width={18} height={18} aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ── SpotlightSearch ──────────────────────────────────────────────────────────

interface SpotlightSearchProps {
  spotlight: UseSpotlightSearchReturn
}

export function SpotlightSearch({ spotlight }: SpotlightSearchProps) {
  const {
    isOpen,
    close,
    query,
    setQuery,
    results,
    activeIndex,
    setActiveIndex,
    isLoading,
    handleKeyDown,
    selectResult,
  } = spotlight

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Focus l'input à l'ouverture
  useEffect(() => {
    if (isOpen) {
      // Petit délai pour attendre le rendu du Dialog
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Scroll l'item actif en vue
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const groups = groupByCategory(results)

  // Compteur global pour data-index
  let globalIndex = 0

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => { if (!e.open) close() }}
    >
      <Portal>
        <Dialog.Backdrop
          bg="blackAlpha.400"
          css={{
            backdropFilter: 'blur(2px)',
            '@media (prefers-reduced-motion: reduce)': { backdropFilter: 'none' },
          }}
        />
        <Dialog.Positioner
          display="flex"
          alignItems="flex-start"
          justifyContent="center"
          pt="15vh"
        >
          <Dialog.Content
            bg="bg.surface"
            borderRadius="16px"
            maxW="560px"
            w="90vw"
            overflow="hidden"
            boxShadow="0 8px 32px rgba(78,100,120,.16)"
          >
            {/* ── Input ─────────────────────────────────────── */}
            <Flex
              align="center"
              gap={3}
              px={4}
              py={3}
              borderBottomWidth="1px"
              borderColor="border.default"
            >
              <Box color="brand.500">
                <SearchIcon />
              </Box>
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher une page, un employé, une intervention…"
                aria-label="Recherche globale"
                role="combobox"
                aria-expanded={results.length > 0}
                aria-controls="spotlight-results"
                aria-activedescendant={
                  results.length > 0 ? `spotlight-result-${activeIndex}` : undefined
                }
                autoComplete="off"
                variant="unstyled"
                fontSize="md"
                flex={1}
              />
              <Flex
                as="kbd"
                align="center"
                justify="center"
                bg="bg.page"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="6px"
                px={2}
                h="24px"
                fontSize="xs"
                fontWeight="600"
                color="text.muted"
                flexShrink={0}
              >
                Esc
              </Flex>
            </Flex>

            {/* ── Résultats ─────────────────────────────────── */}
            <Box
              ref={listRef}
              id="spotlight-results"
              role="listbox"
              aria-label="Résultats de recherche"
              maxH="400px"
              overflowY="auto"
            >
              {isLoading && !query && (
                <Flex justify="center" py={6}>
                  <Text fontSize="sm" color="text.muted">
                    Chargement…
                  </Text>
                </Flex>
              )}

              {!isLoading && query && results.length === 0 && (
                <Flex direction="column" align="center" py={8} gap={1}>
                  <Text fontSize="sm" color="text.muted">
                    Aucun résultat pour « {query} »
                  </Text>
                </Flex>
              )}

              {!query && !isLoading && (
                <Flex direction="column" align="center" py={8} gap={1}>
                  <Text fontSize="sm" color="text.muted">
                    Tapez pour rechercher…
                  </Text>
                </Flex>
              )}

              {groups.map((group) => (
                <Box key={group.category} py={1}>
                  <Text
                    fontSize="xs"
                    fontWeight="bold"
                    textTransform="uppercase"
                    letterSpacing="0.08em"
                    color="text.muted"
                    px={4}
                    py={1}
                  >
                    {CATEGORY_LABELS[group.category]}
                  </Text>
                  {group.items.map((result) => {
                    const idx = globalIndex++
                    const isActive = idx === activeIndex
                    return (
                      <Flex
                        key={result.id}
                        id={`spotlight-result-${idx}`}
                        data-index={idx}
                        role="option"
                        aria-selected={isActive}
                        align="center"
                        gap={3}
                        px={4}
                        py={2}
                        mx={2}
                        borderRadius="8px"
                        cursor="pointer"
                        bg={isActive ? 'brand.subtle' : 'transparent'}
                        color={isActive ? 'brand.600' : 'text.default'}
                        transition="background 0.1s ease"
                        _hover={{ bg: 'brand.subtle' }}
                        onClick={() => selectResult(result)}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <Box
                          color={isActive ? 'brand.500' : 'brand.400'}
                          flexShrink={0}
                        >
                          <NavIcon name={result.icon} size={16} />
                        </Box>
                        <Box flex={1} minW={0}>
                          <Text
                            fontSize="sm"
                            fontWeight={isActive ? '600' : '500'}
                            truncate
                          >
                            {result.title}
                          </Text>
                          {result.subtitle && (
                            <Text fontSize="xs" color="text.muted" truncate>
                              {result.subtitle}
                            </Text>
                          )}
                        </Box>
                        {isActive && (
                          <Text fontSize="xs" color="text.muted" flexShrink={0}>
                            ↵
                          </Text>
                        )}
                      </Flex>
                    )
                  })}
                </Box>
              ))}
            </Box>

            {/* ── Footer ────────────────────────────────────── */}
            <Flex
              align="center"
              justify="center"
              gap={4}
              px={4}
              py={2}
              borderTopWidth="1px"
              borderColor="border.default"
              bg="bg.page"
            >
              <Text fontSize="xs" color="text.muted">
                <Box as="span" fontWeight="600">↑↓</Box> naviguer
              </Text>
              <Text fontSize="xs" color="text.muted">
                <Box as="span" fontWeight="600">↵</Box> ouvrir
              </Text>
              <Text fontSize="xs" color="text.muted">
                <Box as="span" fontWeight="600">esc</Box> fermer
              </Text>
            </Flex>

            {/* Annonce live pour screen readers */}
            <Box
              aria-live="polite"
              aria-atomic="true"
              position="absolute"
              w="1px"
              h="1px"
              overflow="hidden"
              clip="rect(0,0,0,0)"
            >
              {query && results.length > 0
                ? `${results.length} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}`
                : query
                  ? 'Aucun résultat'
                  : ''}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
