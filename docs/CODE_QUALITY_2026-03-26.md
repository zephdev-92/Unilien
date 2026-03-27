# Analyse qualité du code — 26 mars 2026

Synthèse de l’état du dépôt Unilien (React 19, TypeScript, Vite, Vitest).

## Points forts

- **TypeScript** : `strict: true`, `noUnusedLocals` / `noUnusedParameters`, `verbatimModuleSyntax` dans `tsconfig.app.json` — base solide pour la maintenabilité.
- **Structure** : découpage par domaines (`services/`, `hooks/`, `components/`, `lib/compliance`), séparation types DB (`database.ts`) / applicatifs (`types/index.ts`).
- **Tests** : volumétrie élevée (ordre de grandeur **~2000+ tests**, **~119 fichiers** `*.test.ts(x)` au 26/03/2026), couverture métier forte sur la conformité IDCC, les services et une partie des écrans.
- **Outils** : ESLint flat config (`typescript-eslint` recommended, React Hooks, React Refresh).
- **Pratiques** : logger centralisé (`lib/logger.ts`), sanitisation sur les écritures sensibles, mocks Supabase cohérents dans les tests.

## Garde-fous automatisés

| Contrôle        | Rôle                          |
|----------------|-------------------------------|
| `npm run typecheck` | Vérification TypeScript       |
| `npm run lint`      | ESLint sur `**/*.{ts,tsx}`    |
| `npm run test:run`  | Suite Vitest (CI)             |
| `npm run test:coverage` | Couverture (v8)           |

À l’issue de la revue du 26/03/2026 : **typecheck OK**, **lint sans erreurs** (un avertissement connu sur `SignupForm` / React Compiler + `react-hook-form`).

## Axes d’amélioration

1. **Patterns de chargement** : beaucoup de `useEffect` + appels services plutôt que TanStack Query partout — pas incorrect, mais duplication possible (états loading/erreur, invalidation). À cadrer si standardisation sur Query.
2. **Documentation de couverture** : `docs/TEST_COVERAGE_ANALYSIS.md` (anciennes métriques) peut être **obsolète** face au volume actuel de tests ; mettre à jour ou s’appuyer sur un export récent de `npm run test:coverage`.
3. **Dette marquée** : peu de `TODO` dans le code (ex. fin d’intervention, tests dashboard désactivés, intégration Sentry commentée dans `logger.ts`).
4. **Durée des tests** : la suite complète peut dépasser **~2 minutes** selon la machine — envisager parallélisation Vitest ou ciblage par chemins en pré-commit pour un feedback plus court.
5. **ESLint** : configuration volontairement légère — pas de règles de complexité cyclomatique, d’ordre d’imports ou d’a11y dans ESLint (hors usage ponctuel d’outils comme `@axe-core/react`).

## Références

- `tsconfig.app.json`, `eslint.config.js`
- `docs/TEST_COVERAGE_ANALYSIS.md` (historique ; à recouper avec la couverture actuelle)
- `CLAUDE.md` — contexte projet et commandes
