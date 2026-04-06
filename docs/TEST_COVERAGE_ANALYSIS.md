# Analyse de couverture des tests — Unilien

**Date d'analyse** : 6 avril 2026
**Framework** : Vitest 4.1.2 + React Testing Library + jsdom
**Provider coverage** : v8

---

## Métriques globales

| Métrique | Valeur | Threshold | Statut |
|----------|--------|-----------|--------|
| **Statements** | 54.14% | 50% | Au-dessus |
| **Branches** | 47.10% | 40% | Au-dessus |
| **Functions** | 47.61% | 40% | Au-dessus |
| **Lines** | 55.40% | 50% | Au-dessus |

**Tests** : 2199 tests / 125 fichiers — tous passent
**Durée** : ~130s

---

## Couverture par domaine

### Services — 75.28% stmts

| Service | Stmts | Branches | Functions | Lines |
|---------|-------|----------|-----------|-------|
| interventionSettingsService | 96.42% | 90.32% | 100% | 100% |
| leaveBalanceService | 100% | 93.75% | 100% | 100% |
| logbookService | 94.44% | 83.54% | 100% | 96.51% |
| complianceService | 90.76% | 68.88% | 95% | 91.66% |
| profileService | 90.82% | 74.19% | 92.85% | 90.38% |
| notification.core | 90.32% | 97.05% | 88.88% | 89.65% |
| documentService | 88.63% | 67.50% | 100% | 87.80% |
| pushService | 88.88% | 80.30% | 94.44% | 88.61% |
| caregiverService | 87.65% | 78.30% | 100% | 87.50% |
| searchService | 86.36% | 50% | 100% | 91.89% |
| absenceService | 83.33% | 72.22% | 75% | 83.33% |
| shiftService | 83.59% | 80.74% | 91.66% | 84.07% |
| liaisonService | 78.61% | 63.56% | 81.48% | 79.60% |
| statsService | 78.68% | 70.90% | 71.42% | 79.27% |
| notificationCreators | 75% | 93.75% | 100% | 74.64% |
| teamService | 75.38% | 78.68% | 85.71% | 75% |
| contractService | 68.65% | 63.55% | 71.42% | 68.65% |
| notificationService | 57.89% | 50% | 78.57% | 58.18% |
| cesuDeclarationService | 51.21% | 42.85% | 42.85% | 47.36% |
| nudgeService | 30% | 38.09% | 28.57% | 32% |
| auxiliaryService | 100% | 85% | 100% | 100% |
| accountService | 100% | 100% | 100% | 100% |
| conventionSettingsService | 100% | 100% | 100% | 100% |
| dataExportService | 100% | 100% | 100% | 100% |
| analyticsService | 0% | 0% | 0% | 0% |
| storageService | 0% | 0% | 0% | 0% |

### Hooks — couverture élevée (non mesurée individuellement par v8)

Hooks testés : `useAuth`, `useNotifications`, `useComplianceCheck`, `useShiftReminders`, `useComplianceMonitor`, `usePushNotifications`, `useSpeechRecognition`, `useEmployerResolution`, `useHealthConsent`, `useInterventionSettings`

### Lib — variable

| Module | Stmts | Statut |
|--------|-------|--------|
| compliance/rules | ~95% | Excellent |
| compliance/calculatePay | ~90% | Excellent |
| pch/pchTariffs | 100% | Excellent |
| export/cesuExportService | 87.87% | Bon |
| export/payslipGenerator | 97.91% | Excellent |
| export/cesuPdfGenerator | 17.46% | Faible |
| absence/ | 85.21% | Bon |
| shifts/repeatDates | 3.22% | Non testé |
| validation/ | 22.22% | Faible |

### Pages — 41.22% stmts

| Page | Stmts | Statut |
|------|-------|--------|
| HomePage | 100% | Excellent |
| DocumentsPage | 100% | Excellent |
| CompliancePage | 91.30% | Excellent |
| ContactPage | 50% | Moyen |
| SettingsPage | 35.19% | Faible |
| AnalyticsPage | 0% | Non testé |
| LegalPage | 0% | Non testé |

### Stores — 27.19% stmts

| Store | Stmts | Statut |
|-------|-------|--------|
| authStore | 100% | Excellent |
| conventionSettingsStore | 12.90% | Nouveau, non testé |
| interventionSettingsStore | 6.66% | Faible |

---

## Évolution

| Date | Tests | Fichiers | Stmts | Branches |
|------|-------|----------|-------|----------|
| 5 fév 2026 | ~200 | ~16 | ~15% | ~10% |
| 19 fév 2026 | ~1200 | ~80 | ~42% | ~26% |
| 26 mars 2026 | ~2161 | ~119 | ~50% | ~40% |
| 1er avril 2026 | 2167 | 122 | 54.03% | 46.96% |
| **6 avril 2026** | **2199** | **125** | **54.14%** | **47.10%** |

---

## Services non testés (priorité)

| Service | Raison | Priorité |
|---------|--------|----------|
| `analyticsService` | Feature non déployée | Basse |
| `storageService` | Utilitaire interne | Basse |

---

## Configuration actuelle

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'json-summary', 'lcov', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: ['src/**/*.test.*', 'src/test/**', 'src/types/**', 'src/vite-env.d.ts', 'src/main.tsx'],
  thresholds: {
    statements: 50,
    branches: 40,
    functions: 40,
    lines: 50,
  },
}
```

Thresholds relevés le 6 avril 2026 (PR #230). Prochaine cible : 60/50/50/60.

---

## Prochaines actions

| Action | Effort | Impact |
|--------|--------|--------|
| Relever les thresholds à 50/40/40/50 | 5 min | Empêche les régressions |
| Fixer le test `auxiliaryService` en échec | 15 min | 1 test vert |
| Tester `accountService` (zone de danger) | 1h | Sécurité |
| Tester `conventionSettingsService` | 30 min | Nouveau code |
| Améliorer `dataExportService` (8%) | 1h | RGPD / export |
| Tests E2E Playwright | Semaines | Q2 2026 |
