import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  getProfileName,
  createShiftReminderNotification,
} from '@/services/notificationService'

/**
 * Hook qui crée des rappels de notification pour les shifts des prochaines 24h.
 * S'exécute une seule fois au montage du Dashboard.
 * Vérifie si un rappel existe déjà pour chaque shift (via data->shiftId).
 */
export function useShiftReminders(userId: string | undefined, role: string | undefined) {
  const hasRun = useRef(false)

  useEffect(() => {
    if (!userId || !role || hasRun.current) return
    if (role !== 'employee') return // Seuls les auxiliaires reçoivent des rappels

    hasRun.current = true

    async function checkAndCreateReminders() {
      try {
        // 1. Récupérer les shifts des prochaines 24h
        const now = new Date()
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayStr = now.toISOString().split('T')[0]
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        const { data: shifts, error: shiftsError } = await supabase
          .from('shifts')
          .select(`
            id,
            date,
            start_time,
            contract_id,
            contract:contracts!inner(
              employer_id,
              employee_id
            )
          `)
          .eq('contract.employee_id', userId)
          .eq('status', 'planned')
          .gte('date', todayStr)
          .lte('date', tomorrowStr)

        if (shiftsError || !shifts || shifts.length === 0) return

        // 2. Vérifier quels rappels existent déjà
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('data')
          .eq('user_id', userId)
          .eq('type', 'shift_reminder')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

        const alreadyNotifiedShiftIds = new Set(
          (existingNotifs || [])
            .map((n) => (n.data as Record<string, unknown>)?.shiftId as string)
            .filter(Boolean)
        )

        // 3. Créer les rappels manquants
        for (const shift of shifts) {
          if (alreadyNotifiedShiftIds.has(shift.id)) continue

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const contract = shift.contract as any
          if (!contract) continue

          try {
            const employerName = await getProfileName(contract.employer_id)
            await createShiftReminderNotification(
              userId!,
              employerName,
              new Date(shift.date),
              shift.start_time,
              shift.id
            )
          } catch {
            // Silently skip individual failures
          }
        }
      } catch (err) {
        console.error('Erreur vérification rappels shifts:', err)
      }
    }

    checkAndCreateReminders()
  }, [userId, role])
}
