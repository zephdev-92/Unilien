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
import type { Payslip } from '@/types'
import type { PayslipDbRow } from '@/types/database'
import type { PayslipData } from '@/lib/export/types'

// ─── Bucket ──────────────────────────────────────────────────────────────────
const BUCKET = 'payslips'

// Durée de validité des URL signées (1 heure)
const SIGNED_URL_TTL_SECONDS = 3600

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

/**
 * Convertit un dataURI base64 (sortie jsPDF) en Blob binaire.
 */
function dataUriToBlob(dataUri: string): Blob {
  const [header, base64] = dataUri.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

// ─── Publics ─────────────────────────────────────────────────────────────────

/**
 * Upload le PDF d'un bulletin dans Supabase Storage.
 *
 * Chemin : `<employerId>/<employeeId>/<year>/<month>/<filename>.pdf`
 * Retourne le storage_path relatif, ou null en cas d'erreur.
 */
export async function uploadPayslipPdf(
  employerId: string,
  employeeId: string,
  year: number,
  month: number,
  filename: string,
  pdfDataUri: string
): Promise<string | null> {
  const blob = dataUriToBlob(pdfDataUri)
  const path = `${employerId}/${employeeId}/${year}/${String(month).padStart(2, '0')}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    logger.error('Erreur upload bulletin PDF:', error)
    return null
  }

  return path
}

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

// ─── Enregistrements DB ───────────────────────────────────────────────────────

export interface SavePayslipParams {
  data: PayslipData
  contractId: string
  storagePath: string | null
  storageUrl: string | null
}

/**
 * Insère (ou met à jour si déjà existant) un enregistrement de bulletin en DB.
 * Upsert basé sur la contrainte unique (employee_id, contract_id, year, month).
 */
export async function savePayslipRecord(params: SavePayslipParams): Promise<Payslip | null> {
  const { data: payslip, storagePath, storageUrl, contractId } = params
  const { cotisations } = payslip

  const row = {
    employer_id: payslip.employerId,
    employee_id: payslip.employeeId,
    contract_id: contractId,
    year: payslip.year,
    month: payslip.month,
    period_label: payslip.periodLabel,
    gross_pay: payslip.totalGrossPay,
    net_pay: cotisations.netAPayer,
    total_hours: payslip.totalHours,
    pas_rate: cotisations.pasRate,
    is_exempt_patronal_ss: payslip.isExemptPatronalSS,
    storage_path: storagePath,
    storage_url: storageUrl,
    generated_at: payslip.generatedAt.toISOString(),
  }

  const { data, error } = await supabase
    .from('payslips')
    .upsert(row, {
      onConflict: 'employee_id,contract_id,year,month',
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur sauvegarde bulletin:', error)
    return null
  }

  return mapFromDb(data as PayslipDbRow)
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
    .select('*')
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
