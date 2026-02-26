# 🧪 Analyse de Couverture des Tests - Unilien

**Date d'analyse**: 5 février 2026  
**Framework de tests**: Vitest + React Testing Library + jsdom  
**Couverture globale estimée**: **~15-20%** 🔴  
**État**: ⚠️ **INSUFFISANT** - Nécessite amélioration significative

---

## 📊 Résumé Exécutif

### Score par Domaine

| Domaine | Tests | Fichiers | Couverture | Statut |
|---------|-------|----------|------------|--------|
| **Compliance** | 8 | 8 | ~100% | ✅ Excellent |
| **Auth Components** | 3 | 4 | 75% | ✅ Bon |
| **Services** | 3 | 13 | 23% | 🔴 Insuffisant |
| **Hooks** | 1 | 8 | 12.5% | 🔴 Insuffisant |
| **Stores** | 1 | 1 | 100% | ✅ Bon |
| **UI Components** | 0 | 57 | 0% | 🔴 Non testé |
| **Pages** | 0 | 4 | 0% | 🔴 Non testé |
| **Lib/Export** | 0 | 6 | 0% | 🔴 Non testé |

### Métriques Globales

| Type | Target | Actuel | Gap |
|------|--------|--------|-----|
| **Statements** | 70% | ~15% | -55% 🔴 |
| **Branches** | 60% | ~10% | -50% 🔴 |
| **Functions** | 70% | ~15% | -55% 🔴 |
| **Lines** | 70% | ~15% | -55% 🔴 |

---

## 📂 Inventaire des Tests (16 fichiers)

### ✅ Tests Existants

#### 1. Module Compliance (8 tests) - ⭐ Excellent

```
✅ src/lib/compliance/calculatePay.test.ts
✅ src/lib/compliance/complianceChecker.test.ts
✅ src/lib/compliance/rules/validateBreak.test.ts
✅ src/lib/compliance/rules/validateDailyHours.test.ts
✅ src/lib/compliance/rules/validateDailyRest.test.ts
✅ src/lib/compliance/rules/validateOverlap.test.ts
✅ src/lib/compliance/rules/validateWeeklyHours.test.ts
✅ src/lib/compliance/rules/validateWeeklyRest.test.ts
```

**Couverture**: 100% du module compliance  
**Qualité**: Excellente - Tests unitaires complets des règles métier françaises

**Points forts**:
- Validation complète des règles du Code du travail
- Tests des cas limites et edge cases
- Calculs de paie vérifiés (SMIC, heures sup, majorations)

#### 2. Authentification (4 tests) - ✅ Bon

```
✅ src/hooks/useAuth.test.ts
✅ src/components/auth/LoginForm.test.tsx
✅ src/components/auth/SignupForm.test.tsx
✅ src/components/auth/ForgotPasswordForm.test.tsx
```

**Couverture**: 75% des composants auth  
**Manque**: ResetPasswordForm.test.tsx

**Qualité**: Bonne
- Mocks Supabase bien structurés
- Tests des flows critiques (inscription, connexion)
- Gestion des erreurs testée
- Tests des validations de formulaire

#### 3. Services (3 tests) - ⚠️ Partiel

```
✅ src/services/contractService.test.ts
✅ src/services/shiftService.test.ts
✅ src/services/profileService.test.ts
```

**Couverture**: 23% (3/13 services)

**Services non testés** (10):
```diff
- ❌ src/services/absenceService.ts
- ❌ src/services/auxiliaryService.ts
- ❌ src/services/caregiverService.ts
- ❌ src/services/complianceService.ts
- ❌ src/services/documentService.ts
- ❌ src/services/liaisonService.ts
- ❌ src/services/logbookService.ts
- ❌ src/services/notificationService.ts (943 lignes!)
- ❌ src/services/pushService.ts
- ❌ src/services/statsService.ts
```

#### 4. Stores (1 test) - ✅ Bon

```
✅ src/stores/authStore.test.ts
```

**Couverture**: 100% (seul store identifié)  
**Qualité**: Bon - Tests Zustand avec persistence

---

## 🔴 Zones Critiques Non Testées

### Priorité P0 - Critique (Risque Élevé)

#### 1. NotificationService (943 lignes) 🚨

**Fichier**: `src/services/notificationService.ts`  
**Complexité**: TRÈS ÉLEVÉE  
**Risque**: 🔴 CRITIQUE

