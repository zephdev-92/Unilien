/**
 * Service de stockage et d'historique des bulletins de paie
 *
 * Responsabilités :
 *  - Upload du PDF dans Supabase Storage (bucket "payslips")
 *  - Sauvegarde de l'enregistrement en DB (table payslips)
 *  - Récupération de l'historique
 *  - Génération d'URL signées pour le téléchargement
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { sanitizeFileName } from '@/lib/sanitize'
import type { Payslip } from '@/types'
import type { PayslipDbRow } from '@/types/database'

// ─── Bucket ──────────────────────────────────────────────────────────────────
const BUCKET = 'payslips'

// Durée de validité des URL signées (1 heure)
const SIGNED_URL_TTL_SECONDS = 3600

// Limites upload bulletin externe (PDF reçu de l'URSSAF)
export const PAYSLIP_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const PAYSLIP_ACCEPTED_MIME_TYPES = ['application/pdf'] as const

// ─── Helpers privés ──────────────────────────────────────────────────────────

function mapFromDb(row: PayslipDbRow): Payslip {
  return {
    id: row.id,
    employerId: row.employer_id,
    employeeId: row.employee_id,
    contractId: row.contract_id,
    year: row.year,
    month: row.month,
    periodLabel: row.period_label,
    grossPay: row.gross_pay,
    netPay: row.net_pay,
    totalHours: row.total_hours,
    pasRate: row.pas_rate,
    isExemptPatronalSS: row.is_exempt_patronal_ss,
    storagePath: row.storage_path,
    storageUrl: row.storage_url,
    generatedAt: new Date(row.generated_at),
    createdAt: new Date(row.created_at),
  }
}

// ─── Publics ─────────────────────────────────────────────────────────────────

/**
 * Génère une URL signée valable SIGNED_URL_TTL_SECONDS secondes.
 */
export async function getPayslipSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    logger.error('Erreur génération URL signée bulletin:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Récupère l'historique des bulletins d'un employé (sa propre vue).
 * Protégé par la policy RLS `payslips_employee_select`.
 */
export async function getPayslipsForEmployee(employeeId: string): Promise<Payslip[]> {
  const { data, error } = await supabase
    .from('payslips')
    .select('id, employer_id, employee_id, contract_id, year, month, period_label, gross_pay, net_pay, total_hours, pas_rate, is_exempt_patronal_ss, storage_path, storage_url, generated_at, created_at')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    logger.error('Erreur récupération bulletins employé:', error)
    return []
  }

  return (data || []).map((row) => mapFromDb(row as PayslipDbRow))
}

/**
 * Récupère l'historique des bulletins d'un employeur.
 * Si employeeId est fourni, filtre par employé.
 */
export async function getPayslipsHistory(
  employerId: string,
  employeeId?: string
): Promise<Payslip[]> {
  let query = supabase
    .from('payslips')
    .select('id, employer_id, employee_id, contract_id, year, month, period_label, gross_pay, net_pay, total_hours, pas_rate, is_exempt_patronal_ss, storage_path, storage_url, generated_at, created_at')
    .eq('employer_id', employerId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (employeeId) {
    query = query.eq('employee_id', employeeId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Erreur récupération historique bulletins:', error)
    return []
  }

  return (data || []).map((row) => mapFromDb(row as PayslipDbRow))
}

/**
 * Supprime un enregistrement de bulletin (et son PDF dans Storage si présent).
 */
export async function deletePayslipRecord(payslipId: string): Promise<void> {
  // Récupérer le storage_path avant suppression
  const { data } = await supabase
    .from('payslips')
    .select('storage_path')
    .eq('id', payslipId)
    .single()

  const storagePath = (data as PayslipDbRow | null)?.storage_path

  // Supprimer l'enregistrement DB
  const { error } = await supabase
    .from('payslips')
    .delete()
    .eq('id', payslipId)

  if (error) {
    logger.error('Erreur suppression bulletin:', error)
    return
  }

  // Supprimer le PDF dans Storage si présent
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath])

    if (storageError) {
      logger.error('Erreur suppression PDF storage:', storageError)
    }
  }
}

