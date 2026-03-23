import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export interface NudgeData {
  type: 'unvalidated-shifts' | 'missing-payslips'
  count: number
  names?: string
  weekLabel?: string
  monthLabel?: string
}

/**
 * Compte les shifts complétés mais non validés par l'employeur cette semaine
 */
export async function getUnvalidatedShiftsCount(
  employerId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (!contracts || contracts.length === 0) return 0

  const contractIds = contracts.map((c) => c.id)

  const { count, error } = await supabase
    .from('shifts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'completed')
    .eq('validated_by_employer', false)
    .gte('date', weekStart.toISOString().split('T')[0])
    .lte('date', weekEnd.toISOString().split('T')[0])
    .in('contract_id', contractIds)

  if (error) {
    logger.error('Erreur comptage shifts non validés:', error)
    return 0
  }

  return count ?? 0
}

/**
 * Retourne les noms des employés sans bulletin de paie pour le mois courant
 */
export async function getMissingPayslipEmployees(
  employerId: string,
  year: number,
  month: number
): Promise<{ count: number; names: string }> {
  const { data: activeContracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, employees!inner(profiles!inner(first_name, last_name))')
    .eq('employer_id', employerId)
    .eq('status', 'active')

  if (contractsError || !activeContracts || activeContracts.length === 0) {
    return { count: 0, names: '' }
  }

  const contractIds = activeContracts.map((c) => c.id)

  const { data: existingPayslips, error: payslipsError } = await supabase
    .from('payslips')
    .select('contract_id')
    .in('contract_id', contractIds)
    .eq('year', year)
    .eq('month', month)

  if (payslipsError) {
    logger.error('Erreur récupération payslips:', payslipsError)
    return { count: 0, names: '' }
  }

  const payslipContractIds = new Set(existingPayslips?.map((p) => p.contract_id) ?? [])
  const missing = activeContracts.filter((c) => !payslipContractIds.has(c.id))

  if (missing.length === 0) {
    return { count: 0, names: '' }
  }

  const nameList = missing
    .slice(0, 2)
    .map((c) => {
      const emp = c.employees as unknown as { profiles: { first_name: string; last_name: string } }
      return `${emp.profiles.first_name} ${emp.profiles.last_name.charAt(0)}.`
    })
  const names = nameList.join(', ') + (missing.length > 2 ? ` +${missing.length - 2}` : '')

  return { count: missing.length, names }
}
