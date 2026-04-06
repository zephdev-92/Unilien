import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deleteAllUserData, deleteAccount } from './accountService'

// ============================================================
// MOCKS
// ============================================================

const mockRpc = vi.fn()
const mockSignOut = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================
// deleteAllUserData
// ============================================================

describe('deleteAllUserData', () => {
  it('appelle la RPC delete_own_data', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await deleteAllUserData()

    expect(mockRpc).toHaveBeenCalledWith('delete_own_data')
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('ne déconnecte pas l utilisateur après suppression des données', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await deleteAllUserData()

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('throw une erreur si la RPC échoue', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } })

    await expect(deleteAllUserData()).rejects.toThrow(
      'Erreur lors de la suppression des données.'
    )
  })

  it('log l erreur Supabase en cas d échec', async () => {
    const { logger } = await import('@/lib/logger')
    const supabaseError = { message: 'permission denied', code: '42501' }
    mockRpc.mockResolvedValue({ error: supabaseError })

    await expect(deleteAllUserData()).rejects.toThrow()

    expect(logger.error).toHaveBeenCalledWith(
      'Erreur suppression données:',
      supabaseError
    )
  })
})

// ============================================================
// deleteAccount
// ============================================================

describe('deleteAccount', () => {
  it('appelle la RPC delete_own_account puis signOut', async () => {
    mockRpc.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })

    await deleteAccount()

    expect(mockRpc).toHaveBeenCalledWith('delete_own_account')
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('appelle signOut après la RPC (ordre garanti)', async () => {
    const callOrder: string[] = []
    mockRpc.mockImplementation(() => {
      callOrder.push('rpc')
      return Promise.resolve({ error: null })
    })
    mockSignOut.mockImplementation(() => {
      callOrder.push('signOut')
      return Promise.resolve({ error: null })
    })

    await deleteAccount()

    expect(callOrder).toEqual(['rpc', 'signOut'])
  })

  it('throw une erreur si la RPC échoue', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } })

    await expect(deleteAccount()).rejects.toThrow(
      'Erreur lors de la suppression du compte.'
    )
  })

  it('ne déconnecte pas si la RPC échoue', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'RPC failed' } })

    await expect(deleteAccount()).rejects.toThrow()

    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('log l erreur Supabase en cas d échec RPC', async () => {
    const { logger } = await import('@/lib/logger')
    const supabaseError = { message: 'function not found', code: '42883' }
    mockRpc.mockResolvedValue({ error: supabaseError })

    await expect(deleteAccount()).rejects.toThrow()

    expect(logger.error).toHaveBeenCalledWith(
      'Erreur suppression compte:',
      supabaseError
    )
  })
})
