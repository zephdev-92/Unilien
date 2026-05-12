import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getUnreadCountForUser } from '@/services/liaisonService'
import { logger } from '@/lib/logger'

/**
 * Compteur global de messages non lus pour l'utilisateur courant
 * (toutes conversations confondues). Fetch initial + subscription
 * realtime aux INSERT / UPDATE sur liaison_messages — recompte à
 * chaque event pour rester synchro avec le marquage côté serveur.
 */
export function useLiaisonUnreadCount(userId: string | undefined): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function refresh() {
      try {
        const n = await getUnreadCountForUser(userId!)
        if (!cancelled) setCount(n)
      } catch (err) {
        logger.error('useLiaisonUnreadCount refresh failed:', err)
      }
    }

    refresh()

    const channel = supabase
      .channel(`liaison-unread-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'liaison_messages' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'liaison_messages' },
        () => refresh(),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  return count
}
