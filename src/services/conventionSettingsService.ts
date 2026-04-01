/**
 * Service CRUD pour les paramètres de convention collective (règles + majorations).
 * Table : convention_settings (une ligne par employeur).
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { ConventionSettingsDbRow } from '@/types/database'

export interface ConventionSettings {
  ruleBreak: boolean
  ruleDailyMax: boolean
  ruleOvertime: boolean
  ruleNight: boolean
  majDimanche: number
  majFerie: number
  majNuit: number
  majSupp: number
}

export const CONVENTION_DEFAULTS: ConventionSettings = {
  ruleBreak: true,
  ruleDailyMax: true,
  ruleOvertime: true,
  ruleNight: true,
  majDimanche: 30,
  majFerie: 60,
  majNuit: 25,
  majSupp: 25,
}

function mapFromDb(row: ConventionSettingsDbRow): ConventionSettings {
  return {
    ruleBreak: row.rule_break,
    ruleDailyMax: row.rule_daily_max,
    ruleOvertime: row.rule_overtime,
    ruleNight: row.rule_night,
    majDimanche: row.maj_dimanche,
    majFerie: row.maj_ferie,
    majNuit: row.maj_nuit,
    majSupp: row.maj_supp,
  }
}

export async function getConventionSettings(profileId: string): Promise<ConventionSettings> {
  const { data, error } = await supabase
    .from('convention_settings')
    .select('profile_id, rule_break, rule_daily_max, rule_overtime, rule_night, maj_dimanche, maj_ferie, maj_nuit, maj_supp, created_at, updated_at')
    .eq('profile_id', profileId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return { ...CONVENTION_DEFAULTS }
    logger.error('Erreur chargement convention settings:', error)
    return { ...CONVENTION_DEFAULTS }
  }
  return mapFromDb(data as ConventionSettingsDbRow)
}

export async function upsertConventionSettings(
  profileId: string,
  settings: ConventionSettings,
): Promise<void> {
  const { error } = await supabase
    .from('convention_settings')
    .upsert({
      profile_id: profileId,
      rule_break: settings.ruleBreak,
      rule_daily_max: settings.ruleDailyMax,
      rule_overtime: settings.ruleOvertime,
      rule_night: settings.ruleNight,
      maj_dimanche: settings.majDimanche,
      maj_ferie: settings.majFerie,
      maj_nuit: settings.majNuit,
      maj_supp: settings.majSupp,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' })

  if (error) {
    logger.error('Erreur sauvegarde convention settings:', error)
    throw error
  }
}
