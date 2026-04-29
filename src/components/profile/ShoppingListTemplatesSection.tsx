/**
 * Section "Mes listes de courses" dans la page Paramètres > Interventions.
 *
 * Permet à Marie de gérer jusqu'à 5 templates de listes de courses
 * (ex: « Courses semaine », « Pharmacie », « Ménage »), de définir laquelle
 * est utilisée par défaut, et d'éditer leurs items.
 *
 * Les modifications n'affectent pas les interventions passées (snapshot natif
 * via `shifts.tasks`).
 */

import { useState } from 'react'
import {
  Box, Card, HStack, VStack, Text, Input, Badge, Spinner, Center,
} from '@chakra-ui/react'
import { GhostButton, PrimaryButton } from '@/components/ui'
import { useShoppingListTemplates } from '@/hooks/useShoppingListTemplates'
import { SHOPPING_LIST_TEMPLATES_LIMIT, type ShoppingListTemplate } from '@/services/shoppingListTemplateService'
import type { ShoppingItem } from '@/lib/constants/taskDefaults'

export function ShoppingListTemplatesSection() {
  const {
    templates, isLoading, isAtLimit, error,
    createTemplate, updateTemplate, deleteTemplate, setDefault,
  } = useShoppingListTemplates()

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name || isAtLimit) return
    setCreating(true)
    const created = await createTemplate({ name })
    setCreating(false)
    if (created) {
      setNewName('')
      setExpandedId(created.id)
    }
  }

  if (isLoading && templates.length === 0) {
    return (
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Body p={4}>
          <Center py={6}><Spinner size="sm" /></Center>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <HStack justify="space-between" align="start">
          <Box>
            <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">
              Mes listes de courses
            </Card.Title>
            <Text fontSize="sm" color="text.muted" mt={1}>
              Créez jusqu&apos;à {SHOPPING_LIST_TEMPLATES_LIMIT} listes (ex&nbsp;: « Courses semaine », « Pharmacie »).
              Vous choisirez laquelle utiliser à la création d&apos;une intervention.
            </Text>
          </Box>
          <Badge variant="subtle" colorPalette="brand" fontSize="xs" whiteSpace="nowrap">
            {templates.length} / {SHOPPING_LIST_TEMPLATES_LIMIT}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body p={4}>
        {error && (
          <Box px={3} py={2} mb={3} borderRadius="md" bg="red.50" borderWidth="1px" borderColor="red.200">
            <Text fontSize="sm" color="red.700">{error}</Text>
          </Box>
        )}

        {templates.length === 0 ? (
          <Box p={6} textAlign="center" borderWidth="1px" borderStyle="dashed" borderColor="border.default" borderRadius="md" mb={4}>
            <Text fontSize="sm" color="text.muted">
              Aucune liste pour l&apos;instant. Créez votre première liste ci-dessous.
            </Text>
          </Box>
        ) : (
          <VStack gap={2} align="stretch" mb={4}>
            {templates.map(template => (
              <TemplateRow
                key={template.id}
                template={template}
                expanded={expandedId === template.id}
                onToggleExpand={() => setExpandedId(expandedId === template.id ? null : template.id)}
                onSetDefault={() => setDefault(template.id)}
                onDelete={() => deleteTemplate(template.id)}
                onUpdate={patch => updateTemplate(template.id, patch)}
              />
            ))}
          </VStack>
        )}

        {/* Création d'une nouvelle liste */}
        <Box pt={3} borderTopWidth="1px" borderColor="border.default">
          <Text fontSize="sm" fontWeight="600" color="text.muted" mb={2}>
            Créer une nouvelle liste
          </Text>
          <HStack gap={2}>
            <Input
              size="sm"
              placeholder="Nom de la liste (ex : Pharmacie)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !isAtLimit) { e.preventDefault(); void handleCreate() } }}
              borderRadius="md"
              maxLength={60}
              disabled={isAtLimit}
              aria-label="Nom de la nouvelle liste"
            />
            <PrimaryButton
              size="sm"
              onClick={handleCreate}
              disabled={isAtLimit || !newName.trim() || creating}
            >
              {creating ? '…' : '+ Créer'}
            </PrimaryButton>
          </HStack>
          {isAtLimit && (
            <Text fontSize="xs" color="text.muted" mt={2}>
              Limite atteinte&nbsp;: {SHOPPING_LIST_TEMPLATES_LIMIT} listes maximum. Supprimez-en une pour en créer une nouvelle.
            </Text>
          )}
        </Box>
      </Card.Body>
    </Card.Root>
  )
}

