import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  updateProfile,
  validateAvatarFile,
  uploadAvatar,
  deleteAvatar,
  getEmployer,
  upsertEmployer,
  getEmployee,
  upsertEmployee,
} from './profileService'

// Mock du client Supabase
const mockUpdate = vi.fn()
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockList = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockSelect = vi.fn()
const mockUpsert = vi.fn()
const mockEq = vi.fn()
const mockMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
      select: mockSelect,
      upsert: mockUpsert,
    })),
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        remove: mockRemove,
        list: mockList,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}))

describe('profileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Configuration par défaut
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockResolvedValue({ error: null })
    mockSelect.mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }) })
    mockUpsert.mockResolvedValue({ error: null })
  })

  describe('updateProfile', () => {
    it('devrait mettre à jour le profil avec succès', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateProfile('profile-123', {
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '0612345678',
        })
      ).resolves.not.toThrow()
    })

    it('devrait gérer les mises à jour partielles', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateProfile('profile-123', { firstName: 'Marie' })
      ).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la mise à jour échoue', async () => {
      mockEq.mockResolvedValue({
        error: { message: 'Update failed' },
      })

      await expect(
        updateProfile('profile-123', { firstName: 'Jean' })
      ).rejects.toThrow('Update failed')
    })

    it('devrait accepter un téléphone null', async () => {
      mockEq.mockResolvedValue({ error: null })

      await expect(
        updateProfile('profile-123', { phone: undefined })
      ).resolves.not.toThrow()
    })
  })

  describe('validateAvatarFile', () => {
    it('devrait accepter un fichier JPEG valide', () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 }) // 500KB

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('devrait accepter un fichier PNG valide', () => {
      const file = new File(['content'], 'avatar.png', { type: 'image/png' })
      Object.defineProperty(file, 'size', { value: 1 * 1024 * 1024 }) // 1MB

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(true)
    })

    it('devrait accepter un fichier GIF valide', () => {
      const file = new File(['content'], 'avatar.gif', { type: 'image/gif' })
      Object.defineProperty(file, 'size', { value: 100 * 1024 })

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(true)
    })

    it('devrait accepter un fichier WebP valide', () => {
      const file = new File(['content'], 'avatar.webp', { type: 'image/webp' })
      Object.defineProperty(file, 'size', { value: 100 * 1024 })

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(true)
    })

    it('devrait rejeter un format non supporté', () => {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      })

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Format non supporté')
    })

    it('devrait rejeter un fichier SVG', () => {
      const file = new File(['<svg></svg>'], 'avatar.svg', {
        type: 'image/svg+xml',
      })

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(false)
    })

    it('devrait rejeter un fichier trop volumineux (> 2MB)', () => {
      const file = new File(['content'], 'big-avatar.jpg', {
        type: 'image/jpeg',
      })
      Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }) // 3MB

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('trop volumineux')
      expect(result.error).toContain('2 Mo')
    })

    it('devrait accepter un fichier exactement à 2MB', () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }) // Exactement 2MB

      const result = validateAvatarFile(file)

      expect(result.valid).toBe(true)
    })
  })

  describe('uploadAvatar', () => {
    it('devrait uploader un avatar avec succès', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      mockList.mockResolvedValue({ data: [], error: null })
      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/avatars/profile-123/123.jpg' },
      })
      mockEq.mockResolvedValue({ error: null })

      const result = await uploadAvatar('profile-123', file)

      expect(result.url).toContain('avatars')
      expect(mockUpload).toHaveBeenCalled()
    })

    it('devrait lancer une erreur pour un fichier invalide', async () => {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      })

      await expect(uploadAvatar('profile-123', file)).rejects.toThrow(
        'Format non supporté'
      )
    })

    it('devrait supprimer les anciens avatars avant upload', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      mockList.mockResolvedValue({
        data: [{ name: 'old-avatar.jpg' }],
        error: null,
      })
      mockRemove.mockResolvedValue({ error: null })
      mockUpload.mockResolvedValue({ error: null })
      mockGetPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/new.jpg' },
      })
      mockEq.mockResolvedValue({ error: null })

      await uploadAvatar('profile-123', file)

      expect(mockRemove).toHaveBeenCalled()
    })

    it('devrait lancer une erreur si l\'upload échoue', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' })
      Object.defineProperty(file, 'size', { value: 500 * 1024 })

      mockList.mockResolvedValue({ data: [], error: null })
      mockUpload.mockResolvedValue({ error: { message: 'Upload failed' } })

      await expect(uploadAvatar('profile-123', file)).rejects.toThrow(
        'Erreur lors de l\'upload'
      )
    })
  })

  describe('deleteAvatar', () => {
    it('devrait supprimer l\'avatar avec succès', async () => {
      mockList.mockResolvedValue({
        data: [{ name: 'avatar.jpg' }],
        error: null,
      })
      mockRemove.mockResolvedValue({ error: null })
      mockEq.mockResolvedValue({ error: null })

      await expect(deleteAvatar('profile-123')).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si la mise à jour du profil échoue', async () => {
      mockList.mockResolvedValue({ data: [], error: null })
      mockEq.mockResolvedValue({ error: { message: 'Update failed' } })

      await expect(deleteAvatar('profile-123')).rejects.toThrow(
        'Erreur lors de la suppression'
      )
    })

    it('devrait continuer même si la suppression du storage échoue', async () => {
      mockList.mockRejectedValue(new Error('Storage error'))
      mockEq.mockResolvedValue({ error: null })

      await expect(deleteAvatar('profile-123')).resolves.not.toThrow()
    })
  })

  describe('getEmployer', () => {
    it('devrait récupérer les données employeur', async () => {
      const mockEmployerData = {
        profile_id: 'profile-123',
        address: { street: '1 rue Test', city: 'Paris', postalCode: '75001', country: 'France' },
        handicap_type: 'moteur',
        handicap_name: 'Tétraplégie',
        specific_needs: 'Aide quotidienne',
        cesu_number: '12345',
        pch_beneficiary: true,
        pch_monthly_amount: 1500,
        emergency_contacts: [{ name: 'Contact 1', phone: '0612345678', relationship: 'Famille' }],
      }
      mockMaybeSingle.mockResolvedValue({ data: mockEmployerData, error: null })

      const result = await getEmployer('profile-123')

      expect(result).not.toBeNull()
      expect(result?.profileId).toBe('profile-123')
      expect(result?.handicapType).toBe('moteur')
      expect(result?.pchBeneficiary).toBe(true)
      expect(result?.emergencyContacts).toHaveLength(1)
    })

    it('devrait retourner null si l\'employeur n\'existe pas', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      const result = await getEmployer('profile-123')

      expect(result).toBeNull()
    })

    it('devrait retourner null en cas d\'erreur', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const result = await getEmployer('profile-123')

      expect(result).toBeNull()
    })

    it('devrait gérer les champs optionnels manquants', async () => {
      const mockEmployerData = {
        profile_id: 'profile-123',
        address: {},
        handicap_type: null,
        handicap_name: null,
        specific_needs: null,
        cesu_number: null,
        pch_beneficiary: false,
        pch_monthly_amount: null,
        emergency_contacts: null,
      }
      mockMaybeSingle.mockResolvedValue({ data: mockEmployerData, error: null })

      const result = await getEmployer('profile-123')

      expect(result?.handicapType).toBeUndefined()
      expect(result?.cesuNumber).toBeUndefined()
      expect(result?.pchMonthlyAmount).toBeUndefined()
      expect(result?.emergencyContacts).toEqual([])
    })
  })

  describe('upsertEmployer', () => {
    it('devrait créer/mettre à jour les données employeur', async () => {
      mockUpsert.mockResolvedValue({ error: null })

      await expect(
        upsertEmployer('profile-123', {
          address: { street: '1 rue Test', city: 'Paris', postalCode: '75001', country: 'France' },
          handicapType: 'moteur',
          pchBeneficiary: true,
        })
      ).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si l\'upsert échoue', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'Upsert failed' } })

      await expect(
        upsertEmployer('profile-123', { pchBeneficiary: true })
      ).rejects.toThrow('Upsert failed')
    })

    it('devrait utiliser les valeurs par défaut', async () => {
      mockUpsert.mockResolvedValue({ error: null })

      await expect(upsertEmployer('profile-123', {})).resolves.not.toThrow()
    })
  })

  describe('getEmployee', () => {
    it('devrait récupérer les données employé', async () => {
      const mockEmployeeData = {
        profile_id: 'profile-123',
        qualifications: ['DEAVS', 'Premiers secours'],
        languages: ['Français', 'Anglais'],
        max_distance_km: 20,
        availability_template: {
          monday: [{ startTime: '09:00', endTime: '17:00' }],
        },
      }
      mockMaybeSingle.mockResolvedValue({ data: mockEmployeeData, error: null })

      const result = await getEmployee('profile-123')

      expect(result).not.toBeNull()
      expect(result?.profileId).toBe('profile-123')
      expect(result?.qualifications).toContain('DEAVS')
      expect(result?.languages).toContain('Français')
      expect(result?.maxDistanceKm).toBe(20)
    })

    it('devrait retourner null si l\'employé n\'existe pas', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      const result = await getEmployee('profile-123')

      expect(result).toBeNull()
    })

    it('devrait gérer les tableaux vides', async () => {
      const mockEmployeeData = {
        profile_id: 'profile-123',
        qualifications: null,
        languages: null,
        max_distance_km: null,
        availability_template: {},
      }
      mockMaybeSingle.mockResolvedValue({ data: mockEmployeeData, error: null })

      const result = await getEmployee('profile-123')

      expect(result?.qualifications).toEqual([])
      expect(result?.languages).toEqual([])
      expect(result?.maxDistanceKm).toBeUndefined()
    })
  })

  describe('upsertEmployee', () => {
    it('devrait créer/mettre à jour les données employé', async () => {
      mockUpsert.mockResolvedValue({ error: null })

      await expect(
        upsertEmployee('profile-123', {
          qualifications: ['DEAVS'],
          languages: ['Français'],
          maxDistanceKm: 15,
        })
      ).resolves.not.toThrow()
    })

    it('devrait lancer une erreur si l\'upsert échoue', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'Upsert failed' } })

      await expect(
        upsertEmployee('profile-123', { qualifications: ['Test'] })
      ).rejects.toThrow('Upsert failed')
    })
  })
})
