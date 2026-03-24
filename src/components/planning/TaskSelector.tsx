/**
 * Sélecteur de tâches prédéfinies avec liste de courses.
 * Améliorations : compteur, recherche, tout cocher, quantités, notes, autocomplete.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Box, Flex, Text, Stack, Input } from '@chakra-ui/react'
import {
  DEFAULT_TASKS,
  parseTasksArray,
  encodeTasksArray,
  formatShoppingItem,
  parseShoppingItemString,
} from '@/lib/constants/taskDefaults'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'
import { loadDefaultTasks, loadCustomTasks, loadShoppingList, useInterventionSettings } from '@/hooks/useInterventionSettings'

const MAX_CUSTOM_TASKS = 20

// ── Checkbox stylisé ──

function TaskCheckbox({
  label,
  sublabel,
  checked,
  onChange,
  indent = false,
  rightContent,
}: {
  label: string
  sublabel?: string
  checked: boolean
  onChange: (checked: boolean) => void
  indent?: boolean
  rightContent?: React.ReactNode
}) {
  return (
    <Flex
      as="label"
      align="center"
      gap={2}
      py="6px"
      px={indent ? 6 : 2}
      cursor="pointer"
      borderRadius="8px"
      _hover={{ bg: 'bg.muted' }}
      transition="background 0.15s ease"
    >
      <Box
        as="button"
        type="button"
        w="20px"
        h="20px"
        borderRadius="6px"
        borderWidth="2px"
        borderColor={checked ? 'brand.500' : 'border.default'}
        bg={checked ? 'brand.500' : 'transparent'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        transition="all 0.15s ease"
        onClick={(e) => { e.preventDefault(); onChange(!checked) }}
        _hover={{ borderColor: 'brand.500' }}
      >
        {checked && (
          <Text color="white" fontSize="12px" fontWeight="bold" lineHeight={1}>&#10003;</Text>
        )}
      </Box>
      <Text fontSize="sm" color="text.default" fontWeight={checked ? '600' : '400'} flex={1}>
        {label}
        {sublabel && (
          <Text as="span" fontSize="xs" color="text.muted" fontStyle="italic" ml={1}>
            {sublabel}
          </Text>
        )}
      </Text>
      {rightContent}
    </Flex>
  )
}

// ── Quantité inline ──

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (qty: number) => void
}) {
  return (
    <Flex align="center" gap={1} onClick={e => e.stopPropagation()}>
      <Box
        as="button" type="button"
        w="20px" h="20px" borderRadius="full"
        bg="bg.muted" fontSize="xs" fontWeight="bold"
        display="flex" alignItems="center" justifyContent="center"
        _hover={{ bg: 'gray.200' }}
        onClick={() => onChange(Math.max(1, quantity - 1))}
      >-</Box>
      <Text fontSize="xs" fontWeight="600" minW="18px" textAlign="center">
        x{quantity}
      </Text>
      <Box
        as="button" type="button"
        w="20px" h="20px" borderRadius="full"
        bg="bg.muted" fontSize="xs" fontWeight="bold"
        display="flex" alignItems="center" justifyContent="center"
        _hover={{ bg: 'gray.200' }}
        onClick={() => onChange(quantity + 1)}
      >+</Box>
    </Flex>
  )
}

// ── Props ──

interface TaskSelectorProps {
  value: string[]
  onChange: (tasks: string[]) => void
  prefillFromSettings?: boolean
}

export function TaskSelector({ value, onChange, prefillFromSettings = false }: TaskSelectorProps) {
  const { articleSuggestions, searchArticles, trackArticle, shoppingList: savedShoppingList } = useInterventionSettings()

  // Prefill au mount
  const initialValue = useMemo(() => {
    if (prefillFromSettings && value.length === 0) {
      const tasks = loadDefaultTasks()
      const custom = loadCustomTasks()
      const hasCourses = tasks.includes('Courses')
      const shopping = hasCourses
        ? loadShoppingList().map(formatShoppingItem)
        : []
      return encodeTasksArray(tasks, shopping, custom)
    }
    return value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prefillDone = useRef(false)
  useEffect(() => {
    if (!prefillDone.current && prefillFromSettings && value.length === 0 && initialValue.length > 0) {
      prefillDone.current = true
      onChange(initialValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentValue = value.length > 0 ? value : initialValue

  const { selectedTasks, shoppingItems, customTasks } = useMemo(
    () => parseTasksArray(currentValue),
    [currentValue],
  )

  const [newCustomTask, setNewCustomTask] = useState('')
  const [newShoppingName, setNewShoppingName] = useState('')
  const [newShoppingBrand, setNewShoppingBrand] = useState('')
  const [newShoppingNote, setNewShoppingNote] = useState('')
  const [taskFilter, setTaskFilter] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionIndex, setSuggestionIndex] = useState(-1)
  const [lastAddedItem, setLastAddedItem] = useState<string | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const brandInputRef = useRef<HTMLInputElement>(null)
  const noteInputRef = useRef<HTMLInputElement>(null)

  const coursesSelected = selectedTasks.includes('Courses')

  // Compteur visuel
  const totalSelected = selectedTasks.length + customTasks.length
  const shoppingCount = shoppingItems.length

  // Filtre tâches
  const filteredDefaultTasks = useMemo(() => {
    if (!taskFilter.trim()) return DEFAULT_TASKS
    const q = taskFilter.toLowerCase()
    return DEFAULT_TASKS.filter(t => t.toLowerCase().includes(q))
  }, [taskFilter])

  const emitChange = useCallback(
    (next: { selected?: string[]; shopping?: string[]; custom?: string[] }) => {
      onChange(encodeTasksArray(
        next.selected ?? selectedTasks,
        next.shopping ?? shoppingItems,
        next.custom ?? customTasks,
      ))
    },
    [selectedTasks, shoppingItems, customTasks, onChange],
  )

  const toggleTask = (task: string) => {
    const isSelected = selectedTasks.includes(task)
    const nextSelected = isSelected
      ? selectedTasks.filter(t => t !== task)
      : [...selectedTasks, task]
    const nextShopping = task === 'Courses' && isSelected ? [] : shoppingItems
    emitChange({ selected: nextSelected, shopping: nextShopping })
  }

  const toggleShoppingItem = (item: string) => {
    const isSelected = shoppingItems.includes(item)
    emitChange({
      shopping: isSelected
        ? shoppingItems.filter(i => i !== item)
        : [...shoppingItems, item],
    })
  }

  // Supprimer un article de la liste
  const removeShoppingItem = (formatted: string) => {
    emitChange({
      shopping: shoppingItems.filter(i => i !== formatted),
    })
  }

  // Select all / deselect all shopping
  const toggleAllShopping = () => {
    const allFormatted = allShoppingItems.map(s => s.formatted)
    const allChecked = allFormatted.every(f => shoppingItems.includes(f))
    emitChange({ shopping: allChecked ? [] : allFormatted })
  }

  // Quantité d'un article
  const updateShoppingQuantity = (formatted: string, newQty: number) => {
    const parsed = parseShoppingItemString(formatted)
    parsed.quantity = newQty
    const newFormatted = formatShoppingItem(parsed)
    emitChange({
      shopping: shoppingItems.map(i => i === formatted ? newFormatted : i),
    })
  }

  const addCustomTask = () => {
    const trimmed = newCustomTask.trim()
    if (!trimmed) return
    // Doublon case-insensitive
    if (customTasks.some(t => t.toLowerCase() === trimmed.toLowerCase())) return
    // Limite
    if (customTasks.length >= MAX_CUSTOM_TASKS) return
    emitChange({ custom: [...customTasks, trimmed] })
    setNewCustomTask('')
  }

  const removeCustomTask = (task: string) => {
    emitChange({ custom: customTasks.filter(t => t !== task) })
  }

  const addShoppingItem = () => {
    const name = newShoppingName.trim()
    if (!name) return
    const brand = newShoppingBrand.trim()
    const note = newShoppingNote.trim()
    const item: ShoppingItem = { name, brand, quantity: 1, note }
    const formatted = formatShoppingItem(item)
    if (shoppingItems.includes(formatted)) return
    emitChange({ shopping: [...shoppingItems, formatted] })
    setNewShoppingName('')
    setNewShoppingBrand('')
    setNewShoppingNote('')
    setShowSuggestions(false)
    // Feedback visuel
    setLastAddedItem(formatted)
    setTimeout(() => setLastAddedItem(null), 1500)
    // Track dans l'historique
    trackArticle(name, brand)
  }

  // Autocomplete : recherche debounced quand on tape le nom
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (newShoppingName.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        searchArticles(newShoppingName.trim())
        setShowSuggestions(true)
        setSuggestionIndex(-1)
      }, 300)
    } else {
      setShowSuggestions(false)
      setSuggestionIndex(-1)
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newShoppingName])

  // Fermer suggestions au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectSuggestion = (suggestion: { name: string; brand: string }) => {
    setNewShoppingName(suggestion.name)
    setNewShoppingBrand(suggestion.brand)
    setShowSuggestions(false)
    setSuggestionIndex(-1)
    // Focus le champ note après sélection
    setTimeout(() => noteInputRef.current?.focus(), 0)
  }

  // Navigation clavier dans l'autocomplete
  const handleArticleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || articleSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        brandInputRef.current?.focus()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestionIndex(prev =>
        prev < articleSuggestions.length - 1 ? prev + 1 : 0,
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : articleSuggestions.length - 1,
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (suggestionIndex >= 0 && suggestionIndex < articleSuggestions.length) {
        selectSuggestion(articleSuggestions[suggestionIndex])
      } else {
        brandInputRef.current?.focus()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSuggestionIndex(-1)
    }
  }

  // Tous les articles disponibles depuis les paramètres (réactif via le store)
  const allShoppingItems: { item: ShoppingItem; formatted: string; checked: boolean }[] = useMemo(() => {
    const savedItems = savedShoppingList
    const formattedChecked = new Set(shoppingItems)
    const result: { item: ShoppingItem; formatted: string; checked: boolean }[] = []
    const seen = new Set<string>()

    for (const item of savedItems) {
      const f = formatShoppingItem(item)
      seen.add(f)
      result.push({ item, formatted: f, checked: formattedChecked.has(f) })
    }
    for (const f of shoppingItems) {
      if (!seen.has(f)) {
        result.push({ item: parseShoppingItemString(f), formatted: f, checked: true })
      }
    }
    return result
  }, [shoppingItems, savedShoppingList])

  const allShoppingChecked = allShoppingItems.length > 0 &&
    allShoppingItems.every(s => shoppingItems.includes(s.formatted))

  return (
    <Box>
      {/* En-tête avec compteur */}
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="600" fontSize="sm" color="text.default">
          Tâches prévues
        </Text>
        {totalSelected > 0 && (
          <Text fontSize="xs" color="brand.500" fontWeight="600">
            {totalSelected} tâche{totalSelected > 1 ? 's' : ''}
            {shoppingCount > 0 && ` + ${shoppingCount} article${shoppingCount > 1 ? 's' : ''}`}
          </Text>
        )}
      </Flex>

      {/* Recherche */}
      <Input
        size="sm"
        placeholder="Filtrer les tâches…"
        value={taskFilter}
        onChange={e => setTaskFilter(e.target.value)}
        borderWidth="1.5px"
        borderColor="border.default"
        borderRadius="8px"
        fontSize="xs"
        mb={2}
      />

      <Box
        borderWidth="1.5px"
        borderColor="border.default"
        borderRadius="10px"
        bg="bg.page"
        p={2}
        maxH="320px"
        overflowY="auto"
      >
        <Stack gap={0}>
          {filteredDefaultTasks.map(task => (
            <Box key={task}>
              <TaskCheckbox
                label={task}
                checked={selectedTasks.includes(task)}
                onChange={() => toggleTask(task)}
              />

              {task === 'Courses' && coursesSelected && (
                <Box
                  ml={4} mt={1} mb={2} pl={3}
                  borderLeftWidth="2px"
                  borderColor="brand.200"
                  bg="bg.muted"
                  borderRadius="0 8px 8px 0"
                  py={2}
                >
                  {/* Header shopping avec toggle all */}
                  <Flex justify="space-between" align="center" px={2} mb={1}>
                    <Text fontSize="xs" fontWeight="600" color="text.muted">
                      Liste de courses
                    </Text>
                    {allShoppingItems.length > 0 && (
                      <Box
                        as="button" type="button"
                        fontSize="xs" color="brand.500"
                        fontWeight="500"
                        _hover={{ textDecoration: 'underline' }}
                        onClick={toggleAllShopping}
                      >
                        {allShoppingChecked ? 'Tout décocher' : 'Tout cocher'}
                      </Box>
                    )}
                  </Flex>

                  <Stack gap={0}>
                    {allShoppingItems.length === 0 && (
                      <Text fontSize="xs" color="text.muted" px={6} py={1}>
                        Aucun article configuré. Ajoutez-en ci-dessous ou dans Paramètres.
                      </Text>
                    )}
                    {allShoppingItems.map(({ item, formatted, checked }) => (
                      <Flex
                        key={formatted}
                        align="center"
                        css={{
                          animation: lastAddedItem === formatted ? 'fadeInGreen 0.4s ease' : undefined,
                          '@keyframes fadeInGreen': {
                            '0%': { background: 'var(--chakra-colors-green-50)' },
                            '100%': { background: 'transparent' },
                          },
                        }}
                      >
                        <Box flex={1}>
                          <TaskCheckbox
                            label={item.name}
                            sublabel={item.brand ? `${item.brand}${item.note ? ` — ${item.note}` : ''}` : (item.note || undefined)}
                            checked={checked}
                            onChange={() => toggleShoppingItem(formatted)}
                            indent
                            rightContent={checked ? (
                              <QuantityControl
                                quantity={item.quantity || 1}
                                onChange={(qty) => updateShoppingQuantity(formatted, qty)}
                              />
                            ) : undefined}
                          />
                        </Box>
                        <Box
                          as="button" type="button"
                          fontSize="xs" color="red.300" px={1} mr={1}
                          opacity={0.5}
                          _hover={{ opacity: 1, color: 'red.500' }}
                          transition="all 0.12s"
                          onClick={() => removeShoppingItem(formatted)}
                          title="Retirer de la liste"
                        >&#10005;</Box>
                      </Flex>
                    ))}
                  </Stack>

                  {/* Ajout article avec autocomplete */}
                  <Box mt={2} px={2} position="relative" ref={suggestionsRef}>
                    <Flex gap={2}>
                      <Box flex={2} position="relative">
                        <Input
                          size="sm"
                          placeholder="Article…"
                          value={newShoppingName}
                          onChange={e => setNewShoppingName(e.target.value)}
                          onKeyDown={handleArticleKeyDown}
                          onFocus={() => {
                            if (newShoppingName.trim().length >= 2) setShowSuggestions(true)
                          }}
                          borderRadius="8px"
                          fontSize="xs"
                          role="combobox"
                          aria-expanded={showSuggestions && articleSuggestions.length > 0}
                          aria-activedescendant={suggestionIndex >= 0 ? `suggestion-${suggestionIndex}` : undefined}
                        />
                        {/* Dropdown autocomplete */}
                        {showSuggestions && articleSuggestions.length > 0 && (
                          <Box
                            position="absolute"
                            top="100%" left={0} right={0}
                            bg="bg.page"
                            borderWidth="1px"
                            borderColor="border.default"
                            borderRadius="8px"
                            boxShadow="md"
                            zIndex={10}
                            maxH="120px"
                            overflowY="auto"
                            mt={1}
                            role="listbox"
                          >
                            {articleSuggestions.map((s, idx) => (
                              <Box
                                key={`${s.name}::${s.brand}`}
                                id={`suggestion-${idx}`}
                                px={3} py={1.5}
                                fontSize="xs"
                                cursor="pointer"
                                bg={idx === suggestionIndex ? 'bg.muted' : undefined}
                                _hover={{ bg: 'bg.muted' }}
                                onClick={() => selectSuggestion(s)}
                                role="option"
                                aria-selected={idx === suggestionIndex}
                              >
                                <Text fontWeight="500">{s.name}</Text>
                                {s.brand && (
                                  <Text as="span" color="text.muted" ml={1}>({s.brand})</Text>
                                )}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                      <Input
                        ref={brandInputRef}
                        size="sm"
                        placeholder="Marque"
                        value={newShoppingBrand}
                        onChange={e => setNewShoppingBrand(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            noteInputRef.current?.focus()
                          }
                        }}
                        borderRadius="8px"
                        fontSize="xs"
                        flex={1}
                      />
                    </Flex>
                    <Flex gap={2} mt={1}>
                      <Input
                        ref={noteInputRef}
                        size="sm"
                        placeholder="Note (optionnel)…"
                        value={newShoppingNote}
                        onChange={e => setNewShoppingNote(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addShoppingItem() } }}
                        borderRadius="8px"
                        fontSize="xs"
                        flex={1}
                      />
                      <Box
                        as="button" type="button"
                        px={3} py={1}
                        bg="brand.500" color="white"
                        borderRadius="8px" fontSize="xs" fontWeight="600"
                        onClick={addShoppingItem}
                        _hover={{ bg: 'brand.600' }}
                        flexShrink={0}
                      >+</Box>
                    </Flex>
                  </Box>
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Tâches personnalisées */}
      <Box mt={3}>
        <Flex justify="space-between" align="center" mb={1}>
          <Text fontSize="xs" fontWeight="600" color="text.muted">
            Tâches personnalisées
          </Text>
          {customTasks.length > 0 && (
            <Text fontSize="xs" color="text.muted">
              {customTasks.length}/{MAX_CUSTOM_TASKS}
            </Text>
          )}
        </Flex>
        {customTasks.length > 0 && (
          <Stack gap={1} mb={2}>
            {customTasks.map(task => (
              <Flex key={task} align="center" gap={2} py={1} px={2} borderRadius="8px" bg="bg.muted">
                <Box w="5px" h="5px" borderRadius="full" bg="brand.500" flexShrink={0} />
                <Text fontSize="sm" flex={1}>{task}</Text>
                <Box
                  as="button" type="button"
                  fontSize="xs" color="red.400" px={1}
                  onClick={() => removeCustomTask(task)}
                  _hover={{ color: 'red.600' }}
                >&#10005;</Box>
              </Flex>
            ))}
          </Stack>
        )}
        <Flex gap={2}>
          <Input
            size="sm"
            placeholder={customTasks.length >= MAX_CUSTOM_TASKS ? 'Limite atteinte' : 'Ajouter une tâche…'}
            value={newCustomTask}
            onChange={e => setNewCustomTask(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTask() } }}
            borderWidth="1.5px"
            borderColor="border.default"
            borderRadius="8px"
            fontSize="sm"
            disabled={customTasks.length >= MAX_CUSTOM_TASKS}
          />
          <Box
            as="button" type="button"
            px={3} py={1}
            bg={customTasks.length >= MAX_CUSTOM_TASKS ? 'gray.300' : 'brand.500'}
            color="white"
            borderRadius="8px" fontSize="sm" fontWeight="600"
            onClick={addCustomTask}
            _hover={{ bg: customTasks.length >= MAX_CUSTOM_TASKS ? 'gray.300' : 'brand.600' }}
            flexShrink={0}
            cursor={customTasks.length >= MAX_CUSTOM_TASKS ? 'not-allowed' : 'pointer'}
          >+</Box>
        </Flex>
      </Box>
    </Box>
  )
}

export default TaskSelector
