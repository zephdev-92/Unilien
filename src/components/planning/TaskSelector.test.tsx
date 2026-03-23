import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from '@/components/ui/provider'
import { TaskSelector } from './TaskSelector'
import { DEFAULT_TASKS, COURSES_PREFIX } from '@/lib/constants/taskDefaults'

// ─── Mocks ──────────────────────────────────────────────────────────

const mockSearchArticles = vi.fn()
const mockTrackArticle = vi.fn()

vi.mock('@/hooks/useInterventionSettings', () => ({
  useInterventionSettings: () => ({
    articleSuggestions: [],
    searchArticles: mockSearchArticles,
    trackArticle: mockTrackArticle,
    shoppingList: [],
  }),
  loadDefaultTasks: () => [],
  loadCustomTasks: () => [],
  loadShoppingList: () => [],
}))

// ─── Helpers ────────────────────────────────────────────────────────

function renderTaskSelector(props: Partial<React.ComponentProps<typeof TaskSelector>> = {}) {
  const defaultProps = {
    value: [] as string[],
    onChange: vi.fn(),
    ...props,
  }
  const result = render(
    <Provider>
      <TaskSelector {...defaultProps} />
    </Provider>,
  )
  return { ...result, onChange: defaultProps.onChange }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Rendu initial ──

describe('TaskSelector — rendu initial', () => {
  it('affiche le titre "Tâches prévues"', () => {
    renderTaskSelector()
    expect(screen.getByText('Tâches prévues')).toBeInTheDocument()
  })

  it('affiche toutes les tâches prédéfinies', () => {
    renderTaskSelector()
    for (const task of DEFAULT_TASKS) {
      expect(screen.getByText(task)).toBeInTheDocument()
    }
  })

  it('affiche le champ de recherche', () => {
    renderTaskSelector()
    expect(screen.getByPlaceholderText('Filtrer les tâches…')).toBeInTheDocument()
  })

  it('affiche la section tâches personnalisées', () => {
    renderTaskSelector()
    expect(screen.getByText('Tâches personnalisées')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ajouter une tâche…')).toBeInTheDocument()
  })

  it('n\'affiche pas le compteur quand rien n\'est sélectionné', () => {
    renderTaskSelector()
    // Le compteur "N tâche(s)" ne doit pas apparaître
    expect(screen.queryByText(/^\d+ tâche/)).toBeNull()
  })
})

// ── Sélection de tâches ──

describe('TaskSelector — sélection de tâches', () => {
  it('appelle onChange quand on clique sur une tâche', async () => {
    const { onChange } = renderTaskSelector()
    const aideAuLever = screen.getByText('Aide au lever')
    fireEvent.click(aideAuLever)

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining(['Aide au lever']),
    )
  })

  it('décoche une tâche déjà sélectionnée', () => {
    const { onChange } = renderTaskSelector({ value: ['Aide au lever', 'Courses'] })
    fireEvent.click(screen.getByText('Aide au lever'))

    expect(onChange).toHaveBeenCalledWith(
      expect.not.arrayContaining(['Aide au lever']),
    )
  })

  it('affiche le compteur de tâches sélectionnées', () => {
    renderTaskSelector({ value: ['Aide au lever', 'Courses'] })
    expect(screen.getByText(/2 tâches/)).toBeInTheDocument()
  })

  it('affiche le compteur avec articles quand Courses + articles', () => {
    renderTaskSelector({
      value: ['Courses', `${COURSES_PREFIX}Lait`],
    })
    // 1 tâche + 1 article
    expect(screen.getByText(/1 tâche/)).toBeInTheDocument()
    expect(screen.getByText(/1 article/)).toBeInTheDocument()
  })
})

// ── Filtre / recherche ──

describe('TaskSelector — filtre', () => {
  it('filtre les tâches prédéfinies', async () => {
    const user = userEvent.setup()
    renderTaskSelector()

    const search = screen.getByPlaceholderText('Filtrer les tâches…')
    await user.type(search, 'lever')

    expect(screen.getByText('Aide au lever')).toBeInTheDocument()
    expect(screen.queryByText('Courses')).not.toBeInTheDocument()
  })

  it('affiche toutes les tâches quand le filtre est vide', async () => {
    const user = userEvent.setup()
    renderTaskSelector()

    const search = screen.getByPlaceholderText('Filtrer les tâches…')
    await user.type(search, 'xyz')
    await user.clear(search)

    for (const task of DEFAULT_TASKS) {
      expect(screen.getByText(task)).toBeInTheDocument()
    }
  })
})

// ── Liste de courses ──

describe('TaskSelector — liste de courses', () => {
  it('n\'affiche pas la liste de courses si Courses n\'est pas coché', () => {
    renderTaskSelector({ value: ['Aide au lever'] })
    expect(screen.queryByText('Liste de courses')).not.toBeInTheDocument()
  })

  it('affiche la liste de courses quand Courses est coché', () => {
    renderTaskSelector({ value: ['Courses'] })
    expect(screen.getByText('Liste de courses')).toBeInTheDocument()
  })

  it('affiche les champs d\'ajout d\'article quand Courses est coché', () => {
    renderTaskSelector({ value: ['Courses'] })
    expect(screen.getByPlaceholderText('Article…')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Marque')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Note (optionnel)…')).toBeInTheDocument()
  })

  it('supprime les articles quand on décoche Courses', () => {
    const { onChange } = renderTaskSelector({
      value: ['Courses', `${COURSES_PREFIX}Lait`],
    })
    fireEvent.click(screen.getByText('Courses'))

    // Devrait supprimer Courses et les articles
    const call = onChange.mock.calls[0][0]
    expect(call).not.toContain('Courses')
    expect(call.some((t: string) => t.startsWith(COURSES_PREFIX))).toBe(false)
  })
})

