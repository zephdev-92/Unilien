# CLAUDE.md — Unilien (Handi-Lien)

Instructions et contexte persistants pour Claude Code. Ce fichier est chargé automatiquement à chaque session.

---

## Présentation du projet

**Unilien** (alias Handi-Lien) est une PWA de gestion de soins pour personnes handicapées.
Domaine métier : **Convention Collective IDCC 3239** (employeurs particuliers, droit du travail français).

- **Stack** : React 19 + TypeScript + Vite + Chakra UI v3 + Supabase + Zustand (fetch via services ; **pas** de TanStack Query en prod — voir `docs/TANSTACK_QUERY_MIGRATION.md`)
- **UI/Docs** : en français
- **Repo GitHub** : https://github.com/zephdev-92/Unilien

---

## Préférences utilisateur

- **Communiquer en français** dans toutes les réponses
- Utiliser les skills WD-Framework (`wd:analyze`, `wd:implement`, etc.) pour les tâches complexes
- Documentation dans le dossier `docs/` (markdown)
- Ne jamais committer sans demande explicite

---

## Architecture & structure

```
src/
├── app/                  # Configuration app-level
├── assets/               # Images, icônes
├── components/           # Composants UI organisés par domaine
│   ├── auth/
│   ├── clock-in/
│   ├── compliance/
│   ├── dashboard/
│   ├── documents/
│   ├── liaison/
│   ├── logbook/
│   ├── notifications/
│   ├── planning/
│   ├── profile/
│   ├── team/
│   └── ui/               # Composants génériques réutilisables
├── hooks/                # Custom hooks React
├── lib/
│   ├── compliance/
│   │   └── rules/        # Règles individuelles IDCC 3239 + checker central
│   ├── export/           # Génération PDF (@react-pdf/renderer)
│   ├── absence/
│   ├── supabase/         # Client Supabase
│   ├── logger.ts         # Logger centralisé avec redaction
│   ├── mappers.ts        # snake_case ↔ camelCase
│   └── sanitize.ts       # DOMPurify
├── pages/                # Pages routes (lazy-loaded)
│   ├── CompliancePage.tsx
│   ├── ContactPage.tsx
│   ├── DocumentsPage.tsx
│   └── HomePage.tsx
├── services/             # CRUD Supabase (13 services)
├── stores/               # Zustand stores
│   └── authStore.ts
├── styles/
├── test/                 # Helpers de test (renderWithProviders, etc.)
└── types/
    ├── database.ts       # Types DB Supabase (snake_case)
    └── index.ts          # Types applicatifs (camelCase)
```

**Alias de chemin** : `@/` → `src/`

---

## Patterns clés

### Types
- Types DB (snake_case) → `src/types/database.ts`
- Types app (camelCase) → `src/types/index.ts`
- Conversion via `src/lib/mappers.ts`

### Services (29 services)
Chaque service dans `src/services/` gère le CRUD Supabase pour un domaine :
`absence`, `attachment`, `auxiliary`, `caregiver`, `cesuDeclaration`, `compliance`, `contract`,
`document`, `interventionSettings`, `conventionSettings`, `account`, `dataExport`,
`leaveBalance`, `liaison`, `logbook`, `notification`, `nudge`, `profile`, `push`, `search`, `shift`, `stats`

### Auth
- Store Zustand : `src/stores/authStore.ts`
- Hook : `src/hooks/useAuth.ts`
- Routes protégées centralisées dans `App.tsx` (l.50-67) avec RBAC

### Compliance IDCC 3239
Règles dans `src/lib/compliance/rules/` :
- `validateAbsenceConflict`, `validateBreak`, `validateConsecutiveNights`
- `validateDailyHours`, `validateDailyRest`, `validateGuard24h`, `validateGuardAmplitude`
- `validateNightPresenceDuration`, `validateOverlap`, `validateWeeklyHours`, `validateWeeklyRest`
- Checker central : `src/lib/compliance/rules/index.ts`

