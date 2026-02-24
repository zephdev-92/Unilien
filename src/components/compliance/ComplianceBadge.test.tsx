import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { ComplianceBadge, ComplianceIcon } from './ComplianceBadge'
import type { ComplianceResult } from '@/types'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<ComplianceResult> = {}): ComplianceResult {
  return { valid: true, errors: [], warnings: [], ...overrides }
}

const resultOk = makeResult()

const resultWarning1 = makeResult({
  valid: true,
  warnings: [{ code: 'W1', message: 'Attention repos', rule: 'Art. 1' }],
})

const resultWarnings2 = makeResult({
  valid: true,
  warnings: [
    { code: 'W1', message: 'Alerte 1', rule: 'Art. 1' },
    { code: 'W2', message: 'Alerte 2', rule: 'Art. 2' },
  ],
})

const resultError1 = makeResult({
  valid: false,
  errors: [{ code: 'E1', message: 'Dépasse 10h', rule: 'Art. 10', blocking: true }],
})

const resultErrors2 = makeResult({
  valid: false,
  errors: [
    { code: 'E1', message: 'Erreur 1', rule: 'Art. 1', blocking: true },
    { code: 'E2', message: 'Erreur 2', rule: 'Art. 2', blocking: true },
  ],
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ComplianceBadge', () => {
  describe('Résultat conforme (pas d\'erreur ni avertissement)', () => {
    it('affiche le label "Conforme"', () => {
      renderWithProviders(<ComplianceBadge result={resultOk} />)
      expect(screen.getByText('Conforme')).toBeInTheDocument()
    })

    it('n\'affiche pas de compteur pour un résultat propre', () => {
      renderWithProviders(<ComplianceBadge result={resultOk} showCount />)
      // Pas de parenthèse avec un nombre
      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
    })
  })

  describe('Résultat avec avertissements', () => {
    it('affiche le label "Attention"', () => {
      renderWithProviders(<ComplianceBadge result={resultWarning1} />)
      expect(screen.getByText('Attention')).toBeInTheDocument()
    })

    it('affiche le compteur (1) si showCount=true et 1 avertissement', () => {
      renderWithProviders(<ComplianceBadge result={resultWarning1} showCount />)
      expect(screen.getByText('(1)')).toBeInTheDocument()
    })

    it('affiche le compteur (2) si showCount=true et 2 avertissements', () => {
      renderWithProviders(<ComplianceBadge result={resultWarnings2} showCount />)
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })

    it('n\'affiche pas le compteur si showCount=false', () => {
      renderWithProviders(<ComplianceBadge result={resultWarning1} showCount={false} />)
      expect(screen.queryByText('(1)')).not.toBeInTheDocument()
    })
  })

  describe('Résultat avec erreurs', () => {
    it('affiche le label "Non conforme"', () => {
      renderWithProviders(<ComplianceBadge result={resultError1} />)
      expect(screen.getByText('Non conforme')).toBeInTheDocument()
    })

    it('affiche le compteur (1) pour 1 erreur', () => {
      renderWithProviders(<ComplianceBadge result={resultError1} showCount />)
      expect(screen.getByText('(1)')).toBeInTheDocument()
    })

    it('affiche le compteur (2) pour 2 erreurs', () => {
      renderWithProviders(<ComplianceBadge result={resultErrors2} showCount />)
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })

    it('les erreurs ont priorité sur les avertissements', () => {
      const mixed = makeResult({
        valid: false,
        errors: [{ code: 'E1', message: 'Erreur', rule: 'Art.1', blocking: true }],
        warnings: [{ code: 'W1', message: 'Warning', rule: 'Art.2' }],
      })
      renderWithProviders(<ComplianceBadge result={mixed} />)
      expect(screen.getByText('Non conforme')).toBeInTheDocument()
      expect(screen.queryByText('Attention')).not.toBeInTheDocument()
    })
  })

  describe('showCount par défaut', () => {
    it('affiche le compteur par défaut (showCount=true implicite)', () => {
      renderWithProviders(<ComplianceBadge result={resultError1} />)
      expect(screen.getByText('(1)')).toBeInTheDocument()
    })
  })
})

describe('ComplianceIcon', () => {
  it('affiche l\'icône ✓ pour un résultat conforme', () => {
    renderWithProviders(<ComplianceIcon result={resultOk} />)
    // L'icône est le texte content du span
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('affiche l\'aria-label "Conforme" pour un résultat conforme', () => {
    renderWithProviders(<ComplianceIcon result={resultOk} />)
    expect(screen.getByLabelText('Conforme')).toBeInTheDocument()
  })

  it('affiche l\'icône ⚠️ pour un résultat avec avertissements', () => {
    renderWithProviders(<ComplianceIcon result={resultWarning1} />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('affiche l\'aria-label "Attention requise" pour un avertissement', () => {
    renderWithProviders(<ComplianceIcon result={resultWarning1} />)
    expect(screen.getByLabelText('Attention requise')).toBeInTheDocument()
  })

  it('affiche l\'icône 🚫 pour un résultat avec erreurs', () => {
    renderWithProviders(<ComplianceIcon result={resultError1} />)
    expect(screen.getByText('🚫')).toBeInTheDocument()
  })

  it('affiche l\'aria-label "Non conforme" pour une erreur', () => {
    renderWithProviders(<ComplianceIcon result={resultError1} />)
    expect(screen.getByLabelText('Non conforme')).toBeInTheDocument()
  })
})