// ─── Upload bulletin externe (URSSAF) ─────────────────────────────────────────

export interface ValidatePayslipFileResult {
  valid: boolean
  error?: string
}

/**
 * Valide un fichier de bulletin avant upload : type MIME PDF + taille ≤ 5 MB.
 */
export function validatePayslipFile(file: File): ValidatePayslipFileResult {
  if (!PAYSLIP_ACCEPTED_MIME_TYPES.includes(file.type as typeof PAYSLIP_ACCEPTED_MIME_TYPES[number])) {
    return { valid: false, error: 'Le fichier doit être un PDF.' }
  }
  if (file.size === 0) {
    return { valid: false, error: 'Le fichier est vide.' }
  }
  if (file.size > PAYSLIP_MAX_FILE_SIZE) {
    return { valid: false, error: 'Le fichier dépasse 5 Mo.' }
  }
  return { valid: true }
}

/**
 * Résout le contract_id du contrat d'emploi actif pour un couple
 * (employeur, employé). Retourne null si aucun contrat actif ou plus d'un
 * (cas non géré sans sélection explicite).
 */
async function resolveActiveEmploymentContractId(
  employerId: string,
  employeeId: string
): Promise<{ contractId: string | null; error?: string }> {
  const { data, error } = await supabase
    .from('contracts')
    .select('id')
    .eq('employer_id', employerId)
    .eq('employee_id', employeeId)
    .eq('contract_category', 'employment')
    .eq('status', 'active')

  if (error) {
    logger.error('Erreur résolution contrat actif:', error)
    return { contractId: null, error: 'Impossible de déterminer le contrat actif.' }
  }

  if (!data || data.length === 0) {
    return { contractId: null, error: 'Aucun contrat d\'emploi actif pour cet employé.' }
  }

  if (data.length > 1) {
    return { contractId: null, error: 'Plusieurs contrats actifs trouvés. Sélection explicite requise.' }
  }

  return { contractId: data[0].id as string }
}

export interface UploadExternalPayslipParams {
  employerId: string
  employeeId: string
  year: number
  month: number
  file: File
  /** Si fourni, court-circuite la résolution automatique. */
  contractId?: string
}

export interface UploadExternalPayslipResult {
  success: boolean
  payslip?: Payslip
  error?: string
}

/**
 * Upload un bulletin officiel (PDF URSSAF) et enregistre la ligne en DB.
 * Les colonnes calculées (gross_pay, net_pay, total_hours, period_label)
 * sont laissées à null — elles ne sont pas extraites du PDF.
 *
 * Upsert idempotent sur (employee_id, contract_id, year, month) :
 * uploader à nouveau remplace le fichier et met à jour la ligne.
 */
export async function uploadExternalPayslip(
  params: UploadExternalPayslipParams
): Promise<UploadExternalPayslipResult> {
  const { employerId, employeeId, year, month, file } = params

  if (month < 1 || month > 12) {
    return { success: false, error: 'Mois invalide.' }
  }

  const validation = validatePayslipFile(file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  let contractId = params.contractId
  if (!contractId) {
    const resolved = await resolveActiveEmploymentContractId(employerId, employeeId)
    if (!resolved.contractId) {
      return { success: false, error: resolved.error }
    }
    contractId = resolved.contractId
  }

  const safeName = sanitizeFileName(file.name || 'bulletin.pdf')
  const path = `${employerId}/${employeeId}/${year}/${String(month).padStart(2, '0')}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    logger.error('Erreur upload bulletin externe:', uploadError)
    return { success: false, error: 'Échec de l\'upload du fichier.' }
  }

  const { data, error } = await supabase
    .from('payslips')
    .upsert(
      {
        employer_id: employerId,
        employee_id: employeeId,
        contract_id: contractId,
        year,
        month,
        storage_path: path,
        storage_url: null,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'employee_id,contract_id,year,month' }
    )
    .select()
    .single()

  if (error || !data) {
    logger.error('Erreur sauvegarde bulletin uploadé:', error)
    return { success: false, error: 'Échec de l\'enregistrement du bulletin.' }
  }

  return { success: true, payslip: mapFromDb(data as PayslipDbRow) }
}
