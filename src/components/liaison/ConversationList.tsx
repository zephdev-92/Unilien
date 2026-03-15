import { useState, useMemo } from 'react'
import { Box, Flex, Text, Stack, Input } from '@chakra-ui/react'

import type { Conversation } from '@/types'
import { format, isToday, isYesterday, startOfWeek, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

// Heure relative prototype : HH:mm aujourd'hui, Hier, Lun/Mar…, dd/MM
function formatConvTime(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm', { locale: fr })
  if (isYesterday(date)) return 'Hier'
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = addDays(weekStart, 6)
  if (date >= weekStart && date <= weekEnd) {
    return format(date, 'EEE', { locale: fr }).slice(0, 3) // Lun, Mar…
  }
  return format(date, 'dd/MM', { locale: fr })
}

const AVATAR_COLORS = ['brand.500', 'warning.700', 'accent.500'] as const

interface ConversationListProps {
  conversations: Conversation[]
  selectedId: string | null
  onSelect: (conv: Conversation) => void
  currentUserId: string
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const team = conversations.find((c) => c.type === 'team')
  const privates = conversations.filter((c) => c.type === 'private')

  // Filter by search query
  const filteredTeam = useMemo(() => {
    if (!search.trim() || !team) return team
    const q = search.toLowerCase()
    if ('équipe'.includes(q) || team.lastMessage?.toLowerCase().includes(q)) return team
    return null
  }, [team, search])

  const filteredPrivates = useMemo(() => {
    if (!search.trim()) return privates
    const q = search.toLowerCase()
    return privates.filter((c) => {
      const name = c.otherParticipant
        ? `${c.otherParticipant.firstName} ${c.otherParticipant.lastName}`.toLowerCase()
        : ''
      return name.includes(q) || c.lastMessage?.toLowerCase().includes(q)
    })
  }, [privates, search])

  return (
    <Flex
      direction="column"
      h="100%"
      w={{ base: '100%', lg: '340px' }}
      flexShrink={0}
      borderRightWidth="1px"
      borderColor="border.default"
      bg="bg.surface"
      minW={0}
    >
      {/* Recherche — prototype: conv-list-header + search-wrap + search-input pill */}
      <Box px={4} py={3} pb={2} borderBottomWidth="1px" borderColor="border.default" flexShrink={0}>
        <Box position="relative">
          <Box
            position="absolute"
            left={3}
            top="50%"
            transform="translateY(-50%)"
            color="text.muted"
            pointerEvents="none"
            zIndex={1}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </Box>
          <Input
            placeholder="Rechercher…"
            aria-label="Rechercher une conversation"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            pl="calc(12px + 20px)"
            py="8px"
            size="sm"
            borderRadius="full"
            borderWidth="1.5px"
            borderColor="border.default"
            bg="bg.surface"
            fontSize="sm"
            _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 3px rgba(78,100,120,.1)' }}
          />
        </Box>
      </Box>

      {/* Liste */}
      <Stack gap={0} flex={1} overflowY="auto">
        {/* Label Général */}
        {filteredTeam && (
          <Box px={4} py={3} pb={1}>
            <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em">
              Général
            </Text>
          </Box>
        )}

        {/* Équipe */}
        {filteredTeam && (
          <ConvItem
            conv={filteredTeam}
            isSelected={selectedId === filteredTeam.id}
            onSelect={onSelect}
            label="Équipe"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          />
        )}

        {/* Label Conversations */}
        {filteredPrivates.length > 0 && (
          <Box px={4} py={3} pb={1}>
            <Text fontSize="xs" color="text.muted" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em">
              Conversations
            </Text>
          </Box>
        )}

        {/* Conversations privées */}
        {filteredPrivates.map((conv, idx) => (
          <ConvItem
            key={conv.id}
            conv={conv}
            isSelected={selectedId === conv.id}
            onSelect={onSelect}
            label={
              conv.otherParticipant
                ? `${conv.otherParticipant.firstName} ${conv.otherParticipant.lastName}`
                : 'Conversation'
            }
            avatarUrl={conv.otherParticipant?.avatarUrl}
            avatarBg={AVATAR_COLORS[idx % AVATAR_COLORS.length]}
          />
        ))}

        {/* État vide */}
        {filteredPrivates.length === 0 && !filteredTeam && search.trim() && (
          <Box px={4} py={6} textAlign="center">
            <Text fontSize="sm" color="text.muted">
              Aucun résultat
            </Text>
          </Box>
        )}

        {filteredPrivates.length === 0 && !search.trim() && (
          <Box px={4} py={3}>
            <Text fontSize="xs" color="text.muted">
              Aucune conversation privée
            </Text>
          </Box>
        )}
      </Stack>
    </Flex>
  )
}

// ---- Item individuel ----

interface ConvItemProps {
  conv: Conversation
  isSelected: boolean
  onSelect: (conv: Conversation) => void
  label: string
  icon?: React.ReactNode
  avatarUrl?: string
  avatarBg?: string
}

function ConvItem({ conv, isSelected, onSelect, label, icon, avatarUrl, avatarBg = 'brand.500' }: ConvItemProps) {
  const isUnread = conv.unreadCount > 0

  return (
    <Flex
      align="center"
      gap={3}
      px={3}
      py={3}
      cursor="pointer"
      bg={isSelected ? 'brand.50' : 'transparent'}
      borderWidth="2px"
      borderColor={isSelected ? 'brand.100' : 'transparent'}
      borderRadius="10px"
      mx="8px"
      w="calc(100% - 16px)"
      mb="2px"
      _hover={{ bg: 'brand.50' }}
      onClick={() => onSelect(conv)}
      transition="background 0.15s"
    >
      {/* Avatar ou icône — proto: conv-avatar 38px */}
      {icon ? (
        <Flex
          w="38px"
          h="38px"
          borderRadius="full"
          bg="brand.500"
          align="center"
          justify="center"
          color="white"
          flexShrink={0}
          fontSize="13px"
          fontWeight="800"
          fontFamily="heading"
        >
          {icon}
        </Flex>
      ) : (
        <Flex
          w="38px"
          h="38px"
          borderRadius="full"
          bg={avatarBg}
          color="white"
          align="center"
          justify="center"
          flexShrink={0}
          fontSize="13px"
          fontWeight="800"
          fontFamily="heading"
          overflow="hidden"
        >
          {avatarUrl ? (
            <Box as="img" src={avatarUrl} alt="" w="100%" h="100%" objectFit="cover" />
          ) : (
            <span>{label.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
          )}
        </Flex>
      )}

      {/* Texte — proto: conv-item-info > conv-item-header + conv-item-preview */}
      <Box flex={1} minW={0} overflow="hidden">
        <Flex justify="space-between" align="center" mb="3px">
          <Text
            fontSize="sm"
            fontWeight={700}
            color="text.default"
            truncate
          >
            {label}
          </Text>
          <Text fontSize="xs" color="text.muted" fontWeight="500" flexShrink={0} ml={2}>
            {formatConvTime(new Date(conv.updatedAt))}
          </Text>
        </Flex>
        {conv.lastMessage && (
          <Text
            fontSize="xs"
            color={isUnread ? 'text.default' : 'text.muted'}
            fontWeight={isUnread ? 600 : 400}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            display="block"
            maxW="180px"
          >
            {conv.lastMessage}
          </Text>
        )}
      </Box>

      {/* Badge non lus */}
      {isUnread && (
        <Flex
          as="span"
          bg="brand.500"
          color="white"
          borderRadius="full"
          fontSize="xs"
          fontWeight="800"
          w="20px"
          h="20px"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
          aria-label={`${conv.unreadCount} messages non lus`}
        >
          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
        </Flex>
      )}
    </Flex>
  )
}
