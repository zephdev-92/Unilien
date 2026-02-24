import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { LeaveBalance } from '@/types'
import type { LeaveBalanceDbRow } from '@/types/database'
import {
  calculateAcquiredDays,
  calculateRemainingDays,
  getLeaveYearStartDate,
} from '@/lib/absence'

// ============================================
// GET LEAVE BALANCE
// ============================================

export async function getLeaveBalance(
  contractId: string,
  leaveYear: string
): Promise<LeaveBalance | null> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)
    .maybeSingle()

  if (error) {
    logger.error('Erreur récupération solde congés:', error)
    return null
  }

  if (!data) return null

  return mapLeaveBalanceFromDb(data)
}

// ============================================
// GET LEAVE BALANCES FOR EMPLOYEE
// ============================================

export async function getLeaveBalancesForEmployee(
  employeeId: string
): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .order('leave_year', { ascending: false })

  if (error) {
    logger.error('Erreur récupération soldes congés employé:', error)
    return []
  }

  return (data || []).map(mapLeaveBalanceFromDb)
}

// ============================================
// GET LEAVE BALANCES FOR EMPLOYER
// ============================================

export async function getLeaveBalancesForEmployer(
  employerId: string
): Promise<LeaveBalance[]> {
  const { data, error } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employer_id', employerId)
    .order('leave_year', { ascending: false })

  if (error) {
    logger.error('Erreur récupération soldes congés employeur:', error)
    return []
  }

  return (data || []).map(mapLeaveBalanceFromDb)
}

// ============================================
// INITIALIZE LEAVE BALANCE
// ============================================

export async function initializeLeaveBalance(
  contractId: string,
  employeeId: string,
  employerId: string,
  leaveYear: string,
  contract: { startDate: Date; weeklyHours: number }
): Promise<LeaveBalance | null> {
  const leaveYearStart = getLeaveYearStartDate(leaveYear)
  const acquired = calculateAcquiredDays(contract, leaveYearStart, new Date())

  const { data, error } = await supabase
    .from('leave_balances')
    .upsert({
      contract_id: contractId,
      employee_id: employeeId,
      employer_id: employerId,
      leave_year: leaveYear,
      acquired_days: acquired,
      taken_days: 0,
      adjustment_days: 0,
    }, { onConflict: 'contract_id,leave_year' })
    .select()
    .single()

  if (error) {
    logger.error('Erreur initialisation solde congés:', error)
    return null
  }

  return mapLeaveBalanceFromDb(data)
}

// ============================================
// INITIALIZE WITH MANUAL OVERRIDE (reprise historique)
// ============================================

export async function initializeLeaveBalanceWithOverride(
  contractId: string,
  employeeId: string,
  employerId: string,
  leaveYear: string,
  acquiredDays: number,
  takenDays: number
): Promise<LeaveBalance | null> {
  // Vérifier si un solde existe déjà (éviter écrasement silencieux)
  const { data: existing } = await supabase
    .from('leave_balances')
    .select('id')
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)
    .maybeSingle()

  if (existing) {
    logger.warn(
      'Solde congés déjà existant, reprise ignorée:',
      { contractId, leaveYear, existingId: existing.id }
    )
    return null
  }

  const { data, error } = await supabase
    .from('leave_balances')
    .insert({
      contract_id: contractId,
      employee_id: employeeId,
      employer_id: employerId,
      leave_year: leaveYear,
      acquired_days: acquiredDays,
      taken_days: takenDays,
      adjustment_days: 0,
      is_manual_init: true,
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur initialisation solde congés (reprise):', error)
    return null
  }

  return mapLeaveBalanceFromDb(data)
}

// ============================================
// UPDATE TAKEN DAYS
// ============================================

export async function addTakenDays(
  contractId: string,
  leaveYear: string,
  days: number
): Promise<void> {
  // Récupérer le solde actuel
  const { data: current, error: fetchError } = await supabase
    .from('leave_balances')
    .select('taken_days')
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)
    .single()

  if (fetchError || !current) {
    throw new Error('Solde de congés introuvable')
  }

  const { error } = await supabase
    .from('leave_balances')
    .update({
      taken_days: current.taken_days + days,
      updated_at: new Date().toISOString(),
    })
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)

  if (error) {
    logger.error('Erreur mise à jour jours pris:', error)
    throw new Error(error.message)
  }
}

// ============================================
// RESTORE TAKEN DAYS (annulation)
// ============================================

export async function restoreTakenDays(
  contractId: string,
  leaveYear: string,
  days: number
): Promise<void> {
  const { data: current, error: fetchError } = await supabase
    .from('leave_balances')
    .select('taken_days')
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)
    .single()

  if (fetchError || !current) {
    throw new Error('Solde de congés introuvable')
  }

  const { error } = await supabase
    .from('leave_balances')
    .update({
      taken_days: Math.max(0, current.taken_days - days),
      updated_at: new Date().toISOString(),
    })
    .eq('contract_id', contractId)
    .eq('leave_year', leaveYear)

  if (error) {
    logger.error('Erreur restauration jours pris:', error)
    throw new Error(error.message)
  }
}

// ============================================
// HELPER: MAP FROM DB
// ============================================

function mapLeaveBalanceFromDb(data: LeaveBalanceDbRow): LeaveBalance {
  const balance = {
    acquiredDays: Number(data.acquired_days),
    takenDays: Number(data.taken_days),
    adjustmentDays: Number(data.adjustment_days),
  }

  return {
    id: data.id,
    employeeId: data.employee_id,
    employerId: data.employer_id,
    contractId: data.contract_id,
    leaveYear: data.leave_year,
    acquiredDays: balance.acquiredDays,
    takenDays: balance.takenDays,
    adjustmentDays: balance.adjustmentDays,
    remainingDays: calculateRemainingDays(balance),
    isManualInit: data.is_manual_init ?? false,
  }
}
