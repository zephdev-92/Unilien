/**
 * Page Documents - Export des déclarations CESU/PAJEMPLOI
 */

import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  Button,
  Badge,
  Spinner,
  Center,
  Alert,
  Separator,
  Grid,
} from '@chakra-ui/react'
import { DashboardLayout } from '@/components/dashboard'
import { useAuth } from '@/hooks/useAuth'
import {
  getMonthlyDeclarationData,
  generateCesuCsv,
  generateCesuSummary,
  generatePajemploiCsv,
  generatePajemploiSummary,
  downloadExport,
  MONTHS_FR,
  type DeclarationType,
  type ExportFormat,
  type MonthlyDeclarationData,
} from '@/lib/export'
import { getCaregiver } from '@/services/caregiverService'
import type { Caregiver } from '@/types'

export function DocumentsPage() {
  const { profile, isLoading: authLoading } = useAuth()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [declarationType, setDeclarationType] = useState<DeclarationType>('cesu')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<MonthlyDeclarationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null)
  const [isLoadingCaregiver, setIsLoadingCaregiver] = useState(false)

  // Charger les données de l'aidant si nécessaire
  useEffect(() => {
    if (profile?.role === 'caregiver') {
      setIsLoadingCaregiver(true)
      getCaregiver(profile.id)
        .then(setCaregiver)
        .finally(() => setIsLoadingCaregiver(false))
    }
  }, [profile?.id, profile?.role])

  // ID de l'employeur pour les exports
  const effectiveEmployerId = profile?.role === 'employer'
    ? profile.id
    : caregiver?.employerId

  // Vérifier si l'utilisateur peut exporter
  const canExport = profile?.role === 'employer' ||
    (profile?.role === 'caregiver' && caregiver?.permissions?.canExportData)

  if (authLoading || isLoadingCaregiver) {
    return (
      <DashboardLayout>
        <Center py={12}>
          <Spinner size="xl" color="brand.500" />
        </Center>
      </DashboardLayout>
    )
  }

  // Employeurs ou aidants avec canExportData peuvent accéder
  if (!profile || !canExport) {
    return <Navigate to="/dashboard" replace />
  }

  // Générer les années disponibles (année actuelle et 2 précédentes)
  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  // Mois - première ligne (Jan-Juin)
  const monthsFirstRow = MONTHS_FR.slice(0, 6)
  // Mois - deuxième ligne (Jul-Déc)
  const monthsSecondRow = MONTHS_FR.slice(6, 12)

  // Générer l'aperçu des données
  const handleGeneratePreview = async () => {
    if (!effectiveEmployerId) {
      setError('Impossible de déterminer l\'employeur')
      return
    }

    setIsGenerating(true)
    setError(null)
    setPreviewData(null)

    try {
      const data = await getMonthlyDeclarationData(effectiveEmployerId, {
        declarationType,
        format: 'summary',
        year: selectedYear,
        month: selectedMonth,
      })

      if (!data) {
        setError('Aucune donnée disponible pour cette période')
        return
      }

      if (data.employees.length === 0) {
        setError('Aucune intervention enregistrée pour cette période')
        return
      }

      setPreviewData(data)
    } catch (err) {
      setError('Erreur lors de la génération des données')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Télécharger le fichier
  const handleDownload = (format: ExportFormat) => {
    if (!previewData) return

    let result
    if (declarationType === 'cesu') {
      result = format === 'csv' ? generateCesuCsv(previewData) : generateCesuSummary(previewData)
    } else {
      result = format === 'csv' ? generatePajemploiCsv(previewData) : generatePajemploiSummary(previewData)
    }

    if (result.success) {
      downloadExport(result)
    } else {
      setError(result.error || 'Erreur lors du téléchargement')
    }
  }

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack gap={6} align="stretch">
          {/* En-tête */}
          <Box>
            <Heading size="xl" mb={2}>
              Documents et Déclarations
            </Heading>
            <Text color="gray.600">
              Générez les fichiers pour vos déclarations CESU ou PAJEMPLOI
            </Text>
          </Box>

          {/* Sélection du type et de la période */}
          <Card.Root>
            <Card.Body>
              <VStack gap={6} align="stretch">
                {/* Type de déclaration */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    Type de déclaration
                  </Text>
                  <HStack gap={4}>
                    <Button
                      variant={declarationType === 'cesu' ? 'solid' : 'outline'}
                      colorPalette={declarationType === 'cesu' ? 'brand' : 'gray'}
                      onClick={() => setDeclarationType('cesu')}
                      size="lg"
                      flex={1}
                    >
                      <VStack gap={1}>
                        <Text fontWeight="bold">CESU</Text>
                        <Text fontSize="xs" color={declarationType === 'cesu' ? 'white' : 'gray.500'}>
                          Chèque Emploi Service Universel
                        </Text>
                      </VStack>
                    </Button>
                    <Button
                      variant={declarationType === 'pajemploi' ? 'solid' : 'outline'}
                      colorPalette={declarationType === 'pajemploi' ? 'brand' : 'gray'}
                      onClick={() => setDeclarationType('pajemploi')}
                      size="lg"
                      flex={1}
                    >
                      <VStack gap={1}>
                        <Text fontWeight="bold">PAJEMPLOI</Text>
                        <Text fontSize="xs" color={declarationType === 'pajemploi' ? 'white' : 'gray.500'}>
                          Garde d'enfants à domicile
                        </Text>
                      </VStack>
                    </Button>
                  </HStack>
                </Box>

                <Separator />

                {/* Période */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    Période à déclarer
                  </Text>
                  <HStack gap={4}>
                    {/* Mois */}
                    <Box flex={2}>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Mois
                      </Text>
                      <HStack gap={2} flexWrap="wrap">
                        {monthsFirstRow.map((month, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant={selectedMonth === index + 1 ? 'solid' : 'ghost'}
                            colorPalette={selectedMonth === index + 1 ? 'brand' : 'gray'}
                            onClick={() => setSelectedMonth(index + 1)}
                          >
                            {month.slice(0, 3)}
                          </Button>
                        ))}
                      </HStack>
                      <HStack gap={2} flexWrap="wrap" mt={2}>
                        {monthsSecondRow.map((month, index) => (
                          <Button
                            key={index + 6}
                            size="sm"
                            variant={selectedMonth === index + 7 ? 'solid' : 'ghost'}
                            colorPalette={selectedMonth === index + 7 ? 'brand' : 'gray'}
                            onClick={() => setSelectedMonth(index + 7)}
                          >
                            {month.slice(0, 3)}
                          </Button>
                        ))}
                      </HStack>
                    </Box>

                    {/* Année */}
                    <Box flex={1}>
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        Année
                      </Text>
                      <VStack gap={2}>
                        {years.map((year) => (
                          <Button
                            key={year}
                            size="sm"
                            variant={selectedYear === year ? 'solid' : 'ghost'}
                            colorPalette={selectedYear === year ? 'brand' : 'gray'}
                            onClick={() => setSelectedYear(year)}
                            width="100%"
                          >
                            {year}
                          </Button>
                        ))}
                      </VStack>
                    </Box>
                  </HStack>
                </Box>

                <Separator />

                {/* Bouton de génération */}
                <Button
                  colorPalette="brand"
                  size="lg"
                  onClick={handleGeneratePreview}
                  loading={isGenerating}
                  loadingText="Génération en cours..."
                >
                  Générer l'aperçu pour {MONTHS_FR[selectedMonth - 1]} {selectedYear}
                </Button>
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Message d'erreur */}
          {error && (
            <Alert.Root status="warning">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}

          {/* Aperçu et téléchargement */}
          {previewData && (
            <Card.Root>
              <Card.Header>
                <HStack justify="space-between">
                  <Box>
                    <Card.Title>
                      Récapitulatif {declarationType.toUpperCase()} - {previewData.periodLabel}
                    </Card.Title>
                    <Card.Description>
                      {previewData.totalEmployees} employé{previewData.totalEmployees > 1 ? 's' : ''} •{' '}
                      {previewData.totalHours.toFixed(2).replace('.', ',')} heures
                    </Card.Description>
                  </Box>
                  <Badge colorPalette="green" size="lg">
                    Prêt à exporter
                  </Badge>
                </HStack>
              </Card.Header>

              <Card.Body>
                <VStack gap={6} align="stretch">
                  {/* Résumé employeur */}
                  <Box p={4} bg="gray.50" borderRadius="md">
                    <Text fontWeight="semibold" mb={2}>
                      Employeur
                    </Text>
                    <Text>
                      {previewData.employerFirstName} {previewData.employerLastName}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {previewData.employerAddress}
                    </Text>
                    {previewData.cesuNumber && (
                      <Text fontSize="sm" color="gray.600">
                        N° CESU: {previewData.cesuNumber}
                      </Text>
                    )}
                  </Box>

                  {/* Tableau des employés */}
                  <Box>
                    <Text fontWeight="semibold" mb={3}>
                      Détail par employé
                    </Text>
                    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                      {previewData.employees.map((employee) => {
                        const totalMajorations = employee.sundayMajoration + employee.holidayMajoration +
                          employee.nightMajoration + employee.overtimeMajoration

                        return (
                          <Card.Root key={employee.employeeId} variant="outline">
                            <Card.Body p={4}>
                              <HStack justify="space-between" mb={3}>
                                <Text fontWeight="semibold">
                                  {employee.firstName} {employee.lastName}
                                </Text>
                                <Badge>{employee.contractType}</Badge>
                              </HStack>

                              <Grid templateColumns="1fr 1fr" gap={2} fontSize="sm">
                                <Text color="gray.600">Heures totales:</Text>
                                <Text fontWeight="medium" textAlign="right">
                                  {employee.totalHours.toFixed(2).replace('.', ',')} h
                                </Text>

                                <Text color="gray.600">Interventions:</Text>
                                <Text fontWeight="medium" textAlign="right">
                                  {employee.shiftsCount}
                                </Text>

                                <Text color="gray.600">Salaire de base:</Text>
                                <Text fontWeight="medium" textAlign="right">
                                  {employee.basePay.toFixed(2).replace('.', ',')} €
                                </Text>

                                {totalMajorations > 0 && (
                                  <>
                                    <Text color="gray.600">Majorations:</Text>
                                    <Text fontWeight="medium" textAlign="right">
                                      {totalMajorations.toFixed(2).replace('.', ',')} €
                                    </Text>
                                  </>
                                )}

                                <Separator gridColumn="span 2" my={1} />

                                <Text fontWeight="semibold">Total brut:</Text>
                                <Text fontWeight="bold" textAlign="right" color="brand.600">
                                  {employee.totalGrossPay.toFixed(2).replace('.', ',')} €
                                </Text>
                              </Grid>
                            </Card.Body>
                          </Card.Root>
                        )
                      })}
                    </Grid>
                  </Box>

                  {/* Total général */}
                  <Box p={4} bg="brand.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Box>
                        <Text fontWeight="semibold">Total général</Text>
                        <Text fontSize="sm" color="gray.600">
                          {previewData.totalHours.toFixed(2).replace('.', ',')} heures travaillées
                        </Text>
                      </Box>
                      <Text fontSize="2xl" fontWeight="bold" color="brand.600">
                        {previewData.totalGrossPay.toFixed(2).replace('.', ',')} €
                      </Text>
                    </HStack>
                  </Box>

                  <Separator />

                  {/* Boutons de téléchargement */}
                  <Box>
                    <Text fontWeight="semibold" mb={3}>
                      Télécharger
                    </Text>
                    <HStack gap={4}>
                      <Button
                        colorPalette="brand"
                        size="lg"
                        flex={1}
                        onClick={() => handleDownload('csv')}
                      >
                        Fichier CSV
                        <Text fontSize="xs" ml={2} opacity={0.8}>
                          (pour tableur)
                        </Text>
                      </Button>
                      <Button
                        variant="outline"
                        colorPalette="brand"
                        size="lg"
                        flex={1}
                        onClick={() => handleDownload('summary')}
                      >
                        Récapitulatif texte
                        <Text fontSize="xs" ml={2} opacity={0.8}>
                          (copier-coller)
                        </Text>
                      </Button>
                    </HStack>
                  </Box>

                  {/* Aide */}
                  <Alert.Root status="info">
                    <Alert.Indicator />
                    <Box>
                      <Alert.Title>Comment déclarer ?</Alert.Title>
                      <Alert.Description>
                        {declarationType === 'cesu' ? (
                          <>
                            Rendez-vous sur{' '}
                            <Text as="span" fontWeight="semibold">cesu.urssaf.fr</Text>
                            {' '}et utilisez le fichier CSV ou les informations du récapitulatif
                            pour remplir votre déclaration mensuelle.
                          </>
                        ) : (
                          <>
                            Rendez-vous sur{' '}
                            <Text as="span" fontWeight="semibold">pajemploi.urssaf.fr</Text>
                            {' '}pour déclarer les heures de votre salarié(e).
                          </>
                        )}
                      </Alert.Description>
                    </Box>
                  </Alert.Root>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Container>
    </DashboardLayout>
  )
}

export default DocumentsPage
