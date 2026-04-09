import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import type { Attachment } from '@/types'

const ATTACHMENTS_BUCKET = 'liaison-attachments'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 Mo
const MAX_FILES_PER_MESSAGE = 5

const ALLOWED_TYPES: Record<string, Attachment['type']> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
}

/**
 * Valide un fichier avant upload.
 */
export function validateAttachmentFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES[file.type]) {
    return {
      valid: false,
      error: `Format non supporté : ${file.name}. Utilisez JPG, PNG, WebP, GIF, PDF ou DOCX.`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${file.name} est trop volumineux (${formatSize(file.size)}). Maximum : 5 Mo.`,
    }
  }

  return { valid: true }
}

/**
 * Valide un ensemble de fichiers.
 */
export function validateAttachmentFiles(files: File[]): { valid: boolean; error?: string } {
  if (files.length > MAX_FILES_PER_MESSAGE) {
    return {
      valid: false,
      error: `Maximum ${MAX_FILES_PER_MESSAGE} fichiers par message.`,
    }
  }

  for (const file of files) {
    const result = validateAttachmentFile(file)
    if (!result.valid) return result
  }

  return { valid: true }
}

/**
 * Upload un fichier et retourne les métadonnées Attachment.
 */
export async function uploadAttachment(
  conversationId: string,
  senderId: string,
  file: File
): Promise<Attachment> {
  const validation = validateAttachmentFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Sanitiser le nom de fichier (whitelist) pour prévenir le path traversal
  const rawName = (() => { try { return decodeURIComponent(file.name) } catch { return file.name } })()
  const ext = rawName.includes('.') ? rawName.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const base = rawName
    .replace(/\.[^.]+$/, '')          // retirer extension
    .replace(/[^a-zA-Z0-9_\- ]/g, '_') // whitelist : alphanum + _ - espace
    .replace(/\s+/g, '_')
    .slice(0, 100)
    || `file_${Date.now()}`
  const safeName = ext ? `${base}.${ext}` : base
  const fileName = `${conversationId}/${senderId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    logger.error('Erreur upload pièce jointe:', uploadError)
    throw new Error(`Erreur lors de l'upload de ${file.name}.`)
  }

  // URL signée (bucket privé) — expire après 1h
  const { data: urlData, error: signError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(fileName, 3600)

  if (signError || !urlData?.signedUrl) {
    logger.error('Erreur génération URL signée pièce jointe:', signError)
    throw new Error('Erreur lors de la génération du lien.')
  }

  return {
    id: crypto.randomUUID(),
    url: urlData.signedUrl,
    type: ALLOWED_TYPES[file.type] || 'document',
    name: file.name,
    size: file.size,
  }
}

/**
 * Upload plusieurs fichiers en parallèle.
 */
export async function uploadAttachments(
  conversationId: string,
  senderId: string,
  files: File[]
): Promise<Attachment[]> {
  const validation = validateAttachmentFiles(files)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  return Promise.all(
    files.map((file) => uploadAttachment(conversationId, senderId, file))
  )
}

/**
 * Formate une taille de fichier en unité lisible.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/**
 * Détermine le type d'un fichier pour l'affichage.
 */
export function getAttachmentType(file: File): Attachment['type'] {
  return ALLOWED_TYPES[file.type] || 'document'
}