**Fonctionnalités non testées**:
- Création et envoi de notifications
- Logique de filtering par type/priorité
- Gestion des erreurs et retry
- Integration avec Supabase Realtime
- Notifications push web

**Impact**: Bugs silencieux en production, notifications perdues

**Effort estimé**: 2 jours  
**Priorité**: P0 - À faire IMMÉDIATEMENT

---

#### 2. AbsenceService

**Fichier**: `src/services/absenceService.ts`  
**Risque**: 🔴 ÉLEVÉ

**Fonctionnalités critiques non testées**:
- CRUD des demandes d'absence
- Validation des statuts (pending → approved/rejected)
- Logique d'approbation employeur
- Gestion des justificatifs médicaux
- Upload/validation fichiers

**Impact**: Validation d'absences incorrecte, problèmes légaux

**Effort estimé**: 1 jour  
**Priorité**: P0

---

#### 3. DocumentService & Export CESU

**Fichiers**:
```
- src/services/documentService.ts
- src/lib/export/cesuGenerator.ts
- src/lib/export/cesuPdfGenerator.ts
- src/lib/export/declarationService.ts
```

**Risque**: 🔴 ÉLEVÉ - Implications légales

**Fonctionnalités critiques**:
- Génération documents CESU
- Calculs de cotisations sociales
- Export PDF avec données correctes
- Validation format légal

**Impact**: Documents incorrects = non-conformité URSSAF

**Effort estimé**: 2-3 jours  
**Priorité**: P0

---

#### 4. CaregiverService

**Fichier**: `src/services/caregiverService.ts`  
**Risque**: 🔴 ÉLEVÉ - Sécurité & données sensibles

**Fonctionnalités critiques**:
- Gestion des permissions aidants
- Logique d'accès aux données employeur
- Validation des droits (canViewPlanning, canViewLogbook, etc.)
- Système de permissions locked (tuteur/curateur)

**Impact**: Failles de sécurité, accès non autorisé aux données

**Effort estimé**: 1-2 jours  
**Priorité**: P0

---

### Priorité P1 - Important

#### 5. Hooks Métier (7/8 non testés)

```diff
✅ src/hooks/useAuth.test.ts
- ❌ src/hooks/useComplianceCheck.ts
- ❌ src/hooks/useComplianceMonitor.ts
- ❌ src/hooks/useNotifications.ts
- ❌ src/hooks/usePushNotifications.ts
- ❌ src/hooks/useShiftReminders.ts
- ❌ src/hooks/useSpeechRecognition.ts
```

**Risque**: 🟡 MOYEN-ÉLEVÉ

**Focus prioritaire**:
1. `useNotifications` - Logique complexe de polling/realtime
2. `useComplianceMonitor` - Surveillance continue conformité
3. `usePushNotifications` - Gestion permissions navigateur

**Effort estimé**: 3-4 jours  
**Priorité**: P1

---

#### 6. Pages (4/4 non testées)

```diff
- ❌ src/pages/CompliancePage.tsx
- ❌ src/pages/ContactPage.tsx
- ❌ src/pages/DocumentsPage.tsx
- ❌ src/pages/HomePage.tsx
```

**Type de tests suggéré**: Tests d'intégration, smoke tests

**Effort estimé**: 1-2 jours  
**Priorité**: P1

---

### Priorité P2 - Recommandé

#### 7. UI Components (57/60 non testés)

**Répartition par domaine**:
```
- ❌ Dashboard (9 composants)
- ❌ Planning (7 composants)
- ❌ Team (6 composants)
- ❌ Profile (5 composants)
- ❌ Compliance (7 composants)
- ❌ Logbook (3 composants)
- ❌ Liaison (3 composants)
- ❌ Notifications (3 composants)
- ❌ UI (5 composants)
- ❌ Documents (1 composant)
```

**Approche recommandée**:
1. Tests de rendu (smoke tests)
2. Tests d'interactions utilisateur
3. Tests d'accessibilité (axe-core déjà installé)
4. Snapshots pour régression UI

**Effort estimé**: 5-10 jours  
**Priorité**: P2 (selon criticité métier)

---

## 📋 Configuration Actuelle

### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/compliance/**/*.ts'],  // ⚠️ TROP RESTRICTIF
    },
  },
})
```

### ⚠️ Problème Principal

**Coverage configuré UNIQUEMENT pour `compliance/`**

Impact:
- Impossible de mesurer la vraie couverture globale
- Pas de reporting pour services, hooks, components
- Pas de thresholds de qualité

### ✅ Configuration Recommandée

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  include: [
    'src/services/**/*.ts',
    'src/hooks/**/*.ts',
    'src/lib/**/*.ts',
    'src/stores/**/*.ts',
    'src/components/**/*.{ts,tsx}'
  ],
  exclude: [
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    '**/types.ts',
    '**/index.ts',
    'src/test/**'
  ],
  all: true,
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60
  }
}
```

---

## 🎯 Plan d'Action Détaillé

### Phase 1 - Fondations (Semaine 1-2) 🔴 CRITIQUE

**Objectif**: Couvrir les services et fonctionnalités critiques

#### Actions

1. **Corriger vitest.config.ts** (15 min)
   - Étendre coverage à tous les fichiers
   - Ajouter thresholds de qualité
   - Configurer reporters (lcov pour CI)

2. **Créer notificationService.test.ts** (2 jours)
   ```typescript
   describe('notificationService', () => {
     describe('sendNotification', () => {
       it('should send notification to user')
       it('should handle multiple recipients')
       it('should filter by notification preferences')
       it('should retry on failure')
       it('should update notification status')
     })
     
     describe('markAsRead', () => {
       it('should mark single notification as read')
       it('should mark all notifications as read')
       it('should handle errors gracefully')
     })
   })
   ```

3. **Créer absenceService.test.ts** (1 jour)
   ```typescript
   describe('absenceService', () => {
     describe('createAbsenceRequest', () => {
       it('should create absence request')
       it('should validate dates')
       it('should handle sick leave with justification')
       it('should reject invalid file types')
     })
     
     describe('approveAbsence', () => {
       it('should approve by employer only')
       it('should reject by unauthorized user')
       it('should notify employee on status change')
     })
   })
   ```

4. **Créer caregiverService.test.ts** (1 jour)
   ```typescript
   describe('caregiverService', () => {
     describe('permissions', () => {
       it('should grant permissions to caregiver')
       it('should respect locked permissions (tutor)')
       it('should validate canViewPlanning permission')
       it('should deny access without permission')
     })
   })
   ```

5. **Créer documentService.test.ts** (2 jours)
   ```typescript
   describe('documentService', () => {
     describe('generateCESU', () => {
       it('should generate valid CESU PDF')
       it('should calculate correct social contributions')
       it('should include all required fields')
       it('should validate employer/employee data')
     })
   })
   ```

**Livrables**:
- ✅ 4 nouveaux fichiers de test
- ✅ Coverage services ≥ 50%
- ✅ Config vitest.config.ts corrigée

---

### Phase 2 - Hooks & Logique (Semaine 3) 🟡

**Objectif**: Sécuriser les hooks métier avec side effects

#### Actions

1. **useNotifications.test.ts** (1 jour)
2. **useComplianceMonitor.test.ts** (1 jour)
3. **usePushNotifications.test.ts** (1 jour)

**Focus**:
- Tests des side effects (useEffect)
- Mocks Supabase Realtime
- Tests des dépendances entre hooks
- Cleanup et memory leaks

**Livrables**:
- ✅ 3 hooks testés
- ✅ Coverage hooks ≥ 60%

---

### Phase 3 - UI Critique (Semaine 4-5) 🟡

**Objectif**: Tester les composants les plus utilisés

#### Priorités UI

1. **Dashboard components** (3 jours)
   - Dashboard.tsx
   - EmployerDashboard.tsx
   - EmployeeDashboard.tsx
   - CaregiverDashboard.tsx

2. **Planning components** (2 jours)
   - PlanningPage.tsx
   - WeekView.tsx
   - MonthView.tsx
   - NewShiftModal.tsx

3. **Team management** (2 jours)
   - TeamPage.tsx
   - AddCaregiverModal.tsx
   - CaregiverCard.tsx

**Approche**:
```typescript
describe('PlanningPage', () => {
  it('should render without crashing')
  it('should display shifts for current week')
  it('should allow creating new shift')
  it('should filter by employee')
  it('should be accessible (axe)')
})
```

**Livrables**:
- ✅ 15+ composants testés
- ✅ Tests d'accessibilité (axe-core)
- ✅ Coverage UI ≥ 40%

---

### Phase 4 - E2E & Intégration (Semaine 6+) 🟢

**Objectif**: Tests de bout en bout avec Playwright

#### Setup

