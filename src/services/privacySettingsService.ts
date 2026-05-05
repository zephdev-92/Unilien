/**
 * Service CRUD pour les préférences de confidentialité (analytics).
 * Table : privacy_settings (une ligne par utilisateur).
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { PrivacySettingsDbRow } from '@/types/database'

export interface PrivacySettings {
  analyticsEnabled: boolean
}

export const PRIVACY_DEFAULTS: PrivacySettings = {
  analyticsEnabled: true,
}

function mapFromDb(row: PrivacySettingsDbRow): PrivacySettings {
  return {
    analyticsEnabled: row.analytics_enabled,
  }
}

export async function getPrivacySettings(profileId: string): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from('privacy_settings')
    .select('profile_id, analytics_enabled, created_at, updated_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    logger.error('Erreur chargement privacy settings:', error)
    return { ...PRIVACY_DEFAULTS }
  }
  if (!data) return { ...PRIVACY_DEFAULTS }
  return mapFromDb(data as PrivacySettingsDbRow)
}

export async function upsertPrivacySettings(
  profileId: string,
  settings: PrivacySettings,
): Promise<void> {
  const { error } = await supabase
    .from('privacy_settings')
    .upsert(
      {
        profile_id: profileId,
        analytics_enabled: settings.analyticsEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id' },
    )

  if (error) {
    logger.error('Erreur sauvegarde privacy settings:', error)
    throw error
  }
}
