import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Input,
  Grid,
  NativeSelect,
  Field,
} from '@chakra-ui/react'
import { useAuthStore } from '@/stores/authStore'
import { updateProfile, uploadAvatar, deleteAvatar, validateAvatarFile, getEmployer, upsertEmployer, getEmployee, upsertEmployee } from '@/services/profileService'
import type { Address, UserRole } from '@/types'
import { logger } from '@/lib/logger'
import { GhostButton, PrimaryButton } from '@/components/ui'
import { PanelHeader } from './SettingsShared'

interface ProfilPanelProps {
  profile: { id: string; firstName: string; lastName: string; email: string; phone?: string | null; avatarUrl?: string }
  userRole: UserRole
}

export function ProfilPanel({ profile, userRole }: ProfilPanelProps) {
  const [firstName, setFirstName] = useState(profile.firstName)
  const [lastName, setLastName] = useState(profile.lastName)
  const [email] = useState(profile.email)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const emptyAddress: Address = { street: '', city: '', postalCode: '', country: 'France' }
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [initialAddress, setInitialAddress] = useState<Address>(emptyAddress)
  const [lang, setLang] = useState('fr')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setStoreProfile = useAuthStore((s) => s.setProfile)

  useEffect(() => {
    async function loadAddress() {
      try {
        let addr: Address | undefined
        if (userRole === 'employer') {
          const emp = await getEmployer(profile.id)
          addr = emp?.address
        } else if (userRole === 'employee') {
          const emp = await getEmployee(profile.id)
          addr = emp?.address
        }
        if (addr) {
          setAddress(addr)
          setInitialAddress(addr)
        }
      } catch (err) {
        logger.error('Erreur chargement adresse:', err)
      }
    }
    loadAddress()
  }, [profile.id, userRole])

  const addressChanged = address.street !== initialAddress.street || address.city !== initialAddress.city || address.postalCode !== initialAddress.postalCode || address.country !== initialAddress.country
  const hasChanges = firstName !== profile.firstName || lastName !== profile.lastName || (phone || '') !== (profile.phone || '') || addressChanged

  const handleSaveProfile = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await updateProfile(profile.id, { firstName, lastName, phone: phone || undefined })
      if (addressChanged) {
        if (userRole === 'employer') {
          await upsertEmployer(profile.id, { address })
        } else if (userRole === 'employee') {
          await upsertEmployee(profile.id, { address })
        }
        setInitialAddress(address)
      }
      setFeedback({ type: 'success', msg: 'Profil mis à jour.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validation = validateAvatarFile(file)
    if (!validation.valid) {
      setFeedback({ type: 'error', msg: validation.error! })
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      const result = await uploadAvatar(profile.id, file)
      setAvatarUrl(result.url)
      const current = useAuthStore.getState().profile
      if (current) {
        setStoreProfile({ ...current, avatarUrl: result.url, updatedAt: new Date() })
      }
      setFeedback({ type: 'success', msg: 'Photo mise à jour.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur upload.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarDelete = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      await deleteAvatar(profile.id)
      setAvatarUrl('')
      const current = useAuthStore.getState().profile
      if (current) {
        setStoreProfile({ ...current, avatarUrl: undefined, updatedAt: new Date() })
      }
      setFeedback({ type: 'success', msg: 'Photo supprimée.' })
    } catch (err) {
      setFeedback({ type: 'error', msg: err instanceof Error ? err.message : 'Erreur suppression.' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFirstName(profile.firstName)
    setLastName(profile.lastName)
    setPhone(profile.phone ?? '')
    setAddress(initialAddress)
    setFeedback(null)
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Informations"
        subtitle="Gérez vos informations personnelles et les détails de votre compte."
      />

      {feedback && (
        <Box px={4} py={3} borderRadius="md" bg={feedback.type === 'success' ? 'accent.subtle' : 'red.50'} borderWidth="1px" borderColor={feedback.type === 'success' ? 'green.200' : 'red.200'}>
          <Text fontSize="sm" color={feedback.type === 'success' ? 'green.700' : 'red.700'}>{feedback.msg}</Text>
        </Box>
      )}

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Informations personnelles</Card.Title>
          <Text fontSize="xs" color="text.muted" mt="3px">Ces informations apparaissent sur vos documents exportés.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <HStack gap={4} mb={6}>
            {avatarUrl ? (
              <Box w="72px" h="72px" borderRadius="full" overflow="hidden" flexShrink={0}>
                <img src={avatarUrl} alt={`Avatar ${firstName} ${lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            ) : (
              <Box
                w="72px" h="72px" borderRadius="full" bg="brand.500" color="white"
                display="flex" alignItems="center" justifyContent="center"
                fontSize="1.6rem" fontWeight="800" flexShrink={0}
                aria-label={`Avatar ${firstName} ${lastName}`}
              >
                {firstName.charAt(0)}{lastName.charAt(0)}
              </Box>
            )}
            <VStack gap={2} align="start">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={handleAvatarUpload} />
              <GhostButton size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                Changer la photo
              </GhostButton>
              {avatarUrl && (
                <Button variant="ghost" size="sm" color="red.600" borderWidth="1.5px" borderColor="red.200" _hover={{ bg: 'red.50', borderColor: 'red.500' }} onClick={handleAvatarDelete} disabled={saving}>
                  Supprimer
                </Button>
              )}
            </VStack>
          </HStack>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Prénom</Field.Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Nom</Field.Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Adresse e-mail</Field.Label>
              <Input value={email} readOnly />
            </Field.Root>
            <Field.Root>
              <Field.Label>Téléphone</Field.Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field.Root>
            <Field.Root gridColumn={{ md: '1 / -1' }}>
              <Field.Label>Adresse (rue)</Field.Label>
              <Input value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} placeholder="12 rue des Lilas" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Code postal</Field.Label>
              <Input value={address.postalCode} onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))} placeholder="75001" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Ville</Field.Label>
              <Input value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} placeholder="Paris" disabled={userRole === 'caregiver'} />
            </Field.Root>
            <Field.Root>
              <Field.Label>Pays</Field.Label>
              <Input value={address.country} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} disabled={userRole === 'caregiver'} />
              <Field.HelperText>Utilisée pour les bulletins de paie.</Field.HelperText>
            </Field.Root>
          </Grid>
          <HStack mt={5} gap={3} justify="flex-end">
            <GhostButton size="sm" onClick={handleCancel} disabled={saving || !hasChanges}>Annuler</GhostButton>
            <PrimaryButton size="sm" onClick={handleSaveProfile} disabled={saving || !hasChanges}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </PrimaryButton>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Langue et format</Card.Title>
        </Card.Header>
        <Card.Body p={4}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Field.Root>
              <Field.Label>Langue de l'interface</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Format de date</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
                  <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
          </Grid>
          <HStack mt={5} justify="flex-end">
            <Text fontSize="xs" color="text.muted">Langue et format seront disponibles prochainement.</Text>
          </HStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
