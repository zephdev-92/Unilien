import { describe, it, expect, beforeEach, vi } from 'vitest'

// Hoisted : s'exécute AVANT le chargement des modules importés.
// Nécessaire car VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
// est évaluée au module-level dans pushService.ts.
vi.hoisted(() => {
  import.meta.env.VITE_VAPID_PUBLIC_KEY = 'BFake_VAPID_PUBLIC_KEY_FOR_TESTING_1234567890abcdef'
})

// ============================================
// MOCKS
// ============================================

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ============================================
// HELPERS
// ============================================

function mockSupabaseQuery(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.lte = vi.fn().mockReturnValue(chain)
  chain.lt = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result)))
  mockFrom.mockImplementation(() => chain)
  return chain
}

// ============================================
// GLOBAL MOCKS
// ============================================

beforeEach(() => {
  vi.clearAllMocks()

  // Reset navigator.serviceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: Promise.resolve({}) },
    writable: true,
    configurable: true,
  })

  // Reset window.PushManager
  Object.defineProperty(window, 'PushManager', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })

  // Reset window.Notification
  Object.defineProperty(window, 'Notification', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
  ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'
  ;(window.Notification as unknown as Record<string, unknown>).requestPermission = vi.fn().mockResolvedValue('granted')
})

// ============================================
// IMPORTS (apres les mocks)
// ============================================

import {
  isPushSupported,
  isVapidConfigured,
  getNotificationPermission,
  requestNotificationPermission,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  isPushSubscribed,
  getPushState,
  getUserPushSubscriptions,
  showLocalNotification,
} from '@/services/pushService'

// ============================================
// TESTS
// ============================================

