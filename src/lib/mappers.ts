import type { ProfileDbRow } from '@/types/database'
import type { Profile, UserRole } from '@/types'

/**
 * Convertit une ligne profil DB (snake_case) en objet Profile app (camelCase)
 */
export function mapProfileFromDb(data: ProfileDbRow, emailOverride?: string): Profile {
  return {
    id: data.id,
    role: data.role,
    firstName: data.first_name,
    lastName: data.last_name,
    email: emailOverride || data.email || '',
    phone: data.phone || undefined,
    avatarUrl: data.avatar_url || undefined,
    accessibilitySettings: data.accessibility_settings || {},
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

/**
 * Crée un profil par défaut à partir des métadonnées auth Supabase
 * (utilisé quand le profil DB n'existe pas encore)
 */
export function createDefaultProfile(
  userId: string,
  email: string,
  userMeta?: Record<string, unknown>
): Profile {
  return {
    id: userId,
    role: (userMeta?.role as UserRole) || 'employer',
    firstName: (userMeta?.first_name as string) || 'Utilisateur',
    lastName: (userMeta?.last_name as string) || '',
    email,
    phone: undefined,
    avatarUrl: undefined,
    accessibilitySettings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
