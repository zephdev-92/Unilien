import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

type AuditAction = 'read' | 'create' | 'update' | 'delete' | 'grant_consent' | 'revoke_consent'

interface AuditEntry {
  action: AuditAction
  resource: string
  resourceId?: string
  fields?: string[]
}

/**
 * Enregistre une entrée d'audit pour traçabilité RGPD.
 * Ne bloque jamais le flux principal — les erreurs sont loggées silencieusement.
 * Ne stocke JAMAIS de valeurs, uniquement les noms des champs accédés.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId ?? null,
      fields_accessed: entry.fields ?? null,
    })
  } catch (err) {
    // L'audit ne doit jamais bloquer le flux principal
    logger.warn('Audit log failed:', err)
  }
}
