import { useState, useEffect } from 'react'
import {
  Box,
  VStack,
  Text,
  Card,
} from '@chakra-ui/react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getNotificationPreferences, updateNotificationPreferences } from '@/services/notificationService'
import { toaster } from '@/lib/toaster'
import { PanelHeader, ToggleRow } from './SettingsShared'

export function NotificationsPanel({ userId }: { userId: string }) {
  const {
    isSupported,
    isConfigured,
    permission,
    isSubscribed,
    isLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications({ userId })

  const [emailEnabled, setEmailEnabled] = useState(false)
  const [emailShiftReminders, setEmailShiftReminders] = useState(false)
  const [emailMessageNotifications, setEmailMessageNotifications] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)

  useEffect(() => {
    getNotificationPreferences(userId).then((prefs) => {
      setEmailEnabled(prefs.emailEnabled)
      setEmailShiftReminders(prefs.shiftReminders)
      setEmailMessageNotifications(prefs.messageNotifications)
    }).catch(() => {})
  }, [userId])

  const handleEmailToggle = async (field: 'emailEnabled' | 'shiftReminders' | 'messageNotifications', value: boolean) => {
    setEmailSaving(true)
    try {
      if (field === 'emailEnabled') setEmailEnabled(value)
      if (field === 'shiftReminders') setEmailShiftReminders(value)
      if (field === 'messageNotifications') setEmailMessageNotifications(value)
      await updateNotificationPreferences(userId, { [field]: value })
    } catch {
      toaster.error({ title: 'Erreur lors de la sauvegarde' })
    } finally {
      setEmailSaving(false)
    }
  }

  const pushAvailable = isSupported && isConfigured
  const pushDenied = permission === 'denied'

  const handleTogglePush = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe()
      if (ok) {
        toaster.success({ title: 'Notifications push désactivées' })
      } else {
        toaster.error({ title: 'Erreur lors de la désactivation des notifications' })
      }
    } else {
      const ok = await subscribe()
      if (ok) {
        toaster.success({ title: 'Notifications push activées' })
      } else if (!pushError) {
        toaster.error({ title: 'Erreur lors de l\'activation des notifications' })
      }
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <PanelHeader
        title="Notifications"
        subtitle="Choisissez comment et quand vous souhaitez être notifié."
      />

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Notifications push</Card.Title>
          <Text fontSize="sm" color="text.muted">Reçues directement sur votre appareil.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            {!pushAvailable && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="orange.50" borderWidth="1px" borderColor="orange.200">
                <Text fontSize="sm" color="orange.700">
                  {!isSupported
                    ? 'Votre navigateur ne supporte pas les notifications push.'
                    : 'Les notifications push ne sont pas encore configurées sur le serveur.'}
                </Text>
              </Box>
            )}
            {pushDenied && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="red.50" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700">
                  Les notifications sont bloquées par votre navigateur. Autorisez-les dans les paramètres de votre navigateur pour ce site.
                </Text>
              </Box>
            )}
            {pushError && (
              <Box px={4} py={3} mb={3} borderRadius="md" bg="red.50" borderWidth="1px" borderColor="red.200">
                <Text fontSize="sm" color="red.700">{pushError}</Text>
              </Box>
            )}
            <ToggleRow
              label="Activer les notifications push"
              description={isSubscribed ? 'Les notifications sont actives sur cet appareil.' : 'Recevez des alertes en temps réel.'}
              checked={isSubscribed}
              onChange={handleTogglePush}
              disabled={!pushAvailable || pushDenied || isLoading}
            />
          </VStack>
        </Card.Body>
      </Card.Root>

      <Card.Root borderRadius="md" borderWidth="1px" borderColor="border.default" boxShadow="sm">
        <Card.Header px={4} py={3} borderBottomWidth="1px" borderColor="border.default">
          <Card.Title fontFamily="heading" fontSize="lg" fontWeight="700">Notifications e-mail</Card.Title>
          <Text fontSize="sm" color="text.muted">Reçues dans votre boîte mail.</Text>
        </Card.Header>
        <Card.Body p={4}>
          <VStack gap={0} align="stretch">
            <ToggleRow
              label="Activer les e-mails"
              description="Active ou désactive toutes les notifications par e-mail."
              checked={emailEnabled}
              onChange={() => handleEmailToggle('emailEnabled', !emailEnabled)}
              disabled={emailSaving}
            />
            <ToggleRow
              label="Rappels d'intervention"
              description="Rappel par e-mail la veille de chaque intervention."
              checked={emailShiftReminders}
              onChange={() => handleEmailToggle('shiftReminders', !emailShiftReminders)}
              disabled={emailSaving || !emailEnabled}
            />
            <ToggleRow
              label="Nouveaux messages"
              description="Notification par e-mail quand vous recevez un nouveau message."
              checked={emailMessageNotifications}
              onChange={() => handleEmailToggle('messageNotifications', !emailMessageNotifications)}
              disabled={emailSaving || !emailEnabled}
            />
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
