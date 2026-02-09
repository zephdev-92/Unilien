import { useState, useEffect } from 'react'
import {
  Dialog,
  Portal,
  Box,
  Stack,
  Flex,
  Text,
  Avatar,
  Badge,
  Tag,
  Tabs,
  Separator,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AccessibleButton, AccessibleInput } from '@/components/ui'
import { logger } from '@/lib/logger'
import {
  getAuxiliaryDetails,
  updateContract,
  terminateContract,
  suspendContract,
  resumeContract,
  type AuxiliaryWithDetails,
} from '@/services/auxiliaryService'

interface AuxiliaryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  onUpdate: () => void
}

export function AuxiliaryDetailModal({
  isOpen,
  onClose,
  contractId,
  onUpdate,
}: AuxiliaryDetailModalProps) {
  const [details, setDetails] = useState<AuxiliaryWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTerminating, setIsTerminating] = useState(false)
  const [confirmTerminate, setConfirmTerminate] = useState(false)
  const [isSuspending, setIsSuspending] = useState(false)
  const [isResuming, setIsResuming] = useState(false)

  // Valeurs d'édition
  const [weeklyHours, setWeeklyHours] = useState(0)
  const [hourlyRate, setHourlyRate] = useState(0)

  useEffect(() => {
    if (isOpen && contractId) {
      setIsLoading(true)
      getAuxiliaryDetails(contractId)
        .then((data) => {
          setDetails(data)
          if (data) {
            setWeeklyHours(data.contract.weeklyHours)
            setHourlyRate(data.contract.hourlyRate)
          }
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, contractId])

  const handleSave = async () => {
    if (!details) return

    setIsSaving(true)
    try {
      await updateContract(contractId, {
        weeklyHours,
        hourlyRate,
      })
      // Recharger les données
      const updated = await getAuxiliaryDetails(contractId)
      setDetails(updated)
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      logger.error('Erreur mise à jour:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTerminate = async () => {
    setIsTerminating(true)
    try {
      await terminateContract(contractId)
      onUpdate()
      onClose()
    } catch (error) {
      logger.error('Erreur résiliation:', error)
    } finally {
      setIsTerminating(false)
    }
  }

  const handleSuspend = async () => {
    setIsSuspending(true)
    try {
      await suspendContract(contractId)
      const updated = await getAuxiliaryDetails(contractId)
      setDetails(updated)
      onUpdate()
    } catch (error) {
      logger.error('Erreur suspension:', error)
    } finally {
      setIsSuspending(false)
    }
  }

  const handleResume = async () => {
    setIsResuming(true)
    try {
      await resumeContract(contractId)
      const updated = await getAuxiliaryDetails(contractId)
      setDetails(updated)
      onUpdate()
    } catch (error) {
      logger.error('Erreur réactivation:', error)
    } finally {
      setIsResuming(false)
    }
  }

  const isActive = details?.contract.status === 'active'
  const isSuspended = details?.contract.status === 'suspended'

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="white"
            borderRadius="xl"
            maxW="600px"
            w="95vw"
            maxH="90vh"
            overflow="auto"
          >
            <Dialog.Header p={6} borderBottomWidth="1px">
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Détails de l'auxiliaire
              </Dialog.Title>
              <Dialog.CloseTrigger position="absolute" top={4} right={4} asChild>
                <AccessibleButton variant="ghost" size="sm" accessibleLabel="Fermer">
                  X
                </AccessibleButton>
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body p={0}>
              {isLoading ? (
                <Center py={12}>
                  <Spinner size="xl" color="brand.500" />
                </Center>
              ) : !details ? (
                <Center py={12}>
                  <Text color="gray.500">Impossible de charger les détails</Text>
                </Center>
              ) : (
                <>
                  {/* En-tête profil */}
                  <Box p={6} bg="gray.50">
                    <Flex gap={4} align="center">
                      <Avatar.Root size="xl">
                        <Avatar.Fallback
                          name={`${details.profile.firstName} ${details.profile.lastName}`}
                        />
                        {details.profile.avatarUrl && (
                          <Avatar.Image src={details.profile.avatarUrl} />
                        )}
                      </Avatar.Root>

                      <Box flex={1}>
                        <Flex align="center" gap={2} mb={1}>
                          <Text fontSize="xl" fontWeight="bold">
                            {details.profile.firstName} {details.profile.lastName}
                          </Text>
                          <Badge colorPalette={isActive ? 'green' : isSuspended ? 'orange' : 'gray'}>
                            {isActive ? 'Actif' : isSuspended ? 'Suspendu' : 'Inactif'}
                          </Badge>
                        </Flex>

                        <Flex gap={4} flexWrap="wrap" color="gray.600" fontSize="sm">
                          {details.profile.phone && (
                            <Text>{details.profile.phone}</Text>
                          )}
                          <Text>{details.profile.email}</Text>
                        </Flex>

                        <Flex gap={2} mt={2}>
                          <Tag.Root colorPalette="blue" size="sm">
                            <Tag.Label>{details.contract.contractType}</Tag.Label>
                          </Tag.Root>
                          <Tag.Root size="sm">
                            <Tag.Label>{details.contract.weeklyHours}h/sem</Tag.Label>
                          </Tag.Root>
                          <Tag.Root size="sm">
                            <Tag.Label>{details.contract.hourlyRate}€/h</Tag.Label>
                          </Tag.Root>
                        </Flex>
                      </Box>
                    </Flex>

                    {/* Statistiques */}
                    <Flex gap={6} mt={4} pt={4} borderTopWidth="1px" borderColor="gray.200">
                      <StatItem label="Total interventions" value={details.stats.totalShifts} />
                      <StatItem label="À venir" value={details.stats.upcomingShifts} />
                      <StatItem
                        label="Heures ce mois"
                        value={`${details.stats.hoursThisMonth}h`}
                      />
                    </Flex>
                  </Box>

                  {/* Onglets */}
                  <Tabs.Root
                    value={activeTab}
                    onValueChange={(e) => setActiveTab(e.value)}
                  >
                    <Tabs.List px={6} borderBottomWidth="1px">
                      <Tabs.Trigger value="info" py={4}>
                        Informations
                      </Tabs.Trigger>
                      <Tabs.Trigger value="contract" py={4}>
                        Contrat
                      </Tabs.Trigger>
                      <Tabs.Trigger value="qualifications" py={4}>
                        Compétences
                      </Tabs.Trigger>
                    </Tabs.List>

                    <Box p={6}>
                      {/* Onglet Informations */}
                      <Tabs.Content value="info">
                        <Stack gap={4}>
                          <InfoRow
                            label="Langues parlées"
                            value={
                              details.employee.languages.length > 0
                                ? details.employee.languages.join(', ')
                                : 'Non renseigné'
                            }
                          />
                          <InfoRow
                            label="Distance max."
                            value={
                              details.employee.maxDistanceKm
                                ? `${details.employee.maxDistanceKm} km`
                                : 'Non renseigné'
                            }
                          />
                          <InfoRow
                            label="Date de début"
                            value={format(details.contract.startDate, 'dd MMMM yyyy', {
                              locale: fr,
                            })}
                          />
                          {details.contract.endDate && (
                            <InfoRow
                              label="Date de fin"
                              value={format(details.contract.endDate, 'dd MMMM yyyy', {
                                locale: fr,
                              })}
                            />
                          )}
                        </Stack>
                      </Tabs.Content>

                      {/* Onglet Contrat */}
                      <Tabs.Content value="contract">
                        <Stack gap={4}>
                          {isEditing ? (
                            <>
                              <AccessibleInput
                                label="Heures/semaine"
                                type="number"
                                value={weeklyHours}
                                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                              />
                              <AccessibleInput
                                label="Taux horaire (€)"
                                type="number"
                                step="0.01"
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(Number(e.target.value))}
                              />

                              <Flex gap={3}>
                                <AccessibleButton
                                  flex={1}
                                  variant="outline"
                                  onClick={() => {
                                    setIsEditing(false)
                                    setWeeklyHours(details.contract.weeklyHours)
                                    setHourlyRate(details.contract.hourlyRate)
                                  }}
                                  disabled={isSaving}
                                >
                                  Annuler
                                </AccessibleButton>
                                <AccessibleButton
                                  flex={1}
                                  colorPalette="blue"
                                  onClick={handleSave}
                                  loading={isSaving}
                                >
                                  Enregistrer
                                </AccessibleButton>
                              </Flex>
                            </>
                          ) : (
                            <>
                              <InfoRow
                                label="Type de contrat"
                                value={details.contract.contractType}
                              />
                              <InfoRow
                                label="Heures hebdomadaires"
                                value={`${details.contract.weeklyHours}h`}
                              />
                              <InfoRow
                                label="Taux horaire"
                                value={`${details.contract.hourlyRate}€`}
                              />
                              <InfoRow
                                label="Salaire mensuel estimé"
                                value={`${(
                                  details.contract.weeklyHours *
                                  4.33 *
                                  details.contract.hourlyRate
                                ).toFixed(2)}€ brut`}
                              />

                              {isActive && (
                                <AccessibleButton
                                  variant="outline"
                                  onClick={() => setIsEditing(true)}
                                >
                                  Modifier le contrat
                                </AccessibleButton>
                              )}
                            </>
                          )}
                        </Stack>
                      </Tabs.Content>

                      {/* Onglet Compétences */}
                      <Tabs.Content value="qualifications">
                        <Stack gap={4}>
                          <Text fontWeight="medium">Qualifications</Text>
                          {details.employee.qualifications.length > 0 ? (
                            <Flex gap={2} flexWrap="wrap">
                              {details.employee.qualifications.map((qual) => (
                                <Tag.Root key={qual} colorPalette="blue">
                                  <Tag.Label>{qual}</Tag.Label>
                                </Tag.Root>
                              ))}
                            </Flex>
                          ) : (
                            <Text color="gray.500">Aucune qualification renseignée</Text>
                          )}

                          <Separator />

                          <Text fontWeight="medium">Langues</Text>
                          {details.employee.languages.length > 0 ? (
                            <Flex gap={2} flexWrap="wrap">
                              {details.employee.languages.map((lang) => (
                                <Tag.Root key={lang} colorPalette="green">
                                  <Tag.Label>{lang}</Tag.Label>
                                </Tag.Root>
                              ))}
                            </Flex>
                          ) : (
                            <Text color="gray.500">Aucune langue renseignée</Text>
                          )}
                        </Stack>
                      </Tabs.Content>
                    </Box>
                  </Tabs.Root>
                </>
              )}
            </Dialog.Body>

            {/* Footer avec actions */}
            {details && (isActive || isSuspended) && (
              <Dialog.Footer p={6} borderTopWidth="1px">
                {confirmTerminate ? (
                  <Stack gap={3} w="full">
                    <Box p={4} bg="red.50" borderRadius="md">
                      <Text color="red.700" fontWeight="medium">
                        Êtes-vous sûr de vouloir mettre fin à ce contrat ?
                      </Text>
                      <Text color="red.600" fontSize="sm" mt={1}>
                        Cette action marquera le contrat comme terminé à la date
                        d'aujourd'hui.
                      </Text>
                    </Box>
                    <Flex gap={3}>
                      <AccessibleButton
                        flex={1}
                        variant="outline"
                        onClick={() => setConfirmTerminate(false)}
                        disabled={isTerminating}
                      >
                        Annuler
                      </AccessibleButton>
                      <AccessibleButton
                        flex={1}
                        colorPalette="red"
                        onClick={handleTerminate}
                        loading={isTerminating}
                      >
                        Confirmer la fin du contrat
                      </AccessibleButton>
                    </Flex>
                  </Stack>
                ) : (
                  <Flex gap={3} justify="space-between" w="full" flexWrap="wrap">
                    <Flex gap={2}>
                      <AccessibleButton
                        variant="outline"
                        colorPalette="red"
                        onClick={() => setConfirmTerminate(true)}
                      >
                        Mettre fin au contrat
                      </AccessibleButton>
                      {isActive && (
                        <AccessibleButton
                          variant="outline"
                          colorPalette="orange"
                          onClick={handleSuspend}
                          loading={isSuspending}
                        >
                          Suspendre
                        </AccessibleButton>
                      )}
                      {isSuspended && (
                        <AccessibleButton
                          variant="outline"
                          colorPalette="green"
                          onClick={handleResume}
                          loading={isResuming}
                        >
                          Réactiver
                        </AccessibleButton>
                      )}
                    </Flex>
                    <AccessibleButton
                      colorPalette="blue"
                      onClick={onClose}
                    >
                      Fermer
                    </AccessibleButton>
                  </Flex>
                )}
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

// Composant statistique
function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <Box textAlign="center">
      <Text fontSize="2xl" fontWeight="bold" color="brand.600">
        {value}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
    </Box>
  )
}

// Composant ligne d'info
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" align="center" py={2}>
      <Text color="gray.600">{label}</Text>
      <Text fontWeight="medium">{value}</Text>
    </Flex>
  )
}

export default AuxiliaryDetailModal