```bash
npm install -D @playwright/test
npx playwright install
```

#### Scénarios Critiques

1. **Auth Flow** (e2e/auth.spec.ts)
   ```typescript
   test('user can sign up and complete profile', async ({ page }) => {
     await page.goto('/signup')
     await page.fill('[name="email"]', 'test@example.com')
     await page.fill('[name="password"]', 'SecurePass123!')
     await page.click('button[type="submit"]')
     await expect(page).toHaveURL('/settings')
   })
   ```

2. **Planning Management** (e2e/planning.spec.ts)
   - Employeur crée un shift
   - Employé valide disponibilité
   - Système vérifie conformité
   - Export document CESU

3. **Team Collaboration** (e2e/team.spec.ts)
   - Ajout aidant avec permissions
   - Aidant accède aux données autorisées
   - Aidant ne peut pas accéder aux données restreintes

**Livrables**:
- ✅ 10+ scénarios E2E
- ✅ CI/CD avec tests E2E
- ✅ Smoke tests sur production

---

## 📚 Templates & Exemples

### Service Test Template

```typescript
// src/services/__tests__/exampleService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { exampleService } from '../exampleService'
import { supabase } from '@/lib/supabase/client'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }))
  }
}))

describe('exampleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getById', () => {
    it('should fetch item by id', async () => {
      // Arrange
      const mockData = { id: '123', name: 'Test' }
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: mockData, 
        error: null 
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle
          }))
        }))
      } as any)

      // Act
      const result = await exampleService.getById('123')

      // Assert
      expect(result).toEqual(mockData)
      expect(supabase.from).toHaveBeenCalledWith('examples')
    })

    it('should throw error when item not found', async () => {
      // Arrange
      const mockError = { message: 'Not found', code: '404' }
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error: mockError 
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: mockSingle
          }))
        }))
      } as any)

      // Act & Assert
      await expect(exampleService.getById('999'))
        .rejects.toThrow('Not found')
    })
  })

  describe('create', () => {
    it('should create new item', async () => {
      // Arrange
      const input = { name: 'New Item' }
      const mockData = { id: '456', ...input }
      const mockInsert = vi.fn().mockResolvedValue({ 
        data: mockData, 
        error: null 
      })
      
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      // Act
      const result = await exampleService.create(input)

      // Assert
      expect(result).toEqual(mockData)
      expect(mockInsert).toHaveBeenCalledWith(input)
    })

    it('should validate required fields', async () => {
      // Act & Assert
      await expect(exampleService.create({}))
        .rejects.toThrow('Name is required')
    })
  })
})
```

### Hook Test Template

```typescript
// src/hooks/__tests__/useExample.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExample } from '../useExample'

describe('useExample', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    // Act
    const { result } = renderHook(() => useExample())

    // Assert
    expect(result.current.data).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should fetch data on mount', async () => {
    // Arrange
    const mockData = [{ id: '1', name: 'Test' }]
    const mockFetch = vi.fn().mockResolvedValue(mockData)

    // Act
    const { result } = renderHook(() => useExample({ fetch: mockFetch }))

    // Assert - Initial state
    expect(result.current.isLoading).toBe(true)
    
    // Wait for async operation
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    
    expect(result.current.data).toEqual(mockData)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should handle errors gracefully', async () => {
    // Arrange
    const mockError = new Error('Fetch failed')
    const mockFetch = vi.fn().mockRejectedValue(mockError)

    // Act
    const { result } = renderHook(() => useExample({ fetch: mockFetch }))

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBe(mockError.message)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should refetch when dependencies change', async () => {
    // Arrange
    const mockFetch = vi.fn()
      .mockResolvedValueOnce([{ id: '1' }])
      .mockResolvedValueOnce([{ id: '2' }])
    
    // Act
    const { result, rerender } = renderHook(
      ({ id }) => useExample({ id, fetch: mockFetch }),
      { initialProps: { id: '1' } }
    )

    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: '1' }])
    })

    // Change prop
    rerender({ id: '2' })

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual([{ id: '2' }])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  it('should cleanup on unmount', () => {
    // Arrange
    const cleanup = vi.fn()
    const { unmount } = renderHook(() => useExample({ cleanup }))

    // Act
    unmount()

    // Assert
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
```

### Component Test Template

