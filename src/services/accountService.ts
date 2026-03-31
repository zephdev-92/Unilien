import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

/**
 * Supprime toutes les données métier de l'utilisateur (shifts, contrats, absences, messages)
 * tout en conservant le compte et le profil.
 */
export async function deleteAllUserData(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_data')

  if (error) {
    logger.error('Erreur suppression données:', error)
    throw new Error('Erreur lors de la suppression des données.')
  }
}

/**
 * Supprime le compte utilisateur et toutes ses données (RGPD droit à l'effacement).
 * Après appel, l'utilisateur est déconnecté et ne peut plus se reconnecter.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account')

  if (error) {
    logger.error('Erreur suppression compte:', error)
    throw new Error('Erreur lors de la suppression du compte.')
  }

  // Déconnexion locale (le compte auth n'existe plus)
  await supabase.auth.signOut()
}