### Sécurité & qualité
- Logger centralisé avec redaction : `src/lib/logger.ts`
- Sanitisation via DOMPurify : `src/lib/sanitize.ts` — à appeler avant chaque écriture DB
- 8/13 services utilisent `sanitizeText()` : absence, caregiver, liaison, logbook, notification, profile, shift, push (24/02/2026)
- Les 5 restants (auxiliary, compliance, contract, document, leaveBalance, stats) sont soit read-only, soit n'écrivent que des valeurs contrôlées (enums, UUIDs, dates) — aucune sanitisation nécessaire
- **Post‑pentest (2026)** : migrations **`041` à `048`** — RLS renforcé, RGPD art. 9 (consentement + isolation données santé + audit trail), suppression compte/données, CESU persisté, convention settings DB. Synthèse : **`docs/SECURITY_CHECK_2026-03-26.md`**. **CSP** en enforcement sur Netlify.
- **Accessibilité** : `eslint-plugin-jsx-a11y` activé, `@axe-core/react` branché en DEV (PR #210).

---

## Commandes utiles

```bash
npm run dev           # Dev server (Vite)
npm run build         # Build production
npm run typecheck     # TypeScript check (sans build)
npm run lint          # ESLint
npm run test          # Vitest watch
npm run test:run      # Vitest run (CI)
npm run test:coverage # Coverage v8
```

---

## Tests

**État (1er avril 2026)** : 2167 tests / 122 fichiers — **54% statement coverage** (voir `docs/TEST_COVERAGE_ANALYSIS.md` pour le détail)
- Services : 70.91% stmts (nombreux services testés)
- Hooks : couverture élevée (10+ hooks testés)

### Patterns de test

**Services / Supabase** :
```ts
vi.mock('@/lib/supabase/client')
// helper mockSupabaseQuery() pour chaîner .from().select().eq()...
```

**Hooks** :
```ts
renderHook(() => useMyHook(), { wrapper })
// + act + waitFor
// vi.useFakeTimers() pour polling/debounce
```

**Composants** :
```ts
import { renderWithProviders } from '@/test/helpers'
vi.mock('@/services/myService')
// waitFor pour les états async
```

**PDF (@react-pdf/renderer)** :
```ts
// Mocker @react-pdf/renderer : vi.mock('@react-pdf/renderer', ...)
// PDFs générés via composants React déclaratifs (plus de jsPDF)
```

---

## Fonctionnalités métier notables

### Garde de 24h — N-segments libres (implémenté 18/02/2026)
- Migration `030_guard_segments_v2.sql` : colonne `guard_segments` JSONB
- Interface : `GuardSegment { startTime: string, type: 'effective'|'astreinte'|'break', breakMinutes?: number }`
- UI : liste éditable + barre visuelle + ajout/division/suppression par segment
- Validations :
  - Total effectif ≤ 12h (bloquant)
  - Présence nuit > 12h (avertissement)
- Paie : majorations nuit automatiques sur segments effectifs entre 21h–6h

### Présence responsable
- Champ `presence_responsable` sur les shifts
- Paie réduite à 2/3 (`presenceResponsiblePay`)
- ⚠️ `sundayMajoration` pour `presence_day` utilise `basePay` (brut), pas `presenceResponsiblePay` — incohérence possible

### PWA
- Service worker via `vite-plugin-pwa`
- Cache runtime limité au **storage** Supabase (`storage/v1/*`), pas aux réponses **`/rest/v1/*`** (`vite.config.ts`) — voir `docs/SECURITY_CHECK_2026-03-26.md`

---

## Issues connues (à résoudre)

| Priorité | Problème |
|----------|----------|
| ~~Moyen~~ ✅ | ~~`LogbookPage.tsx` et `LiaisonPage.tsx` importent supabase directement~~ → `useEmployerResolution` hook (23/02/2026) |
| ~~Moyen~~ ✅ | ~~`notificationService` sans `sanitizeText()`~~ → corrigé sur `title`+`message` (23/02/2026) |
| Faible | Quelques tests `useAuth.test.ts` déclenchent des warnings React `act(...)` |
| Faible | Data-fetching encore majoritairement `useEffect` + services (pas de TanStack Query — voir `docs/TANSTACK_QUERY_MIGRATION.md`) |

## Hooks (10+)

- `useAuth`, `useNotifications`, `useComplianceCheck`, `useShiftReminders`
- `useComplianceMonitor`, `usePushNotifications`, `useSpeechRecognition`
- `useEmployerResolution` — résout l'`employerId` selon le rôle. Accepte `requiredCaregiverPermission?`.
- `useHealthConsent` — grant/revoke consentement RGPD données de santé (PR #203)
- `useConventionSettings` — chargement/sync paramètres convention IDCC 3239 (PR #208)
- `useInterventionSettings` — tâches par défaut + liste de courses (PR #180)

---

## Dark mode & Design system

- **Dark mode** : ✅ implémenté (PR #192) — toggle dans Paramètres > Apparence
- **Design tokens** : ✅ ~237 hex migrés vers tokens sémantiques Chakra UI v3 (PR #185)
- **Redesign UI/UX avancé** : en attente — cadrage dans `docs/DESIGN_REDESIGN.md` (3 directions A/B/C, choix non tranché)

---

## Documentation disponible dans `docs/`

- `DEVELOPMENT_ROADMAP.md` — roadmap générale
- `DESIGN_REDESIGN.md` — cadrage redesign UI/UX
- `TEST_COVERAGE_ANALYSIS.md` — analyse couverture
- `ACCESSIBILITY.md` — accessibilité (WCAG, préférences, limites)
- `SECURITY_CHECK_2026-03-26.md` — synthèse migrations **041-048** (RLS, RGPD, audit trail, zone danger, CSP)
- `SECURITY_SUMMARY.md` — synthèse globale posture sécurité
- `SECURITY_ANALYSIS.md` — audit sécurité applicatif
- `SECURITY_IDOR_ANALYSIS.md` — analyse IDOR / pentest (historique + statut post-041)
- `MEDICAL_DATA_COMPLIANCE.md` — conformité RGPD données de santé (checklist 7/10 ✅)
- `2FA_IMPLEMENTATION.md` — plan implémentation 2FA TOTP
- `SOCIAL_LOGIN_IMPLEMENTATION.md` — plan OAuth Google/Microsoft
- `ANALYTICS_IMPLEMENTATION.md` — plan Plausible self-hosted
- `TANSTACK_QUERY_MIGRATION.md` — si réintroduction de TanStack Query un jour
- `Garde_de_24_heures.md` — spec métier garde 24h
- `heure_de_presence_responsable.md` — spec présence responsable
- `feature_reprise_conges_contrat.md` — reprise congés au contrat
- `compliance/` — règles IDCC 3239 détaillées

---

## Workflow Git (obligatoire)

1. **Nouvelle branche par feature/fix** : préfixes `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`
2. **Avant push** : `npm run lint` ET `npm run test:run` doivent passer sans erreur
3. **Demander l'autorisation** avant tout `git push`
4. **Fournir l'URL PR + texte formaté** après push

### Workflow complet

```bash
# 1. Branche
git checkout -b feat/ma-feature

# 2. Commit
git add src/fichier-modifié.ts
git commit -m "feat(scope): description en anglais"

# 3. Vérifications
npm run lint
npm run test:run

# 4. → Demander autorisation à l'utilisateur ←

# 5. Push (après accord)
git push -u origin feat/ma-feature
```

### Format PR

```
URL : https://github.com/zephdev-92/Unilien/pull/new/<branch-name>

Titre (anglais) : <type>(<scope>): <description courte>

## Summary
<Résumé en français des changements>

### Changements
- Item 1
- Item 2

## Test plan
- [ ] Test manuel 1
- [ ] Test automatisé pass
```

---

## Supabase & base de données

- Client : `src/lib/supabase/client.ts`
- Migrations : `supabase/migrations/` (**41** fichiers au 03/2026)
- RLS activé sur toutes les tables
- Dernières migrations notables :
  - `028` : garde 24h initial
  - `029` : guard_segments JSONB v1
  - `030` : guard_segments v2 (N-segments libres, champs obsolètes supprimés)
  - **`041`** : correctifs sécurité (IDOR, RPC notifications, aidants, conversations, profils, audit fichiers, bucket justifications) — **voir `docs/SECURITY_CHECK_2026-03-26.md`**
