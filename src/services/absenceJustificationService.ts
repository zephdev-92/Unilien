import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Absence } from '@/types'

const JUSTIFICATIONS_BUCKET = 'justifications'
const MAX_JUSTIFICATION_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_JUSTIFICATION_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]

export interface JustificationUploadResult {
  url: string
}

export interface JustificationUploadOptions {
  /** Type d'absence pour personnaliser le nom du fichier */
  absenceType?: Absence['absenceType']
  /** Date de début de l'absence (utilisée pour le nom du fichier) */
  startDate?: Date
}

/**
 * Génère un nom de fichier significatif pour le justificatif.
 * Pour les arrêts maladie : arret_YYYY_MM_DD.ext
 * Pour les autres types : justificatif_YYYY_MM_DD.ext
 */
function generateJustificationFileName(
  employeeId: string,
  fileExt: string,
  options?: JustificationUploadOptions
): string {
  const date = options?.startDate || new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}_${month}_${day}`

  const baseName = options?.absenceType === 'sick'
    ? `arret_${dateStr}`
    : `justificatif_${dateStr}`

  return `${employeeId}/${baseName}_${Date.now()}.${fileExt}`
}

/**
 * Valide un fichier justificatif (format + taille).
 */
export function validateJustificationFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_JUSTIFICATION_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Format non supporté. Utilisez PDF, JPG, PNG ou WebP.',
    }
  }

  if (file.size > MAX_JUSTIFICATION_SIZE) {
    return {
      valid: false,
      error: 'Le fichier est trop volumineux. Taille maximum : 5 Mo.',
    }
  }

  return { valid: true }
}

/**
 * Upload un justificatif et retourne l'URL publique.
 */
export async function uploadJustification(
  employeeId: string,
  file: File,
  options?: JustificationUploadOptions
): Promise<JustificationUploadResult> {
  const validation = validateJustificationFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  const fileName = generateJustificationFileName(employeeId, fileExt, options)

  const { error: uploadError } = await supabase.storage
    .from(JUSTIFICATIONS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    logger.error('Erreur upload justificatif:', uploadError)
    throw new Error("Erreur lors de l'upload du justificatif.")
  }

  const { data: urlData } = supabase.storage
    .from(JUSTIFICATIONS_BUCKET)
    .getPublicUrl(fileName)

  return { url: urlData.publicUrl }
}
