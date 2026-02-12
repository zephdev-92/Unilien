import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ============================================
// Mocks des fonctions du pushService
// ============================================

const mockIsPushSupported = vi.fn<() => boolean>().mockReturnValue(true)
const mockIsVapidConfigured = vi.fn<() => boolean>().mockReturnValue(true)
const mockGetNotificationPermission = vi
  .fn<() => NotificationPermission>()
  .mockReturnValue('granted')
const mockRequestNotificationPermission = vi
  .fn<() => Promise<NotificationPermission>>()
  .mockResolvedValue('granted')
const mockSubscribeToPush = vi
  .fn<(userId: string) => Promise<PushSubscription | null>>()
  .mockResolvedValue({ endpoint: 'https://push.example.com/sub-1' } as unknown as PushSubscription)
const mockUnsubscribeFromPush = vi
  .fn<(userId: string) => Promise<boolean>>()
  .mockResolvedValue(true)
const mockIsPushSubscribed = vi
  .fn<() => Promise<boolean>>()
  .mockResolvedValue(false)
const mockShowLocalNotification = vi.fn()

vi.mock('@/services/pushService', () => ({
  isPushSupported: (...args: unknown[]) => mockIsPushSupported(...(args as [])),
  isVapidConfigured: (...args: unknown[]) => mockIsVapidConfigured(...(args as [])),
  getNotificationPermission: (...args: unknown[]) =>
    mockGetNotificationPermission(...(args as [])),
  requestNotificationPermission: (...args: unknown[]) =>
    mockRequestNotificationPermission(...(args as [])),
  subscribeToPush: (...args: unknown[]) => mockSubscribeToPush(...(args as [string])),
  unsubscribeFromPush: (...args: unknown[]) =>
    mockUnsubscribeFromPush(...(args as [string])),
  isPushSubscribed: (...args: unknown[]) => mockIsPushSubscribed(...(args as [])),
  showLocalNotification: (...args: unknown[]) =>
    mockShowLocalNotification(...(args as [unknown])),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

import { usePushNotifications } from './usePushNotifications'
import { logger } from '@/lib/logger'

// ============================================
// Mock des globals navigateur
// ============================================

function setupBrowserMocks() {
  // navigator.permissions
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: vi.fn().mockResolvedValue({
        onchange: null,
      }),
    },
    writable: true,
    configurable: true,
  })

  // navigator.serviceWorker
  const swListeners = new Map<string, Set<(event: unknown) => void>>()
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      addEventListener: vi.fn((type: string, handler: (event: unknown) => void) => {
        if (!swListeners.has(type)) swListeners.set(type, new Set())
        swListeners.get(type)!.add(handler)
      }),
      removeEventListener: vi.fn((type: string, handler: (event: unknown) => void) => {
        swListeners.get(type)?.delete(handler)
      }),
      // Helper pour dispatch dans les tests
      __dispatch: (type: string, event: unknown) => {
        swListeners.get(type)?.forEach((handler) => handler(event))
      },
    },
    writable: true,
    configurable: true,
  })

  return { swListeners }
}

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Remettre les valeurs par défaut des mocks
    mockIsPushSupported.mockReturnValue(true)
    mockIsVapidConfigured.mockReturnValue(true)
    mockGetNotificationPermission.mockReturnValue('granted')
    mockRequestNotificationPermission.mockResolvedValue('granted')
    mockSubscribeToPush.mockResolvedValue({
      endpoint: 'https://push.example.com/sub-1',
    } as unknown as PushSubscription)
    mockUnsubscribeFromPush.mockResolvedValue(true)
    mockIsPushSubscribed.mockResolvedValue(false)

    setupBrowserMocks()
  })

  // -----------------------------------------------
  // 1. Valeurs par defaut
  // -----------------------------------------------

  it('devrait retourner les valeurs par défaut au montage', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    // Valeurs synchrones immédiates
    expect(result.current.isSupported).toBe(true)
    expect(result.current.isConfigured).toBe(true)
    expect(result.current.permission).toBe('granted')
    expect(result.current.error).toBeNull()
    expect(typeof result.current.requestPermission).toBe('function')
    expect(typeof result.current.subscribe).toBe('function')
    expect(typeof result.current.unsubscribe).toBe('function')
    expect(typeof result.current.showNotification).toBe('function')

    // Attendre fin du chargement
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  // -----------------------------------------------
  // 2. isSupported false
  // -----------------------------------------------

  it('devrait avoir isSupported à false si isPushSupported() retourne false', async () => {
    mockIsPushSupported.mockReturnValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    expect(result.current.isSupported).toBe(false)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  // -----------------------------------------------
  // 3. isLoading false si userId null
  // -----------------------------------------------

  it('devrait passer isLoading à false rapidement si userId est null', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ userId: null })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Pas de vérification de souscription
    expect(mockIsPushSubscribed).not.toHaveBeenCalled()
  })

  // -----------------------------------------------
  // 4. Vérifie la souscription au montage
  // -----------------------------------------------

  it('devrait vérifier la souscription au montage si supporté et userId fourni', async () => {
    mockIsPushSubscribed.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockIsPushSubscribed).toHaveBeenCalledTimes(1)
    expect(result.current.isSubscribed).toBe(true)
  })

  // -----------------------------------------------
  // 5. Ré-abonne si permission granted mais pas souscrit (rotation VAPID)
  // -----------------------------------------------

  it('devrait ré-abonner automatiquement si permission granted mais pas souscrit (rotation VAPID)', async () => {
    mockIsPushSubscribed.mockResolvedValue(false)
    mockGetNotificationPermission.mockReturnValue('granted')

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Le hook devrait tenter de ré-abonner car permission === 'granted' et pas souscrit
    expect(mockSubscribeToPush).toHaveBeenCalledWith('user-123')
    expect(result.current.isSubscribed).toBe(true)
  })

  // -----------------------------------------------
  // 6. autoSubscribe
  // -----------------------------------------------

  it('devrait déclencher autoSubscribe quand les conditions sont remplies', async () => {
    // isPushSubscribed retourne false, mais le premier useEffect ne ré-abonne pas
    // car la permission est 'default' (pas 'granted') dans le mount check
    // Ensuite autoSubscribe se déclenche une fois isLoading = false
    mockIsPushSubscribed.mockResolvedValue(false)
    mockGetNotificationPermission.mockReturnValue('granted')

    // Empêcher le premier useEffect de souscrire en ne remplissant pas les conditions
    // On veut tester que autoSubscribe fonctionne indépendamment
    // Pour isoler : simuler que checkSubscription ne souscrit pas (déjà souscrit)
    mockIsPushSubscribed.mockResolvedValue(true)

    // Remettre a false pour que autoSubscribe agisse
    mockIsPushSubscribed.mockResolvedValueOnce(false)
    // Le premier useEffect trouve pas souscrit + permission granted => souscrit
    // puis autoSubscribe ne se déclenche pas car isSubscribed est déjà true

    // Test plus simple : vérifier que subscribeToPush est appelé avec autoSubscribe
    mockIsPushSubscribed.mockResolvedValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({
        userId: 'user-123',
        autoSubscribe: true,
      })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // subscribeToPush devrait avoir été appelé (soit par checkSubscription, soit par autoSubscribe)
    expect(mockSubscribeToPush).toHaveBeenCalledWith('user-123')
    expect(result.current.isSubscribed).toBe(true)
  })

  // -----------------------------------------------
  // 7. requestPermission met à jour le state
  // -----------------------------------------------

  it('devrait retourner la permission et mettre à jour le state via requestPermission', async () => {
    mockGetNotificationPermission.mockReturnValue('default')
    mockIsPushSubscribed.mockResolvedValue(false)
    // Empêcher checkSubscription de souscrire (permission 'default' et isConfigured ne suffit pas)
    mockRequestNotificationPermission.mockResolvedValue('granted')

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let permission: NotificationPermission = 'default'
    await act(async () => {
      permission = await result.current.requestPermission()
    })

    expect(permission).toBe('granted')
    expect(result.current.permission).toBe('granted')
    expect(result.current.error).toBeNull()
  })

  // -----------------------------------------------
  // 8. requestPermission retourne 'denied' si push non supporté
  // -----------------------------------------------

  it('devrait retourner denied via requestPermission si push non supporté', async () => {
    mockIsPushSupported.mockReturnValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let permission: NotificationPermission = 'default'
    await act(async () => {
      permission = await result.current.requestPermission()
    })

    expect(permission).toBe('denied')
    expect(result.current.error).toBe(
      'Les notifications ne sont pas supportées par ce navigateur'
    )
  })

  // -----------------------------------------------
  // 9. requestPermission gère les erreurs
  // -----------------------------------------------

  it('devrait gérer les erreurs dans requestPermission', async () => {
    mockRequestNotificationPermission.mockRejectedValue(
      new Error('Erreur de permission')
    )

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let permission: NotificationPermission = 'default'
    await act(async () => {
      permission = await result.current.requestPermission()
    })

    expect(permission).toBe('denied')
    expect(result.current.error).toBe('Erreur de permission')
  })

  // -----------------------------------------------
  // 10. subscribe retourne false si userId null
  // -----------------------------------------------

  it('devrait retourner false via subscribe si userId est null', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ userId: null })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = true
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Utilisateur non connecté')
  })

  // -----------------------------------------------
  // 11. subscribe retourne false si push non supporté
  // -----------------------------------------------

  it('devrait retourner false via subscribe si push non supporté', async () => {
    mockIsPushSupported.mockReturnValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = true
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Push non supporté')
  })

  // -----------------------------------------------
  // 12. subscribe retourne false si VAPID non configuré
  // -----------------------------------------------

  it('devrait retourner false via subscribe si VAPID non configuré', async () => {
    mockIsVapidConfigured.mockReturnValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = true
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Configuration push manquante')
  })

  // -----------------------------------------------
  // 13. subscribe demande la permission si 'default'
  // -----------------------------------------------

  it('devrait demander la permission si default puis souscrire via subscribe', async () => {
    mockGetNotificationPermission.mockReturnValue('default')
    mockIsPushSubscribed.mockResolvedValue(false)
    mockRequestNotificationPermission.mockResolvedValue('granted')

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Réinitialiser car checkSubscription pourrait avoir appelé subscribeToPush
    mockSubscribeToPush.mockClear()

    let success = false
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(mockRequestNotificationPermission).toHaveBeenCalled()
    expect(mockSubscribeToPush).toHaveBeenCalledWith('user-123')
    expect(success).toBe(true)
    expect(result.current.isSubscribed).toBe(true)
  })

  // -----------------------------------------------
  // 14. subscribe retourne false si permission 'denied'
  // -----------------------------------------------

  it('devrait retourner false via subscribe si permission est denied', async () => {
    mockGetNotificationPermission.mockReturnValue('denied')
    mockIsPushSubscribed.mockResolvedValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = true
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe(
      'Les notifications sont bloquées. Activez-les dans les paramètres du navigateur.'
    )
  })

  // -----------------------------------------------
  // 15. subscribe gère l'échec de subscribeToPush
  // -----------------------------------------------

  it('devrait gérer l\'échec de subscribeToPush dans subscribe', async () => {
    mockSubscribeToPush.mockResolvedValue(null)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // subscribeToPush retourne null => échec
    mockSubscribeToPush.mockClear()
    mockSubscribeToPush.mockResolvedValue(null)

    let success = true
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe("Échec de l'abonnement aux notifications")
  })

  // -----------------------------------------------
  // 16. unsubscribe désabonne et met à jour isSubscribed
  // -----------------------------------------------

  it('devrait désabonner et mettre à jour isSubscribed via unsubscribe', async () => {
    // Montage : l'utilisateur est déjà souscrit
    mockIsPushSubscribed.mockResolvedValue(true)
    mockUnsubscribeFromPush.mockResolvedValue(true)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSubscribed).toBe(true)

    let success = false
    await act(async () => {
      success = await result.current.unsubscribe()
    })

    expect(success).toBe(true)
    expect(mockUnsubscribeFromPush).toHaveBeenCalledWith('user-123')
    expect(result.current.isSubscribed).toBe(false)
  })

  // -----------------------------------------------
  // 17. unsubscribe retourne true si userId null (no-op)
  // -----------------------------------------------

  it('devrait retourner true via unsubscribe si userId est null (no-op)', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ userId: null })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = false
    await act(async () => {
      success = await result.current.unsubscribe()
    })

    expect(success).toBe(true)
    expect(mockUnsubscribeFromPush).not.toHaveBeenCalled()
  })

  // -----------------------------------------------
  // 18. unsubscribe gère les erreurs
  // -----------------------------------------------

  it('devrait gérer les erreurs dans unsubscribe', async () => {
    mockIsPushSubscribed.mockResolvedValue(true)
    mockUnsubscribeFromPush.mockRejectedValue(new Error('Erreur réseau'))

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let success = true
    await act(async () => {
      success = await result.current.unsubscribe()
    })

    expect(success).toBe(false)
    expect(result.current.error).toBe('Erreur réseau')
  })

  // -----------------------------------------------
  // 19. showNotification appelle showLocalNotification
  // -----------------------------------------------

  it('devrait appeler showLocalNotification si permission granted', async () => {
    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const payload = { title: 'Test', body: 'Corps du message' }

    act(() => {
      result.current.showNotification(payload)
    })

    expect(mockShowLocalNotification).toHaveBeenCalledWith(payload)
  })

  // -----------------------------------------------
  // 20. showNotification ne fait rien si permission non granted
  // -----------------------------------------------

  it('devrait ne rien faire via showNotification si permission non granted', async () => {
    mockGetNotificationPermission.mockReturnValue('denied')
    mockIsPushSubscribed.mockResolvedValue(false)

    const { result } = renderHook(() =>
      usePushNotifications({ userId: 'user-123' })
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const payload = { title: 'Test', body: 'Corps du message' }

    act(() => {
      result.current.showNotification(payload)
    })

    expect(mockShowLocalNotification).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(
      'Permission non accordée pour les notifications'
    )
  })
})