describe('pushService', () => {
  // ------------------------------------------
  // isPushSupported
  // ------------------------------------------
  describe('isPushSupported', () => {
    it('retourne true quand serviceWorker, PushManager et Notification sont disponibles', () => {
      expect(isPushSupported()).toBe(true)
    })

    it('retourne false quand serviceWorker est absent', () => {
      const saved = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete navigator.serviceWorker

      expect(isPushSupported()).toBe(false)

      // Restaurer
      if (saved) Object.defineProperty(navigator, 'serviceWorker', saved)
    })

    it('retourne false quand PushManager est absent', () => {
      const saved = Object.getOwnPropertyDescriptor(window, 'PushManager')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete window.PushManager

      expect(isPushSupported()).toBe(false)

      // Restaurer
      if (saved) Object.defineProperty(window, 'PushManager', saved)
    })

    it('retourne false quand Notification est absent', () => {
      const saved = Object.getOwnPropertyDescriptor(window, 'Notification')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete window.Notification

      expect(isPushSupported()).toBe(false)

      // Restaurer
      if (saved) Object.defineProperty(window, 'Notification', saved)
    })
  })

  // ------------------------------------------
  // getNotificationPermission
  // ------------------------------------------
  describe('getNotificationPermission', () => {
    it('retourne la permission actuelle du navigateur', () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      expect(getNotificationPermission()).toBe('granted')
    })

    it('retourne denied quand la permission est refusée', () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'denied'

      expect(getNotificationPermission()).toBe('denied')
    })

    it('retourne default quand la permission est en attente', () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'default'

      expect(getNotificationPermission()).toBe('default')
    })

    it('retourne denied quand Notification n est pas disponible', () => {
      const saved = Object.getOwnPropertyDescriptor(window, 'Notification')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete window.Notification

      expect(getNotificationPermission()).toBe('denied')

      // Restaurer
      if (saved) Object.defineProperty(window, 'Notification', saved)
    })
  })

  // ------------------------------------------
  // getUserPushSubscriptions
  // ------------------------------------------
  describe('getUserPushSubscriptions', () => {
    it('retourne les subscriptions mappées depuis la base', async () => {
      const dbRows = [
        { endpoint: 'https://push.example.com/sub1', p256dh: 'key-p256dh-1', auth: 'key-auth-1' },
        { endpoint: 'https://push.example.com/sub2', p256dh: 'key-p256dh-2', auth: 'key-auth-2' },
      ]
      mockSupabaseQuery({ data: dbRows, error: null })

      const result = await getUserPushSubscriptions('user-123')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'key-p256dh-1', auth: 'key-auth-1' },
      })
      expect(result[1]).toEqual({
        endpoint: 'https://push.example.com/sub2',
        keys: { p256dh: 'key-p256dh-2', auth: 'key-auth-2' },
      })
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('retourne un tableau vide en cas d erreur DB', async () => {
      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const result = await getUserPushSubscriptions('user-123')

      expect(result).toEqual([])
    })

    it('retourne un tableau vide quand il n y a pas de subscriptions', async () => {
      mockSupabaseQuery({ data: [], error: null })

      const result = await getUserPushSubscriptions('user-123')

      expect(result).toEqual([])
    })
  })

  // ------------------------------------------
  // showLocalNotification
  // ------------------------------------------
  describe('showLocalNotification', () => {
    it('cree une notification avec les bons parametres', () => {
      const NotificationSpy = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: NotificationSpy,
        writable: true,
        configurable: true,
      })
      ;(NotificationSpy as unknown as Record<string, unknown>).permission = 'granted'

      showLocalNotification({
        title: 'Titre test',
        body: 'Corps du message',
        icon: '/custom-icon.png',
        tag: 'test-tag',
      })

      expect(NotificationSpy).toHaveBeenCalledWith('Titre test', {
        body: 'Corps du message',
        icon: '/custom-icon.png',
        badge: '/pwa-192x192.png',
        tag: 'test-tag',
        data: undefined,
      })
    })

    it('utilise les icones par defaut si non fournies', () => {
      const NotificationSpy = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: NotificationSpy,
        writable: true,
        configurable: true,
      })
      ;(NotificationSpy as unknown as Record<string, unknown>).permission = 'granted'

      showLocalNotification({
        title: 'Test',
        body: 'Corps',
      })

      expect(NotificationSpy).toHaveBeenCalledWith('Test', expect.objectContaining({
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      }))
    })

    it('ne cree pas de notification si la permission n est pas granted', () => {
      const NotificationSpy = vi.fn()
      Object.defineProperty(window, 'Notification', {
        value: NotificationSpy,
        writable: true,
        configurable: true,
      })
      ;(NotificationSpy as unknown as Record<string, unknown>).permission = 'denied'

      showLocalNotification({
        title: 'Test',
        body: 'Corps',
      })

      // Le constructeur Notification ne doit pas etre appele
      expect(NotificationSpy).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------
  // isVapidConfigured
  // ------------------------------------------
  describe('isVapidConfigured', () => {
    it('retourne true quand VITE_VAPID_PUBLIC_KEY est defini dans l env', () => {
      // La variable d env VITE_VAPID_PUBLIC_KEY est chargee depuis .env par Vite
      // VAPID_PUBLIC_KEY est lue au module level et a une valeur non vide
      expect(isVapidConfigured()).toBe(true)
    })
  })

  // ------------------------------------------
  // requestNotificationPermission
  // ------------------------------------------
  describe('requestNotificationPermission', () => {
    it('retourne denied quand Notification n est pas disponible', async () => {
      const saved = Object.getOwnPropertyDescriptor(window, 'Notification')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete window.Notification

      const result = await requestNotificationPermission()
      expect(result).toBe('denied')

      if (saved) Object.defineProperty(window, 'Notification', saved)
    })

    it('retourne granted directement si deja accorde', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
    })

    it('retourne denied directement si deja refuse', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'denied'

      const result = await requestNotificationPermission()
      expect(result).toBe('denied')
    })

    it('demande la permission quand le statut est default', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'default'
      ;(window.Notification as unknown as Record<string, (...args: unknown[]) => unknown>).requestPermission = vi.fn().mockResolvedValue('granted')

      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
      expect((window.Notification as unknown as Record<string, unknown>).requestPermission).toHaveBeenCalled()
    })

    it('retourne denied quand l utilisateur refuse la demande', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'default'
      ;(window.Notification as unknown as Record<string, (...args: unknown[]) => unknown>).requestPermission = vi.fn().mockResolvedValue('denied')

      const result = await requestNotificationPermission()
      expect(result).toBe('denied')
    })
  })

  // ------------------------------------------
  // getCurrentPushSubscription
  // ------------------------------------------
  describe('getCurrentPushSubscription', () => {
    it('retourne null quand serviceWorker n est pas disponible', async () => {
      const saved = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete navigator.serviceWorker

      const result = await getCurrentPushSubscription()
      expect(result).toBeNull()

      if (saved) Object.defineProperty(navigator, 'serviceWorker', saved)
    })

    it('retourne null quand pushManager.getSubscription echoue', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockRejectedValue(new Error('Push error')),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await getCurrentPushSubscription()
      expect(result).toBeNull()
    })

    it('retourne null quand il n y a pas de subscription active', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await getCurrentPushSubscription()
      expect(result).toBeNull()
    })

    it('retourne la subscription active quand elle existe', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub1',
        toJSON: vi.fn().mockReturnValue({
          endpoint: 'https://push.example.com/sub1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        }),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await getCurrentPushSubscription()
      expect(result).toBe(mockSubscription)
    })

    it('retourne null quand serviceWorker.ready rejette', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('SW not available')),
        },
        writable: true,
        configurable: true,
      })

      const result = await getCurrentPushSubscription()
      expect(result).toBeNull()
    })
  })

  // ------------------------------------------
  // subscribeToPush
  // ------------------------------------------
  describe('subscribeToPush', () => {
    it('retourne null quand push n est pas supporte', async () => {
      const saved = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete navigator.serviceWorker

      const result = await subscribeToPush('user-123')
      expect(result).toBeNull()

      if (saved) Object.defineProperty(navigator, 'serviceWorker', saved)
    })

    it('retourne null quand la permission est refusee', async () => {
      // VAPID est configure (charge depuis .env), donc on atteint le check permission
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'denied'

      const result = await subscribeToPush('user-123')
      expect(result).toBeNull()
    })

    it('retourne null quand la permission est default et l utilisateur refuse', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'default'
      ;(window.Notification as unknown as Record<string, (...args: unknown[]) => unknown>).requestPermission = vi.fn().mockResolvedValue('denied')

      const result = await subscribeToPush('user-123')
      expect(result).toBeNull()
    })

    it('retourne null quand le service worker n est pas disponible', async () => {
      // Permission accordee mais SW retourne un registration sans pushManager
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      const rejectedReady = Promise.reject(new Error('SW not available'))
      // Empêcher l'unhandled rejection en ajoutant un catch no-op
      rejectedReady.catch(() => {})

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: rejectedReady,
        },
        writable: true,
        configurable: true,
      })

      const result = await subscribeToPush('user-123')
      expect(result).toBeNull()
    })

    it('cree une nouvelle subscription et la sauvegarde en base', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      const mockSubscription = {
        endpoint: 'https://push.example.com/sub-new',
        options: { applicationServerKey: null },
        unsubscribe: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({
          endpoint: 'https://push.example.com/sub-new',
          keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
        }),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      // Mock window.atob pour urlBase64ToUint8Array
      const originalAtob = window.atob
      window.atob = vi.fn().mockReturnValue('fake-binary-data')

      mockSupabaseQuery({ data: [{ id: '1' }], error: null })

      const result = await subscribeToPush('user-123')

      expect(result).toBe(mockSubscription)
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')

      window.atob = originalAtob
    })

    it('reutilise une subscription existante si la cle VAPID correspond', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      // Creer un applicationServerKey qui correspond a la cle VAPID
      const fakeKeyArray = new Uint8Array([1, 2, 3])
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub-existing',
        options: { applicationServerKey: fakeKeyArray.buffer },
        toJSON: vi.fn().mockReturnValue({
          endpoint: 'https://push.example.com/sub-existing',
          keys: { p256dh: 'existing-p256dh', auth: 'existing-auth' },
        }),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
              subscribe: vi.fn(),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      // Mock atob pour retourner les memes 3 octets afin que keysMatch soit true
      const originalAtob = window.atob
      window.atob = vi.fn().mockReturnValue(String.fromCharCode(1, 2, 3))

      mockSupabaseQuery({ data: [{ id: '1' }], error: null })

      const result = await subscribeToPush('user-123')

      expect(result).toBe(mockSubscription)
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')

      window.atob = originalAtob
    })

    it('retourne null quand pushManager.subscribe echoue', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: vi.fn().mockRejectedValue(new Error('Subscribe error')),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const originalAtob = window.atob
      window.atob = vi.fn().mockReturnValue('fake-binary-data')

      const result = await subscribeToPush('user-123')
      expect(result).toBeNull()

      window.atob = originalAtob
    })

    it('retourne null quand la sauvegarde en base echoue', async () => {
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      const mockSubscription = {
        endpoint: 'https://push.example.com/sub-new',
        options: { applicationServerKey: null },
        toJSON: vi.fn().mockReturnValue({
          endpoint: 'https://push.example.com/sub-new',
          keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
        }),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const originalAtob = window.atob
      window.atob = vi.fn().mockReturnValue('fake-binary-data')

      // Simuler une erreur de sauvegarde en base
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.upsert = vi.fn().mockReturnValue(chain)
      chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
        Promise.resolve(resolve({ data: null, error: { message: 'DB save error' } }))
      )
      mockFrom.mockImplementation(() => chain)

      const result = await subscribeToPush('user-123')
      // savePushSubscription throws, caught by try/catch => return null
      expect(result).toBeNull()

      window.atob = originalAtob
    })
  })

  // ------------------------------------------
  // unsubscribeFromPush
  // ------------------------------------------
  describe('unsubscribeFromPush', () => {
    it('retourne true quand il n y a pas de subscription active (deja desabonne)', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await unsubscribeFromPush('user-123')
      expect(result).toBe(true)
    })

    it('supprime la subscription de la base et desabonne avec succes', async () => {
      const mockUnsubscribe = vi.fn().mockResolvedValue(true)
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub1',
        unsubscribe: mockUnsubscribe,
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      mockSupabaseQuery({ data: null, error: null })

      const result = await unsubscribeFromPush('user-123')

      expect(result).toBe(true)
      expect(mockUnsubscribe).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
    })

    it('retourne false quand le desabonnement echoue', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub1',
        unsubscribe: vi.fn().mockRejectedValue(new Error('Unsubscribe failed')),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      mockSupabaseQuery({ data: null, error: null })

      const result = await unsubscribeFromPush('user-123')
      expect(result).toBe(false)
    })

    it('retourne false quand la suppression en base echoue et le unsubscribe rejette', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub1',
        unsubscribe: vi.fn().mockRejectedValue(new Error('Error')),
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      mockSupabaseQuery({ data: null, error: { message: 'DB error' } })

      const result = await unsubscribeFromPush('user-123')
      expect(result).toBe(false)
    })
  })

  // ------------------------------------------
  // isPushSubscribed
  // ------------------------------------------
  describe('isPushSubscribed', () => {
    it('retourne true quand une subscription est active', async () => {
      const mockSubscription = {
        endpoint: 'https://push.example.com/sub1',
      }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await isPushSubscribed()
      expect(result).toBe(true)
    })

    it('retourne false quand aucune subscription n est active', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })

    it('retourne false quand serviceWorker n est pas disponible', async () => {
      const saved = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete navigator.serviceWorker

      const result = await isPushSubscribed()
      expect(result).toBe(false)

      if (saved) Object.defineProperty(navigator, 'serviceWorker', saved)
    })
  })

  // ------------------------------------------
  // getPushState
  // ------------------------------------------
  describe('getPushState', () => {
    it('retourne l etat complet quand tout est supporte et abonne', async () => {
      const mockSubscription = { endpoint: 'https://push.example.com/sub1' }

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(mockSubscription),
            },
          }),
        },
        writable: true,
        configurable: true,
      })
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'granted'

      const state = await getPushState()

      expect(state).toEqual({
        supported: true,
        vapidConfigured: true, // VAPID charge depuis .env
        permission: 'granted',
        subscribed: true,
      })
    })

    it('retourne supported false quand le navigateur ne supporte pas push', async () => {
      const savedSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete navigator.serviceWorker
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'default'

      const state = await getPushState()

      expect(state.supported).toBe(false)
      expect(state.subscribed).toBe(false)
      expect(state.permission).toBe('default')

      if (savedSW) Object.defineProperty(navigator, 'serviceWorker', savedSW)
    })

    it('retourne subscribed false quand il n y a pas de subscription', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })
      ;(window.Notification as unknown as Record<string, unknown>).permission = 'denied'

      const state = await getPushState()

      expect(state).toEqual({
        supported: true,
        vapidConfigured: true, // VAPID charge depuis .env
        permission: 'denied',
        subscribed: false,
      })
    })

    it('retourne permission denied quand Notification n est pas disponible', async () => {
      const savedNotif = Object.getOwnPropertyDescriptor(window, 'Notification')
      // @ts-expect-error -- delete pour retirer la clé de l'objet (in operator)
      delete window.Notification

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        writable: true,
        configurable: true,
      })

      const state = await getPushState()

      expect(state.permission).toBe('denied')
      // supported est false aussi car 'Notification' in window est false
      expect(state.supported).toBe(false)

      if (savedNotif) Object.defineProperty(window, 'Notification', savedNotif)
    })
  })
})
