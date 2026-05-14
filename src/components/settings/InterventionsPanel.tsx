import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  Switch,
  Input,
  Badge,
  Separator,
} from '@chakra-ui/react'
import { GhostButton } from '@/components/ui'
import { useInterventionSettings } from '@/hooks/useInterventionSettings'
import { ShoppingListTemplatesSection } from '@/components/profile/ShoppingListTemplatesSection'
import { DEFAULT_TASKS } from '@/lib/constants/taskDefaults'
import { PanelHeader } from './SettingsShared'

export function InterventionsPanel() {
  const {
    defaultTasks, customTasks,
    saveDefaultTasks, addCustomTask, removeCustomTask,
  } = useInterventionSettings()

  const [newTask, setNewTask] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const toggleTask = (task: string) => {
    const next = defaultTasks.includes(task)
      ? defaultTasks.filter(t => t !== task)
      : [...defaultTasks, task]
    saveDefaultTasks(next)
  }

  const handleAddCustom = () => {
    const trimmed = newTask.trim()
    if (!trimmed) return
    addCustomTask(trimmed)
    setNewTask('')
    showFeedback(`"${trimmed}" ajoutée`)
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Interventions"
        subtitle="Configurez vos tâches habituelles et votre liste de courses type. Ces préférences seront pré-remplies dans chaque nouvelle intervention."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg="accent.subtle" borderWidth="1px" borderColor="accent.muted">
          <Text fontSize="sm" color="accent.fg">{feedback}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Tâches habituelles</Card.Title>
          <Text fontSize="sm" color="text.muted" mt={1}>
            Cochez les tâches que vous réalisez régulièrement. Elles seront pré-sélectionnées dans le formulaire d'intervention.
          </Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            {DEFAULT_TASKS.map(task => (
              <HStack
                key={task}
                as="label"
                gap={3}
                py={2}
                px={3}
                cursor="pointer"
                borderRadius="md"
                _hover={{ bg: 'bg.muted' }}
                transition="background 0.15s"
              >
                <Switch.Root
                  size="sm"
                  checked={defaultTasks.includes(task)}
                  onCheckedChange={() => toggleTask(task)}
                >
                  <Switch.HiddenInput />
                  <Switch.Control
                    borderRadius="full"
                    css={{
                      '&[data-state=checked]': { background: '#9BB23B !important' },
                    }}
                  >
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Root>
                <Text fontSize="sm" fontWeight={defaultTasks.includes(task) ? '600' : '400'}>
                  {task}
                </Text>
              </HStack>
            ))}
          </VStack>

          <Separator my={4} />

          <Text fontSize="sm" fontWeight="600" color="text.muted" mb={2}>
            Tâches personnalisées
          </Text>
          {customTasks.length > 0 && (
            <HStack gap={2} flexWrap="wrap" mb={3}>
              {customTasks.map(task => (
                <Badge
                  key={task}
                  px={3} py={1}
                  borderRadius="full"
                  variant="subtle"
                  colorPalette="brand"
                  fontSize="xs"
                  fontWeight="500"
                >
                  {task}
                  <Box
                    as="button" type="button"
                    ml={2} fontSize="xs" fontWeight="700"
                    opacity={0.6} _hover={{ opacity: 1 }}
                    onClick={() => removeCustomTask(task)}
                    aria-label={`Retirer la tâche ${task}`}
                  >✕</Box>
                </Badge>
              ))}
            </HStack>
          )}
          <HStack gap={2}>
            <Input
              size="sm"
              placeholder="Ajouter une tâche personnalisée…"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() } }}
              borderRadius="md"
              aria-label="Ajouter une tâche personnalisée"
            />
            <GhostButton size="sm" onClick={handleAddCustom}>+ Ajouter</GhostButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      <ShoppingListTemplatesSection />
    </VStack>
  )
}
