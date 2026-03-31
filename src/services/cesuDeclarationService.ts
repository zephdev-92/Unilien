/**
 * Service de persistance des déclarations CESU mensuelles
 *
 * Responsabilités :
 *  - Sauvegarde (upsert) d'une déclaration en DB (table cesu_declarations)
 *  - Upload du PDF dans Supabase Storage (bucket "cesu-declarations")
 *  - Récupération de l'historique des déclarations
 *  - Génération d'URL signées pour le téléchargement PDF
 *  - Suppression d'une déclaration (DB + Storage)
 */

import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { CesuDeclarationRecord } from '@/types'
import type { CesuDeclarationDbRow } from '@/types/database'
import type { MonthlyDeclarationData } from '@/lib/export/types'

const BUCKET = 'cesu-declarations'
const SIGNED_URL_TTL_SECONDS = 3600

// ─── Sérialisation JSONB ────────────────────────────────────────────────────

/**
 * Sérialise MonthlyDeclarationData pour stockage JSONB.
 * Convertit les objets Date en strings ISO.
 */
function serializeDeclarationData(data: MonthlyDeclarationData): Record<string, unknown> {
  return {
    ...data,
    generatedAt: data.generatedAt instanceof Date
      ? data.generatedAt.toISOString()
      : data.generatedAt,
    employees: data.employees.map((emp) => ({
      ...emp,
      shiftsDetails: emp.shiftsDetails.map((shift) => ({
        ...shift,
        date: shift.date instanceof Date
          ? shift.date.toISOString()
          : shift.date,
      })),
    })),
  }
}

/**
 * Désérialise le JSONB en MonthlyDeclarationData.
 * Reconstruit les objets Date depuis les strings ISO.
 */
function deserializeDeclarationData(raw: Record<string, unknown>): MonthlyDeclarationData {
  const data = raw as unknown as MonthlyDeclarationData
  return {
    ...data,
    generatedAt: new Date(data.generatedAt as unknown as string),
    employees: (data.employees || []).map((emp) => ({
      ...emp,
      shiftsDetails: (emp.shiftsDetails || []).map((shift) => ({
        ...shift,
        date: new Date(shift.date as unknown as string),
      })),
    })),
  }
}

// ─── Helpers Storage ────────────────────────────────────────────────────────

/**
 * Convertit un data URI base64 en Blob binaire.
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

/**
 * Upload le PDF d'une déclaration CESU dans Supabase Storage.
 * Chemin : <employerId>/<year>/<month>/cesu_YYYY_MM.pdf
 */
export async function uploadCesuPdf(
  employerId: string,
  year: number,
  month: number,
  pdfDataUri: string
): Promise<string | null> {
  const blob = dataUriToBlob(pdfDataUri)
  const monthStr = String(month).padStart(2, '0')
  const path = `${employerId}/${year}/${monthStr}/cesu_${year}_${monthStr}.pdf`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (error) {
    logger.error('Erreur upload PDF CESU:', error)
    return null
  }

  return path
}

/**
 * Génère une URL signée valable 1 heure pour télécharger le PDF.
 */
export async function getCesuPdfSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    logger.error('Erreur génération URL signée CESU:', error)
    return null
  }

  return data.signedUrl
}

// ─── Mapper DB → App ────────────────────────────────────────────────────────

function mapFromDb(row: CesuDeclarationDbRow): CesuDeclarationRecord {
  return {
    id: row.id,
    employerId: row.employer_id,
    year: row.year,
    month: row.month,
    periodLabel: row.period_label,
    totalEmployees: row.total_employees,
    totalHours: row.total_hours,
    totalGrossPay: row.total_gross_pay,
    declarationData: deserializeDeclarationData(row.declaration_data),
    storagePath: row.storage_path,
    generatedAt: new Date(row.generated_at),
    createdAt: new Date(row.created_at),
  }
}

// ─── CRUD ───────────────────────────────────────────────────────────────────

/**
 * Sauvegarde (upsert) une déclaration CESU mensuelle.
 * Si storagePath est fourni, il est associé à l'enregistrement.
 */
export async function saveCesuDeclaration(
  employerId: string,
  data: MonthlyDeclarationData,
  storagePath?: string | null
): Promise<CesuDeclarationRecord | null> {
  const row: Record<string, unknown> = {
    employer_id: employerId,
    year: data.year,
    month: data.month,
    period_label: data.periodLabel,
    total_employees: data.totalEmployees,
    total_hours: data.totalHours,
    total_gross_pay: data.totalGrossPay,
    declaration_data: serializeDeclarationData(data),
    generated_at: data.generatedAt instanceof Date
      ? data.generatedAt.toISOString()
      : data.generatedAt,
  }

  if (storagePath !== undefined) {
    row.storage_path = storagePath
  }

  const { data: result, error } = await supabase
    .from('cesu_declarations')
    .upsert(row, {
      onConflict: 'employer_id,year,month',
    })
    .select()
    .single()

  if (error) {
    logger.error('Erreur sauvegarde déclaration CESU:', error)
    return null
  }

  return mapFromDb(result as CesuDeclarationDbRow)
}

/**
 * Récupère toutes les déclarations CESU d'un employeur,
 * triées par année/mois décroissant.
 */
export async function getCesuDeclarations(
  employerId: string
): Promise<CesuDeclarationRecord[]> {
  const { data, error } = await supabase
    .from('cesu_declarations')
    .select('*')
    .eq('employer_id', employerId)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    logger.error('Erreur récupération déclarations CESU:', error)
    return []
  }

  return (data || []).map((row) => mapFromDb(row as CesuDeclarationDbRow))
}

/**
 * Supprime une déclaration CESU par son ID (DB + PDF dans Storage).
 */
export async function deleteCesuDeclaration(
  declarationId: string
): Promise<boolean> {
  // Récupérer le storage_path avant suppression
  const { data } = await supabase
    .from('cesu_declarations')
    .select('storage_path')
    .eq('id', declarationId)
    .single()

  const storagePath = (data as CesuDeclarationDbRow | null)?.storage_path

  const { error } = await supabase
    .from('cesu_declarations')
    .delete()
    .eq('id', declarationId)

  if (error) {
    logger.error('Erreur suppression déclaration CESU:', error)
    return false
  }

  // Supprimer le PDF dans Storage si présent
  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath])

    if (storageError) {
      logger.error('Erreur suppression PDF CESU storage:', storageError)
    }
  }

  return true
}