// ── Une ligne par template ──

interface TemplateRowProps {
  template: ShoppingListTemplate
  expanded: boolean
  onToggleExpand: () => void
  onSetDefault: () => void
  onDelete: () => void
  onUpdate: (patch: { name?: string; items?: ShoppingItem[] }) => Promise<boolean>
}

function TemplateRow({
  template, expanded, onToggleExpand,
  onSetDefault, onDelete, onUpdate,
}: TemplateRowProps) {
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(template.name)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRename = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === template.name) {
      setRenaming(false)
      setName(template.name)
      return
    }
    const ok = await onUpdate({ name: trimmed })
    if (ok) setRenaming(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await onDelete()
  }

  return (
    <Box
      borderWidth="1px"
      borderColor={template.isDefault ? 'brand.300' : 'border.default'}
      borderRadius="md"
      bg={template.isDefault ? 'brand.subtle' : 'bg.surface'}
      transition="all 0.15s"
    >
      {/* Header de la card */}
      <HStack
        gap={3}
        px={3}
        py={2}
        cursor="pointer"
        onClick={onToggleExpand}
        _hover={{ bg: template.isDefault ? 'brand.subtle' : 'bg.muted' }}
        borderRadius="md"
      >
        <Text fontSize="sm" color="text.muted" w="14px">
          {expanded ? '▾' : '▸'}
        </Text>

        {renaming ? (
          <Input
            size="sm"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') { e.preventDefault(); void handleRename() }
              if (e.key === 'Escape') { setRenaming(false); setName(template.name) }
            }}
            onClick={e => e.stopPropagation()}
            onBlur={handleRename}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            maxLength={60}
            flex={1}
          />
        ) : (
          <Text
            fontSize="sm"
            fontWeight="600"
            flex={1}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true) }}
          >
            {template.name}
          </Text>
        )}

        <Text fontSize="xs" color="text.muted">
          {template.items.length} article{template.items.length > 1 ? 's' : ''}
        </Text>

        {template.isDefault && (
          <Badge variant="subtle" colorPalette="brand" fontSize="xs">Par défaut</Badge>
        )}
      </HStack>

      {/* Body expandable */}
      {expanded && (
        <Box px={3} pb={3} borderTopWidth="1px" borderColor="border.default" pt={2}>
          {/* Items */}
          <ItemsEditor
            items={template.items}
            onChange={items => onUpdate({ items })}
          />

          {/* Actions */}
          <HStack gap={2} mt={3} pt={3} borderTopWidth="1px" borderColor="border.default" justify="flex-end" flexWrap="wrap">
            {!renaming && (
              <GhostButton size="sm" onClick={() => setRenaming(true)}>Renommer</GhostButton>
            )}
            {!template.isDefault && (
              <GhostButton size="sm" onClick={onSetDefault}>Définir par défaut</GhostButton>
            )}
            {confirmDelete ? (
              <>
                <Text fontSize="xs" color="red.700" mr={2}>Confirmer ?</Text>
                <GhostButton size="sm" onClick={() => setConfirmDelete(false)}>Annuler</GhostButton>
                <PrimaryButton size="sm" colorPalette="red" onClick={handleDelete}>Supprimer</PrimaryButton>
              </>
            ) : (
              <GhostButton size="sm" onClick={handleDelete}>Supprimer</GhostButton>
            )}
          </HStack>
        </Box>
      )}
    </Box>
  )
}

