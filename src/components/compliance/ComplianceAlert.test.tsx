import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { ComplianceAlert } from './ComplianceAlert'
import type { ComplianceResult } from '@/types'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<ComplianceResult> = {}): ComplianceResult {
  return { valid: true, errors: [], warnings: [], ...overrides }
}

const resultOk = makeResult()

const resultWarning = makeResult({
  valid: true,
  warnings: [{ code: 'W1', message: 'Repos quotidien insuffisant', rule: 'Art. 137.2 IDCC 3239' }],
})

const resultWarnings2 = makeResult({
  valid: true,
  warnings: [
    { code: 'W1', message: 'Premier avertissement', rule: 'Art. 1' },
    { code: 'W2', message: 'Second avertissement', rule: 'Art. 2' },
  ],
})

const resultError = makeResult({
  valid: false,
  errors: [{ code: 'E1', message: 'Dépasse 10h quotidiennes', rule: 'Art. 10 IDCC 3239', blocking: true }],
})

const resultErrors2 = makeResult({
  valid: false,
  errors: [
    { code: 'E1', message: 'Première erreur', rule: 'Art. 1', blocking: true },
    { code: 'E2', message: 'Deuxième erreur', rule: 'Art. 2', blocking: true },
  ],
})

const resultBoth = makeResult({
  valid: false,
  errors: [{ code: 'E1', message: 'Erreur critique', rule: 'Art. 1', blocking: true }],
  warnings: [{ code: 'W1', message: 'Avertissement mineur', rule: 'Art. 2' }],
})

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ComplianceAlert', () => {
  describe('Résultat conforme — retourne null', () => {
    it('ne rend rien si valid=true et aucun avertissement', () => {
      const { container } = renderWithProviders(<ComplianceAlert result={resultOk} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Bloc d\'erreurs', () => {
    it('affiche le titre "Intervention non conforme"', () => {
      renderWithProviders(<ComplianceAlert result={resultError} />)
      expect(screen.getByText('Intervention non conforme')).toBeInTheDocument()
    })

    it('affiche le message d\'erreur', () => {
      renderWithProviders(<ComplianceAlert result={resultError} />)
      expect(screen.getByText('Dépasse 10h quotidiennes')).toBeInTheDocument()
    })

    it('affiche "1 erreur" (singulier) pour 1 erreur', () => {
      renderWithProviders(<ComplianceAlert result={resultError} />)
      expect(screen.getByText('1 erreur')).toBeInTheDocument()
    })

    it('affiche "2 erreurs" (pluriel) pour 2 erreurs', () => {
      renderWithProviders(<ComplianceAlert result={resultErrors2} />)
      expect(screen.getByText('2 erreurs')).toBeInTheDocument()
    })

    it('affiche tous les messages d\'erreur', () => {
      renderWithProviders(<ComplianceAlert result={resultErrors2} />)
      expect(screen.getByText('Première erreur')).toBeInTheDocument()
      expect(screen.getByText('Deuxième erreur')).toBeInTheDocument()
    })

    it('possède role="alert" pour accessibilité', () => {
      renderWithProviders(<ComplianceAlert result={resultError} />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('affiche "Cliquez pour voir la règle applicable" dans le déclencheur', () => {
      renderWithProviders(<ComplianceAlert result={resultError} />)
      expect(screen.getByText(/Cliquez pour voir la règle applicable/)).toBeInTheDocument()
    })
  })

  describe('Bloc d\'avertissements', () => {
    it('affiche le titre "Attention"', () => {
      renderWithProviders(<ComplianceAlert result={resultWarning} />)
      expect(screen.getByText('Attention')).toBeInTheDocument()
    })

    it('affiche le message d\'avertissement', () => {
      renderWithProviders(<ComplianceAlert result={resultWarning} />)
      expect(screen.getByText('Repos quotidien insuffisant')).toBeInTheDocument()
    })

    it('affiche "1 avertissement" (singulier)', () => {
      renderWithProviders(<ComplianceAlert result={resultWarning} />)
      expect(screen.getByText('1 avertissement')).toBeInTheDocument()
    })

    it('affiche "2 avertissements" (pluriel)', () => {
      renderWithProviders(<ComplianceAlert result={resultWarnings2} />)
      expect(screen.getByText('2 avertissements')).toBeInTheDocument()
    })

    it('affiche tous les messages d\'avertissement', () => {
      renderWithProviders(<ComplianceAlert result={resultWarnings2} />)
      expect(screen.getByText('Premier avertissement')).toBeInTheDocument()
      expect(screen.getByText('Second avertissement')).toBeInTheDocument()
    })
  })

  describe('Bouton "Continuer quand même"', () => {
    it('n\'affiche pas le bouton si onDismiss absent', () => {
      renderWithProviders(<ComplianceAlert result={resultWarning} />)
      expect(screen.queryByRole('button', { name: /continuer quand même/i })).not.toBeInTheDocument()
    })

    it('affiche le bouton si onDismiss fourni', () => {
      const onDismiss = vi.fn()
      renderWithProviders(<ComplianceAlert result={resultWarning} onDismiss={onDismiss} />)
      expect(screen.getByRole('button', { name: /continuer quand même/i })).toBeInTheDocument()
    })

    it('appelle onDismiss au clic', async () => {
      const user = userEvent.setup()
      const onDismiss = vi.fn()
      renderWithProviders(<ComplianceAlert result={resultWarning} onDismiss={onDismiss} />)
      await user.click(screen.getByRole('button', { name: /continuer quand même/i }))
      expect(onDismiss).toHaveBeenCalledOnce()
    })

    it('n\'affiche pas le bouton si le résultat a uniquement des erreurs (pas d\'avertissements)', () => {
      renderWithProviders(<ComplianceAlert result={resultError} onDismiss={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /continuer quand même/i })).not.toBeInTheDocument()
    })
  })

  describe('Résultat mixte (erreurs + avertissements)', () => {
    it('affiche les deux blocs simultanément', () => {
      renderWithProviders(<ComplianceAlert result={resultBoth} />)
      expect(screen.getByText('Intervention non conforme')).toBeInTheDocument()
      expect(screen.getByText('Attention')).toBeInTheDocument()
    })

    it('affiche les messages des deux blocs', () => {
      renderWithProviders(<ComplianceAlert result={resultBoth} />)
      expect(screen.getByText('Erreur critique')).toBeInTheDocument()
      expect(screen.getByText('Avertissement mineur')).toBeInTheDocument()
    })
  })
})
