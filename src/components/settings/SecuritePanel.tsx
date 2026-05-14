import { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Input,
  Badge,
  Separator,
  Grid,
  Field,
  Spinner,
  Center,
} from '@chakra-ui/react'
import { supabase } from '@/lib/supabase/client'
import { deleteAllUserData, deleteAccount } from '@/services/accountService'
import { logger } from '@/lib/logger'
import { PrimaryButton } from '@/components/ui'
import { useMfa } from '@/hooks/useMfa'
import { MfaEnrollment } from '@/components/auth/MfaEnrollment'
import { toaster } from '@/lib/toaster'
import { PanelHeader } from './SettingsShared'

export function SecuritePanel() {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const pwdValid = newPwd.length >= 12 && /[A-Z]/.test(newPwd) && /\d/.test(newPwd)
  const pwdMatch = newPwd === confirmPwd
  const canSubmit = currentPwd.length > 0 && pwdValid && pwdMatch

  const handleChangePassword = async () => {
    if (!canSubmit) return
    setSaving(true)
    setFeedback(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Utilisateur non trouvé.')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      })
      if (signInError) {
        setFeedback({ type: 'error', msg: 'Mot de passe actuel incorrect.' })
        setSaving(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setFeedback({ type: 'success', msg: 'Mot de passe mis à jour.' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Sécurité"
        subtitle="Gérez votre mot de passe et la sécurité de votre compte."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Changer le mot de passe</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={4} align="stretch">
            <Field.Root>
              <Field.Label>Mot de passe actuel</Field.Label>
              <Input type="password" placeholder="••••••••••••" autoComplete="current-password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </Field.Root>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
              <Field.Root invalid={newPwd.length > 0 && !pwdValid}>
                <Field.Label>Nouveau mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                <Field.HelperText>Minimum 12 caractères, dont 1 majuscule et 1 chiffre.</Field.HelperText>
              </Field.Root>
              <Field.Root invalid={confirmPwd.length > 0 && !pwdMatch}>
                <Field.Label>Confirmer le mot de passe</Field.Label>
                <Input type="password" placeholder="••••••••••••" autoComplete="new-password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                {confirmPwd.length > 0 && !pwdMatch && <Field.ErrorText>Les mots de passe ne correspondent pas.</Field.ErrorText>}
              </Field.Root>
            </Grid>
            <HStack justify="flex-end">
              <PrimaryButton size="sm" onClick={handleChangePassword} disabled={saving || !canSubmit}>
                {saving ? 'Mise à jour…' : 'Mettre à jour'}
              </PrimaryButton>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      <TwoFactorCard />

      <DangerZone />
    </VStack>
  )
}

function TwoFactorCard() {
  const { isEnabled, factors, loading, enroll, verify, unenroll, reload } = useMfa()
  const [showEnroll, setShowEnroll] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [disableError, setDisableError] = useState<string | null>(null)

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      setDisableError('Le code doit contenir 6 chiffres.')
      return
    }
    setDisabling(true)
    setDisableError(null)
    try {
      const factor = factors.find((f) => f.status === 'verified')
      if (!factor) return

      await verify(factor.id, disableCode)
      await unenroll(factor.id)
      setDisableCode('')
      toaster.create({ title: '2FA désactivée', type: 'success' })
    } catch {
      setDisableError('Code invalide.')
    } finally {
      setDisabling(false)
    }
  }

  if (loading) {
    return (
      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Body p={4}>
          <Center py={4}><Spinner size="sm" /></Center>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
      <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
        <HStack gap={2}>
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Double authentification (2FA)</Card.Title>
          {isEnabled && <Badge colorPalette="green" size="sm">Activée</Badge>}
        </HStack>
      </Card.Header>
      <Card.Body p={4}>
        {showEnroll ? (
          <MfaEnrollment
            onEnroll={enroll}
            onVerify={verify}
            onCancel={() => setShowEnroll(false)}
            onSuccess={() => {
              setShowEnroll(false)
              reload()
              toaster.create({ title: '2FA activée', type: 'success' })
            }}
          />
        ) : isEnabled ? (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.muted">
              Votre compte est protégé par la double authentification.
              Un code vous est demandé à chaque connexion.
            </Text>
            <Separator />
            <Text fontSize="sm" fontWeight="600">
              Pour désactiver, entrez le code de votre application :
            </Text>
            <HStack gap={2}>
              <Input
                placeholder="000000"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                fontFamily="mono"
                fontSize="lg"
                textAlign="center"
                letterSpacing="0.2em"
                maxW="160px"
              />
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={handleDisable}
                disabled={disabling || disableCode.length !== 6}
              >
                {disabling ? 'Désactivation…' : 'Désactiver'}
              </Button>
            </HStack>
            {disableError && (
              <Text fontSize="sm" color="red.500">{disableError}</Text>
            )}
          </VStack>
        ) : (
          <VStack gap={3} align="stretch">
            <Text fontSize="sm" color="text.muted">
              Protégez votre compte avec Google Authenticator, Authy ou toute autre application d&apos;authentification.
            </Text>
            <Button
              colorPalette="brand"
              size="sm"
              alignSelf="flex-start"
              onClick={() => setShowEnroll(true)}
            >
              Activer la 2FA
            </Button>
          </VStack>
        )}
      </Card.Body>
    </Card.Root>
  )
}

function DangerZone() {
  const [showDeleteData, setShowDeleteData] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [dangerFeedback, setDangerFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const handleDeleteData = async () => {
    if (confirmText !== 'SUPPRIMER') return
    setProcessing(true)
    setDangerFeedback(null)
    try {
      await deleteAllUserData()
      setDangerFeedback({ type: 'success', msg: 'Toutes les données ont été supprimées.' })
      setShowDeleteData(false)
      setConfirmText('')
    } catch (err) {
      logger.error('Erreur suppression données:', err)
      setDangerFeedback({ type: 'error', msg: 'Erreur lors de la suppression des données.' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'SUPPRIMER MON COMPTE') return
    setProcessing(true)
    setDangerFeedback(null)
    try {
      await deleteAccount()
    } catch (err) {
      logger.error('Erreur suppression compte:', err)
      setDangerFeedback({ type: 'error', msg: 'Erreur lors de la suppression du compte.' })
      setProcessing(false)
    }
  }

  const resetModals = () => {
    setShowDeleteData(false)
    setShowDeleteAccount(false)
    setConfirmText('')
  }

  return (
    <Card.Root borderRadius="md" borderWidth="1px" borderColor="red.200" boxShadow="sm">
      <Card.Header px={4} py={3} bg="red.50" borderBottomWidth="1px" borderColor="red.200">
        <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700" color="red.600">Zone de danger</Card.Title>
      </Card.Header>
      <Card.Body p={4}>
        {dangerFeedback && (
          <Box mb={4} px={4} py={3} borderRadius="md" bg={dangerFeedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={dangerFeedback.type === 'success' ? 'green.200' : 'red.200'}>
            <Text fontSize="sm" color={dangerFeedback.type === 'success' ? 'green.700' : 'red.700'}>{dangerFeedback.msg}</Text>
          </Box>
        )}
        <VStack gap={4} align="stretch">
          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="medium" fontSize="sm">Supprimer toutes les données</Text>
              <Text fontSize="xs" color="text.muted">Efface définitivement les interventions, contrats, absences et messages. Votre compte reste actif.</Text>
            </Box>
            <Button
              colorPalette="red"
              size="xs"
              variant="outline"
              onClick={() => { resetModals(); setShowDeleteData(true) }}
            >
              Supprimer
            </Button>
          </HStack>

          {showDeleteData && (
            <Box p={4} borderRadius="md" borderWidth="1px" borderColor="red.300" bg="red.50">
              <VStack gap={3} align="stretch">
                <Text fontSize="sm" fontWeight="medium" color="red.700">
                  Cette action est irréversible. Toutes vos interventions, contrats, absences et messages seront supprimés.
                </Text>
                <Text fontSize="sm">
                  Tapez <strong>SUPPRIMER</strong> pour confirmer :
                </Text>
                <Input
                  size="sm"
                  placeholder="SUPPRIMER"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <HStack gap={2} justify="flex-end">
                  <Button size="xs" variant="ghost" onClick={resetModals} disabled={processing}>
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    colorPalette="red"
                    onClick={handleDeleteData}
                    disabled={confirmText !== 'SUPPRIMER' || processing}
                    loading={processing}
                  >
                    Confirmer la suppression
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}

          <Separator />

          <HStack justify="space-between" align="start">
            <Box>
              <Text fontWeight="medium" fontSize="sm">Supprimer le compte</Text>
              <Text fontSize="xs" color="text.muted">Supprime définitivement votre compte et toutes les données associées.</Text>
            </Box>
            <Button
              colorPalette="red"
              size="xs"
              variant="outline"
              onClick={() => { resetModals(); setShowDeleteAccount(true) }}
            >
              Supprimer
            </Button>
          </HStack>

          {showDeleteAccount && (
            <Box p={4} borderRadius="md" borderWidth="1px" borderColor="red.300" bg="red.50">
              <VStack gap={3} align="stretch">
                <Text fontSize="sm" fontWeight="medium" color="red.700">
                  Cette action est irréversible. Votre compte et toutes vos données seront définitivement supprimés. Vous ne pourrez plus vous connecter.
                </Text>
                <Text fontSize="sm">
                  Tapez <strong>SUPPRIMER MON COMPTE</strong> pour confirmer :
                </Text>
                <Input
                  size="sm"
                  placeholder="SUPPRIMER MON COMPTE"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
                <HStack gap={2} justify="flex-end">
                  <Button size="xs" variant="ghost" onClick={resetModals} disabled={processing}>
                    Annuler
                  </Button>
                  <Button
                    size="xs"
                    colorPalette="red"
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== 'SUPPRIMER MON COMPTE' || processing}
                    loading={processing}
                  >
                    Supprimer mon compte
                  </Button>
                </HStack>
              </VStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