// ── Éditeur d'items pour un template ──

interface ItemsEditorProps {
  items: ShoppingItem[]
  onChange: (items: ShoppingItem[]) => Promise<boolean>
}

function ItemsEditor({ items, onChange }: ItemsEditorProps) {
  const [newName, setNewName] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newNote, setNewNote] = useState('')

  const addItem = () => {
    const name = newName.trim()
    if (!name) return
    const next: ShoppingItem[] = [
      ...items,
      { name, brand: newBrand.trim(), quantity: 1, note: newNote.trim() },
    ]
    void onChange(next)
    setNewName('')
    setNewBrand('')
    setNewNote('')
  }

  const removeItem = (index: number) => {
    void onChange(items.filter((_, i) => i !== index))
  }

  const updateQuantity = (index: number, delta: number) => {
    const next = items.map((item, i) =>
      i === index
        ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
        : item
    )
    void onChange(next)
  }

  return (
    <VStack gap={2} align="stretch">
      {items.length === 0 ? (
        <Text fontSize="xs" color="text.muted" fontStyle="normal" textAlign="center" py={2}>
          Aucun article. Ajoutez-en un ci-dessous.
        </Text>
      ) : (
        <VStack gap={1} align="stretch">
          {items.map((item, i) => (
            <HStack
              key={`${item.name}-${item.brand}-${i}`}
              gap={2}
              px={2} py={1.5}
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="md"
              fontSize="sm"
            >
              <VStack gap={0} align="start" flex={1}>
                <HStack gap={2}>
                  <Text fontWeight="600" fontSize="sm">{item.name}</Text>
                  {item.brand && (
                    <Text fontSize="xs" color="text.muted">— {item.brand}</Text>
                  )}
                </HStack>
                {item.note && (
                  <Text fontSize="xs" color="text.muted">{item.note}</Text>
                )}
              </VStack>
              <HStack gap={1}>
                <Box
                  as="button" type="button"
                  w="20px" h="20px" borderRadius="full"
                  bg="border.default" fontSize="xs" fontWeight="bold"
                  display="flex" alignItems="center" justifyContent="center"
                  _hover={{ bg: 'brand.subtle' }}
                  onClick={() => updateQuantity(i, -1)}
                  aria-label={`Diminuer ${item.name}`}
                >−</Box>
                <Text fontSize="xs" fontWeight="600" minW="22px" textAlign="center">
                  x{item.quantity || 1}
                </Text>
                <Box
                  as="button" type="button"
                  w="20px" h="20px" borderRadius="full"
                  bg="border.default" fontSize="xs" fontWeight="bold"
                  display="flex" alignItems="center" justifyContent="center"
                  _hover={{ bg: 'brand.subtle' }}
                  onClick={() => updateQuantity(i, 1)}
                  aria-label={`Augmenter ${item.name}`}
                >+</Box>
              </HStack>
              <Box
                as="button" type="button"
                fontSize="xs" color="text.muted"
                opacity={0.5} _hover={{ opacity: 1, color: 'red.500' }}
                onClick={() => removeItem(i)}
                aria-label={`Retirer ${item.name}`}
              >&#10005;</Box>
            </HStack>
          ))}
        </VStack>
      )}

      <HStack gap={2}>
        <Input
          size="sm"
          placeholder="Article (ex : Lait)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          flex={2}
          aria-label="Nom de l'article"
        />
        <Input
          size="sm"
          placeholder="Marque"
          value={newBrand}
          onChange={e => setNewBrand(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          flex={1}
          aria-label="Marque"
        />
        <Input
          size="sm"
          placeholder="Note"
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
          flex={1}
          aria-label="Note"
        />
        <GhostButton size="sm" onClick={addItem}>+</GhostButton>
      </HStack>
    </VStack>
  )
}
