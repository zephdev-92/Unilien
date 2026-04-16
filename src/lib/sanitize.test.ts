import { describe, it, expect } from 'vitest'
import { sanitizeText, sanitizeBasicHtml, escapeHtml, cleanUserInput, sanitizeFileExtension, sanitizeFileName } from './sanitize'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('sanitizeText', () => {
  it('retourne une chaîne vide pour null', () => {
    expect(sanitizeText(null)).toBe('')
  })

  it('retourne une chaîne vide pour undefined', () => {
    expect(sanitizeText(undefined)).toBe('')
  })

  it('retourne une chaîne vide pour une chaîne vide', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('retourne le texte brut sans modification', () => {
    expect(sanitizeText('Bonjour monde')).toBe('Bonjour monde')
  })

  it('supprime les balises HTML (b → texte seul)', () => {
    expect(sanitizeText('<b>Texte</b>')).toBe('Texte')
  })

  it('supprime les balises script', () => {
    const result = sanitizeText('<script>alert("xss")</script>Texte')
    expect(result).not.toContain('<script>')
    expect(result).toContain('Texte')
  })

  it('conserve les caractères accentués', () => {
    expect(sanitizeText('Ça va bien')).toBe('Ça va bien')
  })
})

describe('sanitizeBasicHtml', () => {
  it('retourne une chaîne vide pour null', () => {
    expect(sanitizeBasicHtml(null)).toBe('')
  })

  it('retourne une chaîne vide pour undefined', () => {
    expect(sanitizeBasicHtml(undefined)).toBe('')
  })

  it('conserve le contenu textuel avec balise <b>', () => {
    const result = sanitizeBasicHtml('<b>Gras</b>')
    expect(result).toContain('Gras')
  })

  it('supprime les scripts même en mode formatage basique', () => {
    const result = sanitizeBasicHtml('<script>alert("xss")</script>Texte')
    expect(result).not.toContain('<script>')
  })

  it('conserve le texte brut sans modification', () => {
    expect(sanitizeBasicHtml('Texte simple')).toBe('Texte simple')
  })
})

describe('escapeHtml', () => {
  it('retourne une chaîne vide pour null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('retourne une chaîne vide pour undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('retourne une chaîne vide pour une chaîne vide', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('échappe & en &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('échappe < en &lt;', () => {
    expect(escapeHtml('<div>')).toContain('&lt;')
  })

  it('échappe > en &gt;', () => {
    expect(escapeHtml('<div>')).toContain('&gt;')
  })

  it('échappe " en &quot;', () => {
    expect(escapeHtml('"value"')).toBe('&quot;value&quot;')
  })

  it("échappe ' en &#039;", () => {
    expect(escapeHtml("l'apostrophe")).toBe("l&#039;apostrophe")
  })

  it('retourne le texte intact si pas de caractères spéciaux', () => {
    expect(escapeHtml('Bonjour monde')).toBe('Bonjour monde')
  })

  it('échappe tous les caractères spéciaux à la fois', () => {
    const result = escapeHtml('<b class="test">It\'s a & b</b>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&quot;')
    expect(result).toContain('&#039;')
  })
})

describe('cleanUserInput', () => {
  it('retourne une chaîne vide pour null', () => {
    expect(cleanUserInput(null)).toBe('')
  })

  it('retourne une chaîne vide pour undefined', () => {
    expect(cleanUserInput(undefined)).toBe('')
  })

  it('supprime les espaces en début et en fin', () => {
    expect(cleanUserInput('  texte  ')).toBe('texte')
  })

  it('normalise les espaces multiples internes', () => {
    expect(cleanUserInput('texte  avec   espaces')).toBe('texte avec espaces')
  })

  it('supprime les balises HTML et normalise les espaces', () => {
    const result = cleanUserInput('<b>texte</b>')
    expect(result).not.toContain('<b>')
    expect(result).toContain('texte')
  })

  it('retourne le texte propre sans modification si déjà propre', () => {
    expect(cleanUserInput('Texte propre')).toBe('Texte propre')
  })
})

describe('sanitizeFileExtension', () => {
  it('conserve une extension valide', () => {
    expect(sanitizeFileExtension('pdf')).toBe('pdf')
  })

  it('convertit en minuscules', () => {
    expect(sanitizeFileExtension('PDF')).toBe('pdf')
  })

  it('supprime les caractères spéciaux (path traversal)', () => {
    expect(sanitizeFileExtension('pdf../../x')).toBe('pdfx')
  })

  it('supprime les slashes', () => {
    expect(sanitizeFileExtension('pdf/../../etc/passwd')).toBe('pdfetcpass')
  })

  it('retourne "bin" pour une extension vide', () => {
    expect(sanitizeFileExtension('')).toBe('bin')
  })

  it('retourne "bin" si que des caractères spéciaux', () => {
    expect(sanitizeFileExtension('../../')).toBe('bin')
  })

  it('tronque les extensions trop longues', () => {
    expect(sanitizeFileExtension('a'.repeat(50))).toHaveLength(10)
  })
})

describe('sanitizeFileName', () => {
  it('conserve un nom valide', () => {
    expect(sanitizeFileName('bulletin_curie_2026_01.pdf')).toBe('bulletin_curie_2026_01.pdf')
  })

  it('remplace les caractères spéciaux par des underscores', () => {
    expect(sanitizeFileName('fichier<script>.pdf')).toBe('fichier_script_.pdf')
  })

  it('bloque le path traversal (double points)', () => {
    const result = sanitizeFileName('../../etc/passwd')
    expect(result).not.toContain('..')
    expect(result).not.toContain('/')
  })

  it('remplace les espaces par des underscores', () => {
    expect(sanitizeFileName('mon fichier.pdf')).toBe('mon_fichier.pdf')
  })

  it('décode les noms URL-encodés', () => {
    expect(sanitizeFileName('fichier%20test.pdf')).toBe('fichier_test.pdf')
  })

  it('tronque les noms trop longs à 200 caractères', () => {
    const longName = 'a'.repeat(250) + '.pdf'
    expect(sanitizeFileName(longName).length).toBeLessThanOrEqual(200)
  })

  it('retourne un nom par défaut si le résultat est vide', () => {
    expect(sanitizeFileName('')).toMatch(/^file_\d+$/)
  })
})