```typescript
// src/components/Example/Example.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Example } from './Example'

describe('Example Component', () => {
  it('should render correctly', () => {
    // Arrange & Act
    render(<Example title="Test" />)

    // Assert
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    // Arrange
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Example onSubmit={onSubmit} />)

    // Act
    const input = screen.getByLabelText('Name')
    await user.type(input, 'John Doe')
    
    const button = screen.getByRole('button', { name: /submit/i })
    await user.click(button)

    // Assert
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' })
    })
  })

  it('should display error message', async () => {
    // Arrange
    const onSubmit = vi.fn().mockRejectedValue(new Error('Failed'))
    render(<Example onSubmit={onSubmit} />)

    // Act
    const button = screen.getByRole('button')
    await userEvent.click(button)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument()
    })
  })

  it('should be accessible', async () => {
    // Arrange
    const { container } = render(<Example />)

    // Assert - Basic accessibility checks
    expect(screen.getByRole('button')).toHaveAccessibleName()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    
    // For more comprehensive checks, use axe-core:
    // const results = await axe(container)
    // expect(results).toHaveNoViolations()
  })
})
```

---

## 🎓 Bonnes Pratiques

### 1. Structure AAA (Arrange-Act-Assert)

```typescript
it('should do something', () => {
  // Arrange - Setup test data and mocks
  const input = { ... }
  const expected = { ... }
  vi.mocked(someFunction).mockReturnValue(...)
  
  // Act - Execute the function/component
  const result = functionUnderTest(input)
  
  // Assert - Verify expectations
  expect(result).toEqual(expected)
})
```

### 2. Nommage Descriptif

```typescript
// ❌ Bad
it('test1', () => { ... })

// ✅ Good
it('should create absence request when valid data provided', () => { ... })
```

### 3. Un Assert par Test (idéalement)

```typescript
// ❌ Bad - Testing too much
it('should do everything', () => {
  expect(result.name).toBe('John')
  expect(result.email).toBe('john@test.com')
  expect(result.role).toBe('employee')
  expect(result.isActive).toBe(true)
})

// ✅ Good - Focused tests
describe('createUser', () => {
  it('should set correct name', () => {
    expect(result.name).toBe('John')
  })
  
  it('should set correct email', () => {
    expect(result.email).toBe('john@test.com')
  })
})
```

### 4. Isolation des Tests

```typescript
describe('MyService', () => {
  beforeEach(() => {
    // Reset mocks between tests
    vi.clearAllMocks()
    // Reset state
    cleanup()
  })
  
  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks()
  })
})
```

### 5. Tests Asynchrones

```typescript
// ✅ Use async/await
it('should fetch data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// ✅ Use waitFor for React updates
it('should update UI', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

---

## 🚀 Quick Wins (Actions Immédiates)

### 1. Corriger vitest.config.ts (15 min) ⚡

```bash
# Éditer vitest.config.ts
code vitest.config.ts
```

**Changements**:
```typescript
coverage: {
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    '**/*.test.{ts,tsx}',
    '**/types.ts',
    '**/index.ts',
    'src/test/**'
  ],
  all: true,
  reporter: ['text', 'json-summary', 'html', 'lcov'],
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 50,
    statements: 60
  }
}
```

### 2. Ajouter Scripts NPM (5 min) ⚡

```json
// package.json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:coverage:ui": "vitest --ui --coverage",
  "test:watch": "vitest --watch"
}
```

### 3. Créer GitHub Actions (30 min) ⚡

```yaml
# .github/workflows/test.yml
name: Tests & Coverage

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:run
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
          
      - name: Comment PR with coverage
        if: github.event_name == 'pull_request'
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

## 📊 Suivi & Monitoring

### Métriques à Suivre

1. **Coverage globale** (target: 70%)
   - Lines
   - Statements
   - Branches
   - Functions

2. **Tests par module**
   - Services: target 70%
   - Hooks: target 70%
   - Components: target 50%
   - Lib: target 80%

3. **Qualité des tests**
   - Temps d'exécution (< 30s ideal)
   - Flakiness (tests instables)
   - Mutation score (si mutation testing)

### Dashboards Recommandés

1. **Codecov.io** - Coverage visualization
2. **GitHub Actions** - CI/CD status
3. **SonarCloud** - Quality gate & tech debt

---

## ✅ Checklist de Validation

### Avant Merge (Minimum)

