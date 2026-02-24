# CLAUDE.md — Unilien (Handi-Lien)

Instructions et contexte persistants pour Claude Code. Ce fichier est chargé automatiquement à chaque session.

---

## Présentation du projet

**Unilien** (alias Handi-Lien) est une PWA de gestion de soins pour personnes handicapées.
Domaine métier : **Convention Collective IDCC 3239** (employeurs particuliers, droit du travail français).

- **Stack** : React 19 + TypeScript + Vite + Chakra UI v3 + Supabase + Zustand + TanStack Query
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
│   ├── export/           # Génération PDF (jsPDF)
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

### Services (13 services testés)
Chaque service dans `src/services/` gère le CRUD Supabase pour un domaine :
`absence`, `auxiliary`, `caregiver`, `compliance`, `contract`, `document`,
`leaveBalance`, `liaison`, `logbook`, `notification`, `profile`, `push`, `shift`, `stats`

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
- ⚠️ Seulement 6/17 services utilisent `sanitizeText()` (dette technique connue)

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

**État (20/02/2026)** : 1573 tests / 77 fichiers — **60.21% statement coverage**
- Services : 91.42% (13/13 testés)
- Hooks : 89.26% (7/7 testés)

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

**PDF (jsPDF)** :
```ts
// vi.hoisted() pour mockDoc
// vi.fn(function(this: any) { Object.assign(this, mockDoc) }) pour le constructeur
// Nécessite setPage + internal.getNumberOfPages dans le mock
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
- ⚠️ Runtime cache trop large (`/rest/v1/*`) — à restreindre

---

## Issues connues (à résoudre)

| Priorité | Problème |
|----------|----------|
| ~~Moyen~~ ✅ | ~~`LogbookPage.tsx` et `LiaisonPage.tsx` importent supabase directement~~ → `useEmployerResolution` hook (23/02/2026) |
| ~~Moyen~~ ✅ | ~~`notificationService` sans `sanitizeText()`~~ → corrigé sur `title`+`message` (23/02/2026) |
| Faible | Quelques tests `useAuth.test.ts` déclenchent des warnings React `act(...)` |
| Faible | PWA runtime cache trop broad (`/rest/v1/*`) |
| Faible | TanStack Query non uniforme (certains hooks utilisent encore `useEffect + fetch`) |

## Hooks (8/8)

- `useAuth`, `useNotifications`, `useComplianceCheck`, `useShiftReminders`
- `useComplianceMonitor`, `usePushNotifications`, `useSpeechRecognition`
- `useEmployerResolution` ← **nouveau (23/02/2026)** : résout l'`employerId` selon le rôle (employer/employee/caregiver). Utilisé par `LiaisonPage` et `LogbookPage`. Accepte `requiredCaregiverPermission?: keyof CaregiverPermissions`.

---

## Redesign UI/UX (en attente)

- Document de cadrage : `docs/DESIGN_REDESIGN.md`
- Périmètre : `theme.ts` + 64 composants, sans toucher services/stores/tests/DB
- 3 directions proposées (A=Sobre, B=Chaleureux, C=Moderne) — choix non tranché
- Approche : Phase 1 design system → Phase 2 navigation → Phase 3 pages P1 → Phase 4 reste

---

## Documentation disponible dans `docs/`

- `DEVELOPMENT_ROADMAP.md` — roadmap générale
- `DESIGN_REDESIGN.md` — cadrage redesign UI/UX
- `TEST_COVERAGE_ANALYSIS.md` — analyse couverture
- `SECURITY_ANALYSIS.md` — audit sécurité
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
- Migrations : `supabase/migrations/` (030 migrations au 23/02/2026)
- RLS activé sur toutes les tables
- Dernières migrations notables :
  - `028` : garde 24h initial
  - `029` : guard_segments JSONB v1
  - `030` : guard_segments v2 (N-segments libres, champs obsolètes supprimés)
