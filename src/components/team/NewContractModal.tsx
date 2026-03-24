import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Steps,
  Input,
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
    showInviteForm,
    isInviting,
    inviteSuccess,
    inviteError,
    inviteFirstName,
    setInviteFirstName,
    inviteLastName,
    setInviteLastName,
    searchedEmail,
    onInvite,
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
            bg="bg.surface"
            borderRadius="12px"
            maxW="500px"
            w="90vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px" borderColor="border.default">
              <Dialog.Title fontSize="lg" fontWeight={700} color="brand.500">
                Ajouter un auxiliaire
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer" color="brand.500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

              {/* Etape 1 : Recherche auxiliaire */}
              {step === 0 && (
                <Stack gap={4}>
                  <form onSubmit={searchForm.handleSubmit(onSearch)}>
                    <Stack gap={4}>
                      <Text color="text.muted">
                        Recherchez l'auxiliaire par son adresse email.
                      </Text>

                      <AccessibleInput
                        label="Email de l'auxiliaire"
                        type="email"
                        placeholder="auxiliaire@email.com"
                        error={searchForm.formState.errors.email?.message}
                        required
                        {...searchForm.register('email')}
                      />

                      {searchError && !showInviteForm && (
                        <Box p={4} bg="orange.50" borderRadius="10px">
                          <Text color="orange.700">{searchError}</Text>
                        </Box>
                      )}

                      <AccessibleButton
                        type="submit"
                        bg="brand.500"
                        color="white"
                        _hover={{ bg: 'brand.600' }}
                        loading={isSearching}
                        loadingText="Recherche..."
                      >
                        Rechercher
                      </AccessibleButton>
                    </Stack>
                  </form>

                  {/* Invitation form — shown when no account found */}
                  {showInviteForm && !inviteSuccess && (
                    <Box
                      p={5}
                      bg="brand.50"
                      borderRadius="12px"
                      borderWidth="1px"
                      borderColor="brand.200"
                    >
                      <Flex align="center" gap={2} mb={3}>
                        <Box color="brand.600" flexShrink={0}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                        </Box>
                        <Text fontWeight="semibold" color="brand.700">
                          Inviter par email
                        </Text>
                      </Flex>
                      <Text fontSize="sm" color="brand.700" mb={4}>
                        Aucun compte trouve pour <strong>{searchedEmail}</strong>.
                        Renseignez le nom de l'auxiliaire pour lui envoyer une invitation.
                        Il recevra un email pour creer son mot de passe.
                      </Text>

                      <Stack gap={3}>
                        <Flex gap={3}>
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Prenom *
                            </Text>
                            <Input
                              placeholder="Prenom"
                              aria-label="Prénom"
                              value={inviteFirstName}
                              onChange={(e) => setInviteFirstName(e.target.value)}
                              size="sm"
                              autoComplete="given-name"
                            />
                          </Box>
                          <Box flex={1}>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Nom *
                            </Text>
                            <Input
                              placeholder="Nom"
                              aria-label="Nom de famille"
                              value={inviteLastName}
                              onChange={(e) => setInviteLastName(e.target.value)}
                              size="sm"
                              autoComplete="family-name"
                            />
                          </Box>
                        </Flex>

                        {inviteError && (
                          <Box p={3} bg="red.50" borderRadius="10px">
                            <Text fontSize="sm" color="red.700">{inviteError}</Text>
                          </Box>
                        )}

                        <AccessibleButton
                          colorPalette="brand"
                          size="sm"
                          onClick={onInvite}
                          loading={isInviting}
                          loadingText="Envoi..."
                          disabled={!inviteFirstName.trim() || !inviteLastName.trim()}
                        >
                          Envoyer l'invitation
                        </AccessibleButton>
                      </Stack>
                    </Box>
                  )}

                  {/* Invitation success */}
                  {inviteSuccess && foundEmployee && (
                    <Box
                      p={5}
                      bg="green.50"
                      borderRadius="12px"
                      borderWidth="1px"
                      borderColor="green.200"
                    >
                      <Flex align="center" gap={2} mb={2}>
                        <Box color="green.600" flexShrink={0}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </Box>
                        <Text fontWeight="semibold" color="green.800">
                          Invitation envoyee
                        </Text>
                      </Flex>
                      <Text fontSize="sm" color="green.700" mb={3}>
                        Un email a ete envoye a <strong>{searchedEmail}</strong>.
                        {foundEmployee.firstName} {foundEmployee.lastName} pourra creer son mot de passe et acceder a Unilien.
                      </Text>
                      <Text fontSize="sm" color="green.700" mb={4}>
                        Vous pouvez maintenant creer le contrat.
                      </Text>
                      <AccessibleButton
                        colorPalette="green"
                        size="sm"
                        onClick={() => setStep(1)}
                      >
                        Configurer le contrat
                      </AccessibleButton>
                    </Box>
                  )}
                </Stack>
              )}

              {/* Etape 2 : Details du contrat */}
              {step === 1 && foundEmployee && (
                <form id="contract-form" onSubmit={contractForm.handleSubmit(onSubmitContract)}>
                  <Stack gap={4}>
                    <Box p={4} bg="green.50" borderRadius="10px">
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontWeight="semibold" color="green.700">
                            Auxiliaire {inviteSuccess ? 'invite' : 'trouve'}
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
                        { value: 'CDI', label: 'CDI - Contrat a duree indeterminee' },
                        { value: 'CDD', label: 'CDD - Contrat a duree determinee' },
                      ]}
                      error={contractForm.formState.errors.contractType?.message}
                      required
                      {...contractForm.register('contractType')}
                    />

                    <AccessibleInput
                      label="Date de debut"
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

                    <Box p={4} bg="bg.page" borderRadius="10px">
                      <Text fontWeight="medium" mb={2}>
                        Estimation mensuelle
                      </Text>
                      <Text color="text.secondary">
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
                      <Box p={4} bg="red.50" borderRadius="10px">
                        <Text color="red.700">{submitError}</Text>
                      </Box>
                    )}
                  </Stack>
                </form>
              )}
            </Dialog.Body>

            <Dialog.Footer p={6} borderTopWidth="1px" borderColor="border.default">
              <Flex gap={3} justify="flex-end">
                <AccessibleButton
                  variant="ghost"
                  color="brand.500"
                  onClick={handleClose}
                  disabled={isSearching || isSubmitting || isInviting}
                >
                  Annuler
                </AccessibleButton>

                {step === 1 && (
                  <AccessibleButton
                    type="submit"
                    form="contract-form"
                    bg="brand.500"
                    color="white"
                    _hover={{ bg: 'brand.600' }}
                    loading={isSubmitting}
                    loadingText="Creation..."
                  >
                    Creer le contrat
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
