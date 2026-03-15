import { useState, useEffect } from 'react'
import {
  Box,
  Flex,
  Text,
  Textarea,
  Button,
  Field,
  NativeSelect,
} from '@chakra-ui/react'
import { Dialog } from '@chakra-ui/react'
import { AccessibleButton } from '@/components/ui'
import { getActiveAuxiliariesForEmployer } from '@/services/auxiliaryService'
import { getCaregiversForEmployer } from '@/services/caregiverTeamService'
import { getProfileById } from '@/services/profileService'
import type { AuxiliarySummary } from '@/services/auxiliaryService'
import type { CaregiverWithProfile } from '@/services/caregiverTeamService'

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  avatarUrl?: string
  role: 'employee' | 'caregiver' | 'employer'
}

export type NewMessageRecipient =
  | { type: 'team' }
  | { type: 'member'; memberId: string }

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  currentUserId: string
  /** ID de la conversation d'équipe (pour l'option "Toute l'équipe") */
  teamConversationId: string | null
  onSend: (recipient: NewMessageRecipient, content: string) => Promise<void>
}

export function NewConversationModal({
  isOpen,
  onClose,
  employerId,
  currentUserId,
  teamConversationId,
  onSend,
}: NewConversationModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recipient, setRecipient] = useState<string>('')
  const [content, setContent] = useState('')
  const [recipientError, setRecipientError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadMembers() {
      setIsLoading(true)
      try {
        const [auxiliaries, caregivers] = await Promise.all([
          getActiveAuxiliariesForEmployer(employerId),
          getCaregiversForEmployer(employerId),
        ])

        const employees: TeamMember[] = auxiliaries
          .filter((a: AuxiliarySummary) => a.id !== currentUserId)
          .map((a: AuxiliarySummary) => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            avatarUrl: a.avatarUrl,
            role: 'employee' as const,
          }))

        const cg: TeamMember[] = caregivers
          .filter((c: CaregiverWithProfile) => c.profileId !== currentUserId)
          .map((c: CaregiverWithProfile) => ({
            id: c.profileId,
            firstName: c.profile.firstName,
            lastName: c.profile.lastName,
            avatarUrl: c.profile.avatarUrl,
            role: 'caregiver' as const,
          }))

        const seen = new Set<string>()
        const all: TeamMember[] = []

        // Ajouter l'employeur en premier si l'utilisateur n'est pas l'employeur (ex. auxiliaire, aidant)
        if (employerId && employerId !== currentUserId) {
          const employerProfile = await getProfileById(employerId)
          if (employerProfile) {
            all.push({
              id: employerProfile.id,
              firstName: employerProfile.firstName,
              lastName: employerProfile.lastName,
              avatarUrl: employerProfile.avatarUrl,
              role: 'employer' as const,
            })
            seen.add(employerProfile.id)
          }
        }

        for (const m of [...employees, ...cg]) {
          if (!seen.has(m.id)) {
            seen.add(m.id)
            all.push(m)
          }
        }

        setMembers(all)
      } finally {
        setIsLoading(false)
      }
    }

    loadMembers()
    setRecipient('')
    setContent('')
    setRecipientError(null)
    setContentError(null)
  }, [isOpen, employerId, currentUserId])

  const handleSubmit = async () => {
    setRecipientError(null)
    setContentError(null)

    if (!recipient || recipient === '') {
      setRecipientError('Veuillez sélectionner un destinataire.')
      return
    }

    const trimmed = content.trim()
    if (!trimmed) {
      setContentError('Le message ne peut pas être vide.')
      return
    }

    if (recipient === 'team') {
      if (!teamConversationId) {
        setRecipientError('Conversation d\'équipe non disponible.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const rec: NewMessageRecipient =
        recipient === 'team'
          ? { type: 'team' }
          : { type: 'member', memberId: recipient }

      await onSend(rec, trimmed)
      onClose()
    } catch {
      setContentError('Erreur lors de l\'envoi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => { if (!e.open) onClose() }} size="sm">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Nouveau message</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <AccessibleButton
                variant="ghost"
                size="sm"
                position="absolute"
                right={3}
                top={3}
                w="32px"
                h="32px"
                minW="32px"
                minH="32px"
                borderRadius="md"
                _hover={{ bg: 'bg.page', color: 'text.default' }}
                accessibleLabel="Fermer"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={18} height={18} aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </AccessibleButton>
            </Dialog.CloseTrigger>
          </Dialog.Header>

          <Dialog.Body>
            <Flex direction="column" gap={4} as="form" onSubmit={(e) => { e.preventDefault(); handleSubmit() }} id="new-msg-form">
              {/* Destinataire(s) — prototype */}
              <Field.Root invalid={!!recipientError} required>
                <Field.Label htmlFor="msg-to" fontWeight="medium" fontSize="sm" color="text.default">
                  Destinataire(s) <span className="required" aria-label="obligatoire">*</span>
                </Field.Label>
                <NativeSelect.Root size="sm">
                  <NativeSelect.Field
                    id="msg-to"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value)
                      setRecipientError(null)
                    }}
                    disabled={isLoading}
                    bg="bg.page"
                    borderColor={recipientError ? 'danger.500' : 'border.default'}
                    borderRadius="lg"
                    css={{
                      minHeight: '40px',
                      '&:focus': { borderColor: 'brand.500', boxShadow: '0 0 0 2px rgba(78,100,120,.15)' },
                    }}
                  >
                    <option value="">Choisir…</option>
                    {teamConversationId && <option value="team">Toute l&apos;équipe</option>}
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
                {recipientError && (
                  <Field.ErrorText fontSize="xs" color="danger.600">{recipientError}</Field.ErrorText>
                )}
              </Field.Root>

              {/* Message — prototype */}
              <Field.Root invalid={!!contentError} required>
                <Field.Label htmlFor="msg-body" fontWeight="medium" fontSize="sm" color="text.default">
                  Message <span className="required" aria-label="obligatoire">*</span>
                </Field.Label>
                <Textarea
                  id="msg-body"
                  rows={4}
                  placeholder="Votre message…"
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setContentError(null)
                  }}
                  disabled={isSubmitting}
                  bg="bg.page"
                  borderColor={contentError ? 'danger.500' : 'border.default'}
                  borderRadius="lg"
                  resize="vertical"
                  maxH="200px"
                  _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 2px rgba(78,100,120,.15)' }}
                />
                {contentError && (
                  <Field.ErrorText fontSize="xs" color="danger.600">{contentError}</Field.ErrorText>
                )}
              </Field.Root>
            </Flex>
          </Dialog.Body>

          <Dialog.Footer
            p={4}
            pt={0}
            borderTopWidth="1px"
            borderColor="border.default"
            justifyContent="flex-end"
            gap={2}
          >
            <Button variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button
              size="sm"
              bg="brand.500"
              color="white"
              _hover={{ bg: 'brand.600' }}
              onClick={handleSubmit}
              isLoading={isSubmitting}
              type="submit"
              form="new-msg-form"
            >
              Envoyer
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}
