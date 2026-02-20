import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/helpers'
import { PasswordToggleButton } from './PasswordToggleButton'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PasswordToggleButton', () => {
  describe('État visible=false (mot de passe masqué)', () => {
    it('affiche le bouton "Afficher le mot de passe"', () => {
      renderWithProviders(<PasswordToggleButton visible={false} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: /afficher le mot de passe/i })).toBeInTheDocument()
    })

    it('rend l\'icône EyeIcon (aria-hidden svg)', () => {
      const { container } = renderWithProviders(
        <PasswordToggleButton visible={false} onClick={vi.fn()} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('État visible=true (mot de passe visible)', () => {
    it('affiche le bouton "Masquer le mot de passe"', () => {
      renderWithProviders(<PasswordToggleButton visible={true} onClick={vi.fn()} />)
      expect(screen.getByRole('button', { name: /masquer le mot de passe/i })).toBeInTheDocument()
    })

    it('rend l\'icône EyeOffIcon (aria-hidden svg)', () => {
      const { container } = renderWithProviders(
        <PasswordToggleButton visible={true} onClick={vi.fn()} />
      )
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('appelle onClick au clic', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      renderWithProviders(<PasswordToggleButton visible={false} onClick={onClick} />)
      await user.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledOnce()
    })
  })
})