// ── Tâches personnalisées ──

describe('TaskSelector — tâches personnalisées', () => {
  it('ajoute une tâche personnalisée', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTaskSelector()

    const input = screen.getByPlaceholderText('Ajouter une tâche…')
    await user.type(input, 'Sortir le chien')

    // Clic sur le bouton +
    const addButtons = screen.getAllByText('+')
    const customAddBtn = addButtons[addButtons.length - 1] // dernier +
    fireEvent.click(customAddBtn)

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining(['Sortir le chien']),
    )
  })

  it('ajoute une tâche avec Enter', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTaskSelector()

    const input = screen.getByPlaceholderText('Ajouter une tâche…')
    await user.type(input, 'Sortir le chien{Enter}')

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining(['Sortir le chien']),
    )
  })

  it('n\'ajoute pas de tâche vide', async () => {
    const { onChange } = renderTaskSelector()

    const addButtons = screen.getAllByText('+')
    fireEvent.click(addButtons[addButtons.length - 1])

    expect(onChange).not.toHaveBeenCalled()
  })

  it('n\'ajoute pas de doublon case-insensitive', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTaskSelector({ value: ['Sortir le chien'] })

    const input = screen.getByPlaceholderText('Ajouter une tâche…')
    await user.type(input, 'sortir le chien{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('affiche le compteur N/20 quand il y a des tâches custom', () => {
    renderTaskSelector({ value: ['Ma tâche 1', 'Ma tâche 2'] })
    expect(screen.getByText('2/20')).toBeInTheDocument()
  })

  it('désactive l\'input quand la limite est atteinte', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => `Tâche custom ${i + 1}`)
    renderTaskSelector({ value: tasks })
    expect(screen.getByPlaceholderText('Limite atteinte')).toBeDisabled()
  })

  it('affiche les tâches personnalisées existantes', () => {
    renderTaskSelector({ value: ['Sortir le chien', 'Arroser les plantes'] })
    expect(screen.getByText('Sortir le chien')).toBeInTheDocument()
    expect(screen.getByText('Arroser les plantes')).toBeInTheDocument()
  })

  it('supprime une tâche personnalisée', () => {
    const { onChange } = renderTaskSelector({ value: ['Sortir le chien'] })

    const removeBtn = screen.getByText('✕')
    fireEvent.click(removeBtn)

    expect(onChange).toHaveBeenCalledWith(
      expect.not.arrayContaining(['Sortir le chien']),
    )
  })
})

// ── Quantité ──

describe('TaskSelector — quantité articles', () => {
  it('affiche le contrôle de quantité pour les articles cochés', () => {
    renderTaskSelector({
      value: ['Courses', `${COURSES_PREFIX}Lait x2`],
    })
    expect(screen.getByText('x2')).toBeInTheDocument()
  })
})

// ── Suppression article inline ──

describe('TaskSelector — suppression article inline', () => {
  it('affiche un bouton ✕ pour chaque article', () => {
    renderTaskSelector({
      value: ['Courses', `${COURSES_PREFIX}Lait`, `${COURSES_PREFIX}Pain`],
    })
    // 2 boutons ✕ pour les articles (pas de custom tasks ici)
    const removeButtons = screen.getAllByTitle('Retirer de la liste')
    expect(removeButtons).toHaveLength(2)
  })

  it('retire un article quand on clique sur ✕', () => {
    const { onChange } = renderTaskSelector({
      value: ['Courses', `${COURSES_PREFIX}Lait`, `${COURSES_PREFIX}Pain`],
    })

    const removeButtons = screen.getAllByTitle('Retirer de la liste')
    fireEvent.click(removeButtons[0])

    const call = onChange.mock.calls[0][0]
    expect(call).toContain('Courses')
    // Un des deux articles doit avoir été retiré
    const remaining = call.filter((t: string) => t.startsWith(COURSES_PREFIX))
    expect(remaining).toHaveLength(1)
  })
})

// ── Accessibilité autocomplete ──

describe('TaskSelector — accessibilité autocomplete', () => {
  it('le champ article a role=combobox', () => {
    renderTaskSelector({ value: ['Courses'] })
    const input = screen.getByPlaceholderText('Article…')
    expect(input).toHaveAttribute('role', 'combobox')
  })
})
