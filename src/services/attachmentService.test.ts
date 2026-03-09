import { describe, it, expect } from 'vitest'
import {
  validateAttachmentFile,
  validateAttachmentFiles,
  formatSize,
} from './attachmentService'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeFile(name: string, size: number, type: string): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('attachmentService', () => {
  describe('validateAttachmentFile', () => {
    it('accepte un fichier JPEG valide', () => {
      const file = makeFile('photo.jpg', 1024, 'image/jpeg')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('accepte un fichier PNG valide', () => {
      const file = makeFile('capture.png', 2048, 'image/png')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('accepte un fichier PDF valide', () => {
      const file = makeFile('document.pdf', 1024, 'application/pdf')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('accepte un fichier WebP valide', () => {
      const file = makeFile('image.webp', 1024, 'image/webp')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('accepte un fichier GIF valide', () => {
      const file = makeFile('animation.gif', 1024, 'image/gif')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('accepte un fichier DOCX valide', () => {
      const file = makeFile('rapport.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })

    it('rejette un format non supporté', () => {
      const file = makeFile('malware.exe', 1024, 'application/x-executable')
      const result = validateAttachmentFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Format non supporté')
    })

    it('rejette un fichier MP3', () => {
      const file = makeFile('music.mp3', 1024, 'audio/mpeg')
      expect(validateAttachmentFile(file).valid).toBe(false)
    })

    it('rejette un fichier trop volumineux (> 5 Mo)', () => {
      const file = makeFile('gros.jpg', 6 * 1024 * 1024, 'image/jpeg')
      const result = validateAttachmentFile(file)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('trop volumineux')
    })

    it('accepte un fichier de exactement 5 Mo', () => {
      const file = makeFile('limite.png', 5 * 1024 * 1024, 'image/png')
      expect(validateAttachmentFile(file)).toEqual({ valid: true })
    })
  })

  describe('validateAttachmentFiles', () => {
    it('accepte une liste valide de fichiers', () => {
      const files = [
        makeFile('a.jpg', 1024, 'image/jpeg'),
        makeFile('b.pdf', 2048, 'application/pdf'),
      ]
      expect(validateAttachmentFiles(files)).toEqual({ valid: true })
    })

    it('rejette si plus de 5 fichiers', () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        makeFile(`file${i}.jpg`, 1024, 'image/jpeg')
      )
      const result = validateAttachmentFiles(files)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Maximum 5')
    })

    it('rejette si un fichier a un format invalide', () => {
      const files = [
        makeFile('ok.jpg', 1024, 'image/jpeg'),
        makeFile('bad.zip', 1024, 'application/zip'),
      ]
      const result = validateAttachmentFiles(files)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Format non supporté')
    })

    it('rejette si un fichier est trop gros', () => {
      const files = [
        makeFile('ok.jpg', 1024, 'image/jpeg'),
        makeFile('gros.png', 6 * 1024 * 1024, 'image/png'),
      ]
      const result = validateAttachmentFiles(files)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('trop volumineux')
    })

    it('accepte exactement 5 fichiers', () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        makeFile(`file${i}.jpg`, 1024, 'image/jpeg')
      )
      expect(validateAttachmentFiles(files)).toEqual({ valid: true })
    })
  })

  describe('formatSize', () => {
    it('affiche en octets pour < 1 Ko', () => {
      expect(formatSize(500)).toBe('500 o')
    })

    it('affiche en Ko pour < 1 Mo', () => {
      expect(formatSize(1024)).toBe('1 Ko')
      expect(formatSize(512 * 1024)).toBe('512 Ko')
    })

    it('affiche en Mo pour >= 1 Mo', () => {
      expect(formatSize(1024 * 1024)).toBe('1.0 Mo')
      expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 Mo')
    })
  })
})
