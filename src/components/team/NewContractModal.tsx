import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Steps,
} from '@chakra-ui/react'
import { format, addMonths } from 'date-fns'
import { AccessibleInput, AccessibleSelect, AccessibleButton } from '@/components/ui'
import { useNewContractForm } from '@/hooks/useNewContractForm'
import { ContractLeaveHistorySection } from './ContractLeaveHistorySection'

interface NewContractModalProps {
  isOpen: boolean
  onClose: () => void
  employerId: string
  onSuccess: () => void
}

export function NewContractModal({
  isOpen,
  onClose,
  employerId,
  onSuccess,
}: NewContractModalProps) {
  const {
    step,
    setStep,
    foundEmployee,
    setFoundEmployee,
    isSearching,
    isSubmitting,
    searchError,
    submitError,
    searchForm,
    contractForm,
    watchContractType,
    isRetroactive,
    leaveYearInfo,
    suggestedMonths,
    leavePreview,
    monthlyEstimate,
    reset,
    onSearch,
    onSubmitContract,
  } = useNewContractForm({ employerId, onSuccess })

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Ajouter un auxiliaire
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  X
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={6}>
              <Steps.Root step={step} count={2} mb={6}>
                <Steps.List>
                  <Steps.Item index={0}>
                    <Steps.Trigger>
                      <Steps.Indicator />
                      <Steps.Title>Rechercher</Steps.Title>
                    </Steps.Trigger>
                    <Steps.Separator />
                  </Steps.Item>
                  <Steps.Item index={1}>
                    <Steps.Trigger>
                      <Steps.Indicator />
                      <Steps.Title>Contrat</Steps.Title>
                    </Steps.Trigger>
                  </Steps.Item>
                </Steps.List>
              </Steps.Root>

              {/* Étape 1 : Recherche auxiliaire */}
              {step === 0 && (
                <form onSubmit={searchForm.handleSubmit(onSearch)}>
                  <Stack gap={4}>
                    <Text color="gray.600">
                      Recherchez l'auxiliaire par son adresse email. Il doit avoir un compte
                      Unilien avec le rôle "Auxiliaire de vie".
                    </Text>

                    <AccessibleInput
                      label="Email de l'auxiliaire"
                      type="email"
                      placeholder="auxiliaire@email.com"
                      error={searchForm.formState.errors.email?.message}
                      required
                      {...searchForm.register('email')}
                    />

                    {searchError && (
                      <Box p={4} bg="orange.50" borderRadius="md">
                        <Text color="orange.700">{searchError}</Text>
                      </Box>
                    )}

                    <AccessibleButton
                      type="submit"
                      colorPalette="blue"
                      loading={isSearching}
                      loadingText="Recherche..."
                    >
                      Rechercher
                    </AccessibleButton>
                  </Stack>
                </form>
              )}

              {/* Étape 2 : Détails du contrat */}
              {step === 1 && foundEmployee && (
                <form id="contract-form" onSubmit={contractForm.handleSubmit(onSubmitContract)}>
                  <Stack gap={4}>
                    <Box p={4} bg="green.50" borderRadius="md">
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontWeight="semibold" color="green.700">
                            Auxiliaire trouvé
                          </Text>
                          <Text fontSize="lg" color="green.800">
                            {foundEmployee.firstName} {foundEmployee.lastName}
                          </Text>
                        </Box>
                        <AccessibleButton
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setStep(0)
                            setFoundEmployee(null)
                          }}
                        >
                          Modifier
                        </AccessibleButton>
                      </Flex>
                    </Box>

                    <AccessibleSelect
                      label="Type de contrat"
                      options={[
                        { value: 'CDI', label: 'CDI - Contrat à durée indéterminée' },
                        { value: 'CDD', label: 'CDD - Contrat à durée déterminée' },
                      ]}
                      error={contractForm.formState.errors.contractType?.message}
                      required
                      {...contractForm.register('contractType')}
                    />

                    <AccessibleInput
                      label="Date de début"
                      type="date"
                      error={contractForm.formState.errors.startDate?.message}
                      required
                      {...contractForm.register('startDate')}
                    />

                    {watchContractType === 'CDD' && (
                      <AccessibleInput
                        label="Date de fin"
                        type="date"
                        helperText="Obligatoire pour un CDD"
                        error={contractForm.formState.errors.endDate?.message}
                        required
                        defaultValue={format(addMonths(new Date(), 6), 'yyyy-MM-dd')}
                        {...contractForm.register('endDate')}
                      />
                    )}

                    <Flex gap={4}>
                      <Box flex={1}>
                        <AccessibleInput
                          label="Heures/semaine"
                          type="number"
                          helperText="Heures contractuelles"
                          error={contractForm.formState.errors.weeklyHours?.message}
                          required
                          {...contractForm.register('weeklyHours')}
                        />
                      </Box>
                      <Box flex={1}>
                        <AccessibleInput
                          label="Taux horaire brut (€)"
                          type="number"
                          step="0.01"
                          helperText="Minimum SMIC brut: 11,65€"
                          error={contractForm.formState.errors.hourlyRate?.message}
                          required
                          {...contractForm.register('hourlyRate')}
                        />
                      </Box>
                    </Flex>

                    <Box p={4} bg="gray.50" borderRadius="md">
                      <Text fontWeight="medium" mb={2}>
                        Estimation mensuelle
                      </Text>
                      <Text color="gray.700">
                        {contractForm.watch('weeklyHours') || 0}h × 4,33 semaines ×{' '}
                        {contractForm.watch('hourlyRate') || 0}€ ={' '}
                        <Text as="span" fontWeight="bold">
                          {monthlyEstimate}€ brut/mois
                        </Text>
                      </Text>
                    </Box>

                    {isRetroactive && (
                      <ContractLeaveHistorySection
                        leaveYearInfo={leaveYearInfo}
                        suggestedMonths={suggestedMonths}
                        leavePreview={leavePreview}
                        register={contractForm.register}
                        errors={contractForm.formState.errors}
                      />
                    )}

                    {submitError && (
                      <Box p={4} bg="red.50" borderRadius="md">
                        <Text color="red.700">{submitError}</Text>
                      </Box>
                    )}
                  </Stack>
                </form>
              )}
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSearching || isSubmitting}
                >
                  Annuler
                </AccessibleButton>

                {step === 1 && (
                  <AccessibleButton
                    type="submit"
                    form="contract-form"
                    colorPalette="blue"
                    loading={isSubmitting}
                    loadingText="Création..."
                  >
                    Créer le contrat
                  </AccessibleButton>
                )}
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

export default NewContractModal
