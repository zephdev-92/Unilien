import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/helpers'
import { OnboardingEmptyState } from './OnboardingEmptyState'

describe('OnboardingEmptyState', () => {
  const icon = <circle cx="12" cy="12" r="10" />

  it('affiche le titre et la description', () => {
    renderWithProviders(
      <OnboardingEmptyState
        icon={icon}
        title="Aucune entrée"
        description="Vos données apparaîtront ici."
      />,
    )
    expect(screen.getByText('Aucune entrée')).toBeInTheDocument()
    expect(screen.getByText('Vos données apparaîtront ici.')).toBeInTheDocument()
  })

  it('rend les actions quand fournies', () => {
    renderWithProviders(
      <OnboardingEmptyState
        icon={icon}
        title="Aucune entrée"
        description="..."
        actions={<button type="button">Démarrer</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeInTheDocument()
  })

  it("n'affiche pas de bloc actions si aucune action fournie", () => {
    renderWithProviders(
      <OnboardingEmptyState icon={icon} title="Vide" description="..." />,
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('marque le svg comme décoratif', () => {
    const { container } = renderWithProviders(
      <OnboardingEmptyState icon={icon} title="Vide" description="..." />,
    )
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })
})