- [ ] Tests passent en local (`npm test`)
- [ ] Pas de tests skip/only (`it.only`, `describe.skip`)
- [ ] Coverage fichier modifié ≥ 60%
- [ ] Pas de régression de coverage global
- [ ] Pas de console.log dans les tests
- [ ] Mocks nettoyés (afterEach)

### Avant Release (Recommandé)

- [ ] Coverage global ≥ 60%
- [ ] Tests E2E critiques passent
- [ ] Pas de tests flaky
- [ ] Documentation tests à jour
- [ ] Performance non dégradée
- [ ] Audit npm sans vulnérabilités

---

## 💰 Estimation Effort Total

### Par Phase (1 développeur temps plein)

| Phase | Domaine | Durée | Priorité |
|-------|---------|-------|----------|
| **Phase 1** | Services critiques | 1-2 sem | 🔴 P0 |
| **Phase 2** | Hooks métier | 1 sem | 🟡 P1 |
| **Phase 3** | UI Components | 2-3 sem | 🟡 P1 |
| **Phase 4** | E2E & Integration | 2-3 sem | 🟢 P2 |
| **Total** | - | **6-9 sem** | - |

### Avec Équipe (2-3 développeurs)

- **Phase 1-2**: 2 semaines (parallélisable)
- **Phase 3**: 2 semaines
- **Phase 4**: 2 semaines
- **Total**: **6 semaines**

### Budget Recommandé

Si externalisation partielle:
- Junior dev: 15-20€/h
- Senior dev: 40-60€/h
- Lead/Architect: 60-80€/h

**Estimation globale**: 15-25k€ pour couverture complète

---

## 🎯 Roadmap 2026

### Q1 2026 (Jan-Mar)

- ✅ Analyse couverture (Done)
- [ ] Phase 1: Services critiques (Sem 5-6)
- [ ] Phase 2: Hooks métier (Sem 7-8)

### Q2 2026 (Apr-Jun)

- [ ] Phase 3: UI Components
- [ ] Phase 4: E2E setup
- [ ] Atteindre 60% coverage global

### Q3 2026 (Jul-Sep)

- [ ] E2E complets
- [ ] Tests de charge/performance
- [ ] Atteindre 70% coverage global

### Q4 2026 (Oct-Dec)

- [ ] Mutation testing
- [ ] Visual regression tests
- [ ] Maintenir 70%+ coverage

---

## 📚 Ressources & Formation

### Documentation

- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright](https://playwright.dev/)

### Outils Complémentaires

```bash
# Mutation testing
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner

# Visual regression
npm install -D @chromatic-com/storybook

# Accessibility testing
npm install -D @axe-core/playwright
```

### Formation Équipe

**Recommandé**:
1. Workshop "Testing React Applications" (2 jours)
2. Code review sessions tests (1x/semaine)
3. Pair programming sur tests complexes

---

## 🔄 Cycle d'Amélioration Continue

### Hebdomadaire

- Review coverage par PR
- Identifier tests flaky
- Optimiser temps d'exécution

### Mensuel

- Analyse régression coverage
- Audit qualité tests (duplication, mocks obsolètes)
- Mise à jour dépendances test

### Trimestriel

- Revue stratégie test globale
- Évaluation ROI des tests
- Formation continue équipe

---

## 🎯 Conclusion

### État Actuel vs Cible

| Métrique | Actuel | Cible Q2 | Cible Q4 |
|----------|--------|----------|----------|
| Coverage | 15% | 60% | 70% |
| Services testés | 23% | 70% | 85% |
| Hooks testés | 12.5% | 60% | 75% |
| UI testés | 5% | 40% | 60% |
| Tests E2E | 0 | 5 | 15+ |

### Points Forts Actuels

✅ **Module Compliance**: Excellemment testé (100%)  
✅ **Auth**: Bien couvert (75%)  
✅ **Infrastructure**: Vitest + RTL bien configurés  
✅ **Team**: Connaissance des outils de test

### Axes d'Amélioration Prioritaires

🔴 **Services critiques**: notificationService, absenceService, documentService  
🟡 **Hooks métier**: useNotifications, useComplianceMonitor  
🟢 **E2E**: Flows utilisateur critiques

### Prochaine Action

**Cette semaine**:
1. Corriger `vitest.config.ts` (15 min)
2. Créer `notificationService.test.ts` (2 jours)
3. Setup GitHub Actions (30 min)

---

**Document maintenu par**: Équipe Développement Unilien  
**Dernière mise à jour**: 5 février 2026  
**Prochaine revue**: Mars 2026
