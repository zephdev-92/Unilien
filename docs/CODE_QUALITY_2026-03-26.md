# Analyse qualité du code — 26 mars 2026

Synthèse de l’état du dépôt Unilien (React 19, TypeScript, Vite, Vitest).

## Points forts

- **TypeScript** : `strict: true`, `noUnusedLocals` / `noUnusedParameters`, `verbatimModuleSyntax` dans `tsconfig.app.json` — base solide pour la maintenabilité.
- **Structure** : découpage par domaines (`services/`, `hooks/`, `components/`, `lib/compliance`), séparation types DB (`database.ts`) / applicatifs (`types/index.ts`).
- **Tests** : volumétrie élevée (**2167 tests**, **122 fichiers** `*.test.ts(x)` au 01/04/2026 — était ~2161/119 le 26/03), couverture métier forte sur la conformité IDCC, les services et une partie des écrans.
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

**Mise à jour 01/04/2026** : `eslint-plugin-jsx-a11y` ajouté (PR #210) — les règles d’accessibilité font maintenant partie du lint. 0 erreurs jsx-a11y après correction des `autoFocus` dans `SettingsPage`.

## Axes d’amélioration

1. **Patterns de chargement** : beaucoup de `useEffect` + appels services plutôt que TanStack Query partout — pas incorrect, mais duplication possible (états loading/erreur, invalidation). À cadrer si standardisation sur Query.
2. **Documentation de couverture** : `docs/TEST_COVERAGE_ANALYSIS.md` réécrit avec les vraies métriques (54.03% stmts, 2167 tests) — à jour au 01/04/2026.
3. **Dette marquée** : peu de `TODO` dans le code (ex. fin d’intervention, tests dashboard désactivés, intégration Sentry commentée dans `logger.ts`).
4. **Durée des tests** : la suite complète peut dépasser **~2 minutes** selon la machine — envisager parallélisation Vitest ou ciblage par chemins en pré-commit pour un feedback plus court.
5. ~~**ESLint** : pas de règles d’a11y~~ → **`eslint-plugin-jsx-a11y` ajouté (PR #210)** — les règles d’accessibilité font maintenant partie du lint standard. Configuration volontairement légère sur la complexité cyclomatique et l’ordre d’imports.

## Références

- `tsconfig.app.json`, `eslint.config.js`
- `docs/TEST_COVERAGE_ANALYSIS.md` (historique ; à recouper avec la couverture actuelle)
- `CLAUDE.md` — contexte projet et commandes
