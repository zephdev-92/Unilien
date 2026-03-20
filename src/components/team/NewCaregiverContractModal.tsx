import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
} from '@chakra-ui/react'
import { AccessibleInput, AccessibleSelect, AccessibleButton, GhostButton, PrimaryButton } from '@/components/ui'
import { useNewCaregiverContractForm } from '@/hooks/useNewCaregiverContractForm'
import { PCH_RATES } from '@/types'
import type { CaregiverWithProfile } from '@/services/caregiverService'

interface NewCaregiverContractModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  caregivers: CaregiverWithProfile[]
  defaultCaregiverId?: string
  onSuccess: () => void
}

export function NewCaregiverContractModal({
  isOpen,
  onClose,
  employerId,
  caregivers,
  defaultCaregiverId,
  onSuccess,
}: NewCaregiverContractModalProps) {
  const {
    form,
    isSubmitting,
    submitError,
    caregiverOptions,
    isVoluntary,
    statusRate,
    monthlyEstimate,
    reset,
    onSubmit,
  } = useNewCaregiverContractForm({ employerId, caregivers, defaultCaregiverId, onSuccess })

  const handleClose = () => {
    reset()
    onClose()
  }

  // Sync taux quand le statut change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as 'active' | 'full_time' | 'voluntary'
    form.setValue('caregiverStatus', status)
    if (status === 'voluntary') {
      form.setValue('pchHourlyRate', 0)
    } else {
      form.setValue('pchHourlyRate', status === 'full_time' ? PCH_RATES.full_time : PCH_RATES.active)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.surface"
            borderRadius="12px"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
              <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">
                Contrat aidant
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer" color="brand.500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <form id="caregiver-contract-form" onSubmit={form.handleSubmit(onSubmit)}>
                <Stack gap={4}>
                  <AccessibleSelect
                    label="Aidant familial"
                    options={caregiverOptions}
                    placeholder="Sélectionnez un aidant"
                    error={form.formState.errors.caregiverId?.message}
                    required
                    {...form.register('caregiverId')}
                  />

                  <AccessibleInput
                    label="Date de début"
                    type="date"
                    error={form.formState.errors.startDate?.message}
                    required
                    {...form.register('startDate')}
                  />

                  <AccessibleInput
                    label="Date de fin (optionnel)"
                    type="date"
                    error={form.formState.errors.endDate?.message}
                    {...form.register('endDate')}
                  />

                  <AccessibleSelect
                    label="Type de dédommagement"
                    options={[
                      { value: 'active', label: `PCH — Maintient une activité pro (${PCH_RATES.active}€/h)` },
                      { value: 'full_time', label: `PCH — A cessé son activité pro (${PCH_RATES.full_time}€/h)` },
                      { value: 'voluntary', label: 'Bénévole — Sans dédommagement' },
                    ]}
                    error={form.formState.errors.caregiverStatus?.message}
                    required
                    {...form.register('caregiverStatus', {
                      onChange: handleStatusChange,
                    })}
                  />

                  {/* Info contextuelle */}
                  {isVoluntary ? (
                    <Box p={4} bg="orange.50" borderRadius="10px">
                      <Text fontSize="sm" color="orange.700">
                        L'aidant intervient bénévolement. Aucun dédommagement ne sera calculé.
                        Les interventions seront tout de même planifiées et suivies.
                      </Text>
                    </Box>
                  ) : (
                    <Box p={4} bg="blue.50" borderRadius="10px">
                      <Text fontSize="sm" color="blue.700">
                        Le dédommagement aidant PCH est fixé par la CNSA.
                        L'aidant n'est pas salarié mais est indemnisé via la PCH.
                      </Text>
                    </Box>
                  )}

                  <Box flex={1}>
                    <AccessibleInput
                      label="Heures/semaine"
                      type="number"
                      helperText={isVoluntary ? 'Heures d\'intervention prévues' : 'Heures prévues au plan PCH'}
                      error={form.formState.errors.weeklyHours?.message}
                      required
                      {...form.register('weeklyHours')}
                    />
                  </Box>

                  {!isVoluntary && (
                    <>
                      <AccessibleInput
                        label="Taux horaire PCH (€)"
                        type="number"
                        step="0.01"
                        helperText={`Taux CNSA : ${statusRate}€/h`}
                        error={form.formState.errors.pchHourlyRate?.message}
                        required
                        {...form.register('pchHourlyRate')}
                      />

                      <Box p={4} bg="bg.page" borderRadius="10px">
                        <Text fontWeight="medium" mb={2}>
                          Estimation mensuelle
                        </Text>
                        <Text color="text.secondary">
                          {form.watch('weeklyHours') || 0}h × 4,33 semaines ×{' '}
                          {form.watch('pchHourlyRate') || 0}€ ={' '}
                          <Text as="span" fontWeight="bold">
                            {monthlyEstimate}€/mois
                          </Text>
                        </Text>
                      </Box>
                    </>
                  )}

                  {submitError && (
                    <Box p={4} bg="red.50" borderRadius="10px">
                      <Text color="red.700">{submitError}</Text>
                    </Box>
                  )}
                </Stack>
              </form>
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
              <Flex gap={3} justify="flex-end">
                <GhostButton
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </GhostButton>

                <PrimaryButton
                  type="submit"
                  form="caregiver-contract-form"
                  loading={isSubmitting}
                  loadingText="Création..."
                >
                  Créer le contrat
                </PrimaryButton>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NewCaregiverContractModal
