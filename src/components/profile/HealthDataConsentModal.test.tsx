import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { HealthDataConsentModal } from './HealthDataConsentModal'

describe('HealthDataConsentModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConsent = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConsent.mockResolvedValue(true)
  })

  function renderModal(isOpen = true) {
    return renderWithProviders(
      <HealthDataConsentModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onConsent={mockOnConsent}
      />
    )
  }

  it('renders modal with RGPD information when open', () => {
    renderModal()

    expect(screen.getByText('Consentement — Données de santé')).toBeInTheDocument()
    expect(screen.getByText(/Article 9 du RGPD — Données sensibles/)).toBeInTheDocument()
    expect(screen.getByText(/En donnant votre consentement/)).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    renderModal(false)

    expect(screen.queryByText('Consentement — Données de santé')).not.toBeInTheDocument()
  })

  it('disables confirm button when checkbox is not checked', () => {
    renderModal()

    const confirmButton = screen.getByRole('button', { name: /confirmer mon consentement/i })
    expect(confirmButton).toBeDisabled()
  })

  it('enables confirm button after checking consent checkbox', async () => {
    const user = userEvent.setup()
    renderModal()

    const checkbox = screen.getByRole('checkbox', { name: /accepter le consentement/i })
    await user.click(checkbox)

    const confirmButton = screen.getByRole('button', { name: /confirmer mon consentement/i })
    expect(confirmButton).not.toBeDisabled()
  })

  it('calls onConsent and onClose on confirm', async () => {
    const user = userEvent.setup()
    renderModal()

    const checkbox = screen.getByRole('checkbox', { name: /accepter le consentement/i })
    await user.click(checkbox)

    const confirmButton = screen.getByRole('button', { name: /confirmer mon consentement/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConsent).toHaveBeenCalledOnce()
      expect(mockOnClose).toHaveBeenCalledOnce()
    })
  })

  it('does not close when consent fails', async () => {
    mockOnConsent.mockResolvedValue(false)
    const user = userEvent.setup()
    renderModal()

    const checkbox = screen.getByRole('checkbox', { name: /accepter le consentement/i })
    await user.click(checkbox)

    const confirmButton = screen.getByRole('button', { name: /confirmer mon consentement/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockOnConsent).toHaveBeenCalledOnce()
    })

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    renderModal()

    const cancelButton = screen.getByRole('button', { name: /annuler/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('displays HDS disclaimer', () => {
    renderModal()

    expect(screen.getByText(/Hébergeur de Données de Santé/)).toBeInTheDocument()
  })

  it('mentions right to withdraw consent', () => {
    renderModal()

    expect(screen.getByText(/retirer votre consentement/)).toBeInTheDocument()
  })
})
