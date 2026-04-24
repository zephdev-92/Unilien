import { supabase } from './client'

const AVATAR_BUCKET = 'avatars'

/**
 * Résout une valeur `avatar_url` stockée en DB vers une URL publique utilisable côté client.
 *
 * Depuis la migration 053, la colonne `profiles.avatar_url` stocke un **path Storage**
 * (ex: `<profileId>/<timestamp>.jpg`), plus une URL complète. Cette fonction génère
 * l'URL publique à la volée via `getPublicUrl()`.
 *
 * Rétrocompat : si la valeur commence par `http`, elle est renvoyée telle quelle (sécurité
 * face à d'éventuelles lignes qui auraient échappé à la migration).
 */
export function resolveAvatarUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value.startsWith('http')) return value
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(value)
  return data.publicUrl || undefined
}
