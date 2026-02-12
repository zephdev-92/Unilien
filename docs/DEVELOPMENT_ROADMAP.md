# 🗺️ Roadmap de Développement - Unilien

**Dernière mise à jour**: 12 février 2026 (sprint tests massif — 786 tests, couverture 37%, tous services testés)
**Version**: 1.3.1
**Statut projet**: 🟡 En développement actif

---

## 📊 Vue d'Ensemble

### État Actuel

| Catégorie | Complétude | Statut |
|-----------|------------|--------|
| **Authentification** | 95% | ✅ Excellent (login, signup, reset, rôles) |
| **Dashboards** | 95% | ✅ Excellent (3 dashboards rôle-spécifiques) |
| **Planning** | 95% | ✅ Excellent (semaine/mois, shifts 24h, absences IDCC 3239, conflits) |
| **Cahier de liaison** | 80% | 🟡 Bon (realtime, typing indicators) |
| **Équipe/Contrats** | 90% | ✅ Bon (contrats, aidants, permissions) |
| **Conformité** | 95% | ✅ Excellent |
| **Documents/Export** | 75% | 🟡 À améliorer (gestion OK, exports avancés manquants) |
| **Notifications** | 70% | 🟡 Partiel (in-app + push OK, email/SMS manquants) |
| **Tests** | 37% | 🟡 En progression (786 tests / 32 fichiers, cible Q1 30% atteinte ✅) |
| **Sécurité** | 92% | ✅ Excellent (routes protégées, sanitisation 6/9 services, fail-fast, FK fix, RLS audit) |
| **Qualité code** | 90% | ✅ Bon (ErrorBoundary, code splitting, 0 `as any`, 0 `eslint-disable` type) |

### Métriques Clés

- **Fichiers source**: ~140 fichiers TS/TSX
- **Lignes de code**: ~16,000 lignes
- **Tests**: 786 tests / 32 fichiers (~37% coverage)
- **Migrations DB**: 24 migrations
- **Composants UI**: ~65 composants
- **Services**: 13 services
- **Hooks**: 8 hooks
- **Routes**: 16 routes (dont 10 protégées)

---

## ✅ Réalisations Récentes (Semaines 6-7 - Février 2026)

### Sprint Tests Massif — Couverture ×2.5 (12/02/2026)

Sprint intensif de tests unitaires couvrant l'ensemble des services et hooks critiques. Résultat : passage de ~298 tests / ~20 fichiers (~20% coverage) à **786 tests / 32 fichiers (~37% coverage)**.

| Métrique | Avant (11/02) | Après (12/02) | Objectif Q1 |
|----------|---------------|---------------|-------------|
| **Statements** | ~14% | **36.92%** | 30% ✅ |
| **Branches** | ~10% | **31.68%** | — |
| **Functions** | ~12% | **33.06%** | — |
| **Lines** | ~14% | **37.16%** | 30% ✅ |
| **Tests** | 298 | **786** | — |
| **Fichiers test** | ~20 | **32** | — |

#### Couverture par couche

| Couche | Coverage (Stmts) | Détails |
|--------|-----------------|---------|
| **src/services/** | **91.42%** | 13/13 services testés (était 3/13) |
| **src/lib/compliance/** | **91.73%** | Règles et calculs bien couverts |
| **src/lib/compliance/rules/** | **88.17%** | Tous les validateurs |
| **src/stores/** | **100%** | authStore entièrement couvert |
| **src/hooks/** | **44.19%** | 4/8 hooks testés |
| **src/lib/export/** | **29.39%** | declarationService couvert |
| **src/components/auth/** | **37.5%** | 3 formulaires testés |

#### Fichiers de tests créés (12/02/2026)

**Services (Phase 1 — tous les services restants)** :

| Fichier | Tests | Fonctions couvertes |
|---------|-------|---------------------|
| `notificationService.test.ts` | 68 | CRUD, realtime, subscriptions, preferences, rappels |
| `caregiverService.test.ts` | 53 | CRUD aidants, permissions, recherche, profil |
| `absenceService.test.ts` | 49 | Demandes, approbation, soldes, conflits |
| `contractService.test.ts` | 48 | Création, FK 23503, terminaison, recherche email |
| `pushService.test.ts` | 44 | Souscription, envoi, permissions, Edge Function |
| `profileService.test.ts` | 31 | Get/upsert employer/employee, profil, avatar |
| `liaisonService.test.ts` | 29 | Messages, conversations, typing indicators |
| `logbookService.test.ts` | 28 | Entrées, filtres, pagination |
| `leaveBalanceService.test.ts` | 24 | Solde congés, calcul acquis, prorata |
| `auxiliaryService.test.ts` | 19 | Liste auxiliaires, détails, stats |
| `statsService.test.ts` | 17 | Statistiques dashboard, calculs |
| `documentService.test.ts` | 17 | Gestion documents, upload, filtres |
| `complianceService.test.ts` | 11 | Conformité hebdo, historique, alertes |
| `shiftService.test.ts` | — | Complété (existant) |
| `declarationService.test.ts` | 34 | Export CESU, calculs majorations |

**Hooks (Phase 2)** :

| Fichier | Tests | Fonctions couvertes |
|---------|-------|---------------------|
| `useNotifications.test.ts` | 20 | Chargement, mark as read, dismiss, realtime, filtres |
| `useComplianceCheck.test.ts` | 16 | Validation shift, debounce, paie, absences |
| `useShiftReminders.test.ts` | 12 | Rappels 24h, notifications, dedup |

### Refonte Système d'Absences — Conformité IDCC 3239 (11/02/2026) — PR #67

Réécriture complète du module d'absences avec validation métier conforme à la Convention Collective IDCC 3239 :

| Composant | Détails |
|-----------|---------|
| **Architecture** | Module `src/lib/absence/` : 5 validators individuels + checker central (`absenceChecker.ts`) |
| **Validations** | Chevauchement (bloquant, court-circuit), solde congés payés, arrêt maladie (justificatif obligatoire), événements familiaux (durées IDCC 3239), période de congé principal (avertissement) |
| **Formulaire** | `AbsenceRequestModal.tsx` : 6 types d'absence, upload justificatif, calcul jours ouvrables, affichage solde, checkbox jour unique |
| **Solde congés** | `leaveBalanceService.ts` : init/get/update solde, calcul jours acquis, mapping DB→domaine |
| **Calculs** | `balanceCalculator.ts` + `utils.ts` : jours ouvrables, année de congés, jours acquis prorata |

### Interventions 24h + Affichage Multi-Jours + Conflits Absence (11/02/2026) — PR #69

Support complet des interventions longues durée et protection contre les conflits :

| Changement | Fichiers | Détails |
|------------|----------|---------|
| **Fix calcul 24h** | `compliance/utils.ts` | `08:00→08:00` = 1440 min (24h) au lieu de 0 |
| **>10h = warning** | `validateDailyHours.ts`, `complianceChecker.ts` | Bloquant → Avertissement avec articles IDCC 3239 (repos 11h, pause 20min, repos hebdo 35h) |
| **Calendrier multi-jours** | `MonthView.tsx`, `WeekView.tsx` | Intervention 20h→08h visible sur les 2 jours, badge "Suite" + bordure pointillée |
| **Conflit absence** | `validateAbsenceConflict.ts` (nouveau), `complianceChecker.ts`, `useComplianceCheck.ts` | Bloque la création de shift si l'auxiliaire a une absence approuvée |
| **Erreur PostgreSQL** | `absenceService.ts` | Exclusion constraint `23P01` → message français clair |
| **Tests** | 3 fichiers test mis à jour | 298/298 tests passent |

### Fix Label "Brut" Taux Horaire (11/02/2026) — PR #68

Ajout de la mention "(brut)" sur les labels de taux horaire dans l'interface pour éviter toute confusion.

### Fix Validation Formulaire Absence (11/02/2026) — PR #70

Correction de bugs UX dans le formulaire de demande d'absence :

| Bug | Cause | Correction |
|-----|-------|-----------|
| Double message d'erreur date | `.refine()` dupliqué dans schéma Zod | Suppression du doublon |
| Faux positif "date début > fin" | `setValue('endDate')` sans revalidation | Ajout `shouldValidate: true` |
| Erreurs non pertinentes (solde affiché avec chevauchement) | Pas de court-circuit dans `absenceChecker.ts` | Return immédiat après overlap |
| Message solde cryptique | Texte trop vague | Message amélioré et actionnable |

### Audit Complet (09/02/2026)

Audit multi-domaines réalisé couvrant sécurité, qualité, architecture, accessibilité et performance. Résultats :
- **2 problèmes critiques** : clé VAPID privée exposée, credentials .env sans protection git
- **4 problèmes hauts** : routes sans garde, client Supabase silencieux, sanitisation manquante, duplication code
- **1 bug FK** : trigger handle_new_user ne créait pas la ligne employees/employers (erreur 23503)
- **6 problèmes moyens** : error boundary absent, code splitting manquant, types Supabase génériques, emojis accessibilité, ARIA live regions, performance calculateNightHours
- **5 problèmes bas** : focus SPA, refetchOnWindowFocus désactivé, paramètre _date inutilisé

### Corrections Sprint 1 ClockInPage (10/02/2026)

Analyse multi-domaine de `ClockInPage.tsx` (803 lignes, 28 problèmes identifiés). Sprint 1 appliqué :

| ID | Sévérité | Domaine | Correction |
|----|----------|---------|------------|
| A-01 | CRITIQUE | Accessibilité | `role="status"` / `role="alert"` sur messages succès/erreur |
| A-02 | CRITIQUE | Accessibilité | `aria-hidden` + `prefers-reduced-motion` sur indicateur animé |
| A-07 | Haute | Accessibilité | Focus management via `useRef` après clock-in/out/cancel |
| A-08 | Moyenne | Accessibilité | `role="status" aria-label` sur les 3 Spinners |
| Q-05 | Haute | Qualité | Guard explicite si `clockInTime` null (plus de fallback silencieux) |
| C-02 | Moyenne | Métier | `hasNightAction: false` au lieu de `undefined` (reset DB correct) |
| P-06 | Moyenne | Performance | `useMemo` deps scalaires au lieu de référence objet |

### Corrections Sprint 2 ClockInPage (10/02/2026)

Suite de l'analyse multi-domaine. Sprint 2 appliqué (7 items hauts) :

| ID | Sévérité | Domaine | Correction |
|----|----------|---------|------------|
| A-03 | Haute | Accessibilité | Switch nuit : label programmatique (htmlFor/id) + `aria-live` sur majoration |
| A-04 | Haute | Accessibilité | Boutons filtre historique : `aria-pressed` + `accessibleLabel` + `role="group"` |
| A-05 | Haute | Accessibilité | `aria-hidden="true"` sur 7 emojis décoratifs |
| A-06 | Haute | Accessibilité | `accessibleLabel="Annuler le pointage en cours"` sur bouton Annuler |
| S-01 | Haute | Sécurité | `sanitizeText()` sur tasks affichées (3 emplacements, defense in depth) |
| S-03 | Haute | Sécurité | Audit RLS : ownership shift vérifié via FK contracts (déjà sécurisé) |
| C-01 | Haute | Conformité | Validation conformité post clock-out avec affichage warnings |

Sprint 3 restant (10 problèmes architecture & performance avancée).

### Corrections Qualité de Code - Audit 2b (10/02/2026)

Diagnostic et résolution systématique des 6 problèmes de qualité détectés par l'audit :

| # | Problème | Correction | Résultat |
|---|----------|-----------|----------|
| 1 | Error Boundary absent | Créé `ErrorBoundary.tsx` (class component + fallback Chakra UI), intégré dans `main.tsx` | Crash = écran de secours au lieu d'écran blanc |
| 2 | Sanitization absente (0/9 services) | Ajouté `sanitizeText()` avant chaque écriture DB texte dans 6 services | 6/9 services protégés (3 restants en lecture seule) |
| 3 | Duplication useAuth + `as any` | Créé `mapProfileFromDb()` + `createDefaultProfile()` dans `lib/mappers.ts` | ~80 lignes dupliquées supprimées, 0 `as any` dans useAuth |
| 4 | Code splitting absent (13 pages eager) | Conversion des 11 pages vers `React.lazy()` + `Suspense` dans `App.tsx` | Bundle initial allégé |
| 5 | 13 `eslint-disable` (`no-explicit-any`) | Créé 5 interfaces DB manquantes dans `database.ts`, typé tous les mappers | 0 `eslint-disable` type restant (1 seul `react-hooks` justifié) |
| 6 | Auth checks redondants dans 4 pages | Documenté comme partiellement justifié (permissions granulaires) | À réévaluer si ProtectedRoute évolue |

**Fichiers créés** : `src/components/ui/ErrorBoundary.tsx`, `src/lib/mappers.ts`
**Fichiers modifiés** : 13 (App.tsx, main.tsx, useAuth.ts, useShiftReminders.ts, database.ts, 6 services, documentService, notificationService, ui/index.ts)

### Fonctionnalités Complétées

| Fonctionnalité | Détails |
|----------------|---------|
| **Logger Centralisé** | `src/lib/logger.ts` - Redaction automatique, 4 niveaux, intégré dans tous les fichiers |
| **Dashboards Complets** | 3 dashboards rôle-spécifiques (Employer, Employee, Caregiver) avec widgets |
| **Profil Complet** | Sections PersonalInfo, Employee, Employer, Caregiver, Accessibility + avatar upload |
| **Équipe & Contrats** | Gestion auxiliaires, aidants, contrats CDI/CDD, permissions granulaires |
| **Planning Complet** | Vues semaine/mois, shifts CRUD (dont 24h), absences IDCC 3239 avec justificatifs, approbation, affichage multi-jours, conflit absence/shift |
| **Documents** | Gestion absences/justificatifs, filtres, statistiques, approbation |
| **Notifications In-App** | Bell icon, badge, panel, mark as read, dismiss, Realtime Supabase |
| **Push Notifications** | Code implémenté, service worker, Edge Function (config VAPID restante) |
| **Messaging Realtime** | Cahier de liaison temps réel avec indicateurs de frappe |
| **Navigation Responsive** | Sidebar rôle-based, mobile overlay, accessibility (skip link) |
| **24 Migrations DB** | Tables, RLS policies, fonctions, storage buckets, realtime |
| **786 Tests (32 fichiers)** | Services (13/13), Compliance (7), Auth (4), Hooks (4), Store (1), Export (1) |
| **13 Services** | CRUD complet pour toutes les entités métier |
| **Composants Accessibles** | AccessibleInput, AccessibleButton, AccessibleSelect, VoiceInput |

---

## 🔴 PRIORITÉ 0 - BUGS CRITIQUES (Urgent)

### 0a. ✅ CORRIGÉ : Clé Privée VAPID Exposée

**Fichier**: `.vapid-keys.json` (racine projet)
**Impact**: 🔴 CRITIQUE - Usurpation possible du serveur de notifications push
**Effort**: 30 min
**Statut**: ✅ CORRIGÉ (09/02/2026)
**Découvert**: Audit 09/02/2026

**Problème résolu**: Le fichier `.vapid-keys.json` contenait la clé privée VAPID en clair.

**Corrections appliquées**:
```
[x] Nouvelles clés VAPID régénérées (npx web-push generate-vapid-keys)
[x] Fichier .vapid-keys.json supprimé du filesystem
[x] .env mis à jour avec la nouvelle clé publique
[x] Dépôt git vérifié : aucun secret tracké
[x] Ancienne clé privée absente de tous les fichiers du projet
[x] Secrets Supabase mis à jour (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
[x] Edge Function send-push-notification redéployée (v12)
[x] Clé privée supprimée de la documentation
[ ] Vérifier qu'aucune copie/backup externe ne contient l'ancienne clé
```

---

### 0b. ✅ RÉSOLU : Fichier .env avec Credentials en Clair (hors git)

**Fichier**: `.env`
**Impact**: Initial 🔴 CRITIQUE → Résolu ✅
**Effort**: 15 min
**Statut**: ✅ RÉSOLU (10/02/2026)
**Découvert**: Audit 09/02/2026

**Diagnostic (10/02/2026)** : Après analyse approfondie, la criticité initiale était **surévaluée** :
- Le dépôt git est **initialisé** (09/02/2026) et `.gitignore` est **actif**
- `.env` n'a **jamais été commité** dans l'historique git
- `.vapid-keys.json` n'a **jamais été commité** non plus
- Le `.env` ne contient **aucun secret réel** :
  - `VITE_SUPABASE_ANON_KEY` = clé anonyme/publique par design (exposée dans le bundle client via `import.meta.env`)
  - `VITE_VAPID_PUBLIC_KEY` = clé publique, zéro risque
  - `VITE_SUPABASE_URL` = URL publique
- La `service_role_key` (vrai secret) est correctement isolée dans les variables d'environnement serveur de l'Edge Function (`Deno.env.get()`)
- La sécurité repose sur les **RLS policies** PostgreSQL, pas sur le secret de la `anon_key`

**Actions**:
```
[x] Initialiser le dépôt git (09/02/2026)
[x] Vérifier que .env est bien dans .gitignore (ligne 18 — OK)
[x] Vérifier que .env n'a jamais été commité (git log — confirmé)
[x] Vérifier absence de service_role_key côté client (confirmé)
[x] Ajouter supabase/.temp/ au .gitignore (10/02/2026)
[ ] Auditer les RLS policies (sécurité dépend des RLS, pas de la clé anon)
```

---

### 0c. ✅ CORRIGÉ : Routes Protégées Sans Garde Centralisée

**Fichier**: `src/App.tsx`
**Impact**: Initial 🔴 HAUTE → Résolu ✅
**Effort**: 1h
**Statut**: ✅ CORRIGÉ (10/02/2026)
**Découvert**: Audit 09/02/2026

**Problème résolu**: Les 9 routes protégées géraient chacune leur propre authentification individuellement (pattern fragile, dupliqué, inconsistant).

**Corrections appliquées**:
```
[x] Créer composant <ProtectedRoute> dans App.tsx (même pattern que PublicRoute)
[x] Support prop allowedRoles?: UserRole[] pour restriction par rôle
[x] Wrapper les 9 routes authentifiées dans App.tsx avec <ProtectedRoute>
[x] Routes avec restriction de rôle : /clock-in (employee), /team /compliance /documents (employer, caregiver)
[x] Supprimer les gardes auth individuelles dans 9 composants (Dashboard, ProfilePage, PlanningPage, ClockInPage, LogbookPage, LiaisonPage, TeamPage, CompliancePage, DocumentsPage)
[x] Nettoyer les imports inutilisés (Navigate, isAuthenticated, isLoading)
[x] Conserver les vérifications fines de permissions internes (canManageTeam, canExportData)
[x] Build TypeScript + Vite : 0 erreur
[ ] Tests unitaires du composant ProtectedRoute
```

---

### 0d. ✅ CORRIGÉ : Client Supabase Silencieux en Cas de Config Manquante

**Fichier**: `src/lib/supabase/client.ts`
**Impact**: Initial 🔴 HAUTE → Résolu ✅
**Effort**: 15 min
**Statut**: ✅ CORRIGÉ (10/02/2026)
**Découvert**: Audit 09/02/2026

**Problème résolu**: Le client Supabase se rabattait silencieusement sur des placeholders fictifs quand les variables d'environnement étaient absentes, masquant les erreurs de configuration.

**Corrections appliquées**:
```
[x] Remplacer le fallback par un throw Error explicite si VITE_SUPABASE_URL manque
[x] Idem pour VITE_SUPABASE_ANON_KEY
[x] Message clair avec instructions ("Copiez .env.example vers .env...")
[x] Suppression des placeholders fictifs — le client reçoit les vraies valeurs
[x] Suppression de l'import logger inutilisé
```

---

### 0e. ✅ CORRIGÉ : Sanitisation Manquante dans les Services

**Fichiers**: 6 services modifiés
**Impact**: Initial 🔴 HAUTE → Résolu ✅
**Effort**: 1h
**Statut**: ✅ CORRIGÉ (10/02/2026)
**Découvert**: Audit 09/02/2026

**Problème résolu**: Le module `sanitize.ts` (DOMPurify) existait mais n'était utilisé par aucun service. 25 champs texte libre étaient envoyés à Supabase sans sanitisation.

**Corrections appliquées**:
```
[x] shiftService.ts : sanitizeText() sur notes + tasks[].map(sanitizeText) (create + update)
[x] liaisonService.ts : sanitizeText() sur content (create + update)
[x] absenceService.ts : sanitizeText() sur reason (create)
[x] logbookService.ts : sanitizeText() sur content (create + update)
[x] profileService.ts : sanitizeText() sur firstName, lastName, phone, handicapName, specificNeeds, cesuNumber, address.* (updateProfile + upsertEmployer + upsertEmployee)
[x] caregiverService.ts : sanitizeText() sur relationship, relationshipDetails, emergencyPhone, availabilityHours, address.* (upsert + updateProfile)
[ ] Ajouter tests unitaires vérifiant la sanitisation
```

---

### 0f. ✅ CORRIGÉ : FK Violation Création Contrat (employees manquant)

**Fichier**: `supabase/migrations/024_auto_create_role_row_on_signup.sql`, `src/services/contractService.ts`
**Impact**: 🔴 HAUTE - Impossible de créer un contrat avec un auxiliaire nouveau
**Effort**: 1h
**Statut**: ✅ CORRIGÉ (10/02/2026)
**Découvert**: Erreur console 409 (23503 FK constraint)

**Problème résolu**: Le trigger `handle_new_user` ne créait qu'une ligne `profiles` à l'inscription. La ligne `employees` (ou `employers`) n'était créée que lorsque l'utilisateur visitait sa page Profil. Cela provoquait une erreur FK `contracts_employee_id_fkey` quand un employeur tentait de créer un contrat avec un auxiliaire qui n'avait pas encore complété son profil.

**Corrections appliquées**:
```
[x] Migration 024 : handle_new_user crée automatiquement la ligne employees/employers avec valeurs par défaut
[x] Migration 024 : rattrapage des utilisateurs existants (backfill)
[x] contractService.ts : searchEmployeeByEmail vérifie l'existence dans la table employees (profileComplete flag)
[x] contractService.ts : message d'erreur spécifique pour l'erreur FK 23503
[x] NewContractModal.tsx : bloque la création avec message clair si profil auxiliaire incomplet
[x] contractService.test.ts : tests mis à jour pour le nouveau champ profileComplete
[x] Migration appliquée sur Supabase distant (db push OK)
```

---

### 1. ✅ Majorations Hardcodées dans DeclarationService

**Fichier**: `src/lib/export/declarationService.ts`
**Impact**: 🔴 CRITIQUE - Exports CESU incorrects
**Effort**: 1 jour
**Statut**: ✅ CORRIGÉ
**Document**: `docs/issues/HARDCODED_MAJORATIONS_ISSUE.md`

**Problèmes corrigés**:
- ✅ ~~Majorations hardcodées (30%, 60%, 20%)~~ → Utilise `MAJORATION_RATES` depuis `calculatePay.ts`
- ✅ ~~Heures supplémentaires toujours à 0~~ → Calcul réel via `calculateOvertimeHours()` avec cumul par shift
- ✅ ~~Non-conformité légale~~ → Taux conformes Convention Collective IDCC 3239
- ✅ ~~Sous-paiement des employés~~ → Calcul correct (dimanche, fériés, nuit, heures sup)

**Actions**:
```
[x] Exporter MAJORATION_RATES depuis calculatePay.ts
[x] Utiliser MAJORATION_RATES + calculateOvertimeHours() pour chaque shift
[x] Implémenter calcul réel des heures sup (cumul progressif par shift)
[x] Gestion has_night_action (acte vs présence seule)
[x] Créer tests unitaires (declarationService.test.ts)
[ ] Tests d'intégration export CESU
[ ] Validation expert paie
```

**Timeline**: ~~Cette semaine (Semaine 6/2026)~~ Code corrigé, tests restants

---

### 2. 🧪 Couverture de Tests — En Progression

**Impact**: 🟡 IMPORTANT - Risque de régression (en cours de réduction)
**Effort**: 6-8 semaines (Phase 1+2 terminées en 1 jour)
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md`

**État actuel**: ~37% coverage — 786 tests / 32 fichiers (cible Q1 30% ✅ atteinte, cible finale: 70%)

**Services testés (13/13)** ✅ Phase 1 terminée (12/02/2026):
```
[x] src/services/notificationService.test.ts (68 tests)
[x] src/services/caregiverService.test.ts (53 tests)
[x] src/services/absenceService.test.ts (49 tests)
[x] src/services/contractService.test.ts (48 tests)
[x] src/services/pushService.test.ts (44 tests)
[x] src/lib/export/declarationService.test.ts (34 tests)
[x] src/services/profileService.test.ts (31 tests)
[x] src/services/liaisonService.test.ts (29 tests)
[x] src/services/logbookService.test.ts (28 tests)
[x] src/services/leaveBalanceService.test.ts (24 tests)
[x] src/services/auxiliaryService.test.ts (19 tests)
[x] src/services/statsService.test.ts (17 tests)
[x] src/services/documentService.test.ts (17 tests)
[x] src/services/complianceService.test.ts (11 tests)
[x] src/services/shiftService.test.ts (existant, complété)
```

**Hooks testés (4/8)** — Phase 2 partiellement terminée (12/02/2026):
```
[x] useAuth.test.ts (existant)
[x] useNotifications.test.ts (20 tests)
[x] useComplianceCheck.test.ts (16 tests)
[x] useShiftReminders.test.ts (12 tests)
[ ] useComplianceMonitor.ts — P2
[ ] usePushNotifications.ts — P2
[ ] useSpeechRecognition.ts — P3
```

**Autres tests existants**:
```
[x] src/lib/compliance/**/*.test.ts (7 fichiers - conformité)
[x] src/stores/authStore.test.ts (26 tests)
[x] src/components/auth/*.test.tsx (3 fichiers - LoginForm, SignupForm, ForgotPasswordForm)
```

**Quick Wins restants**:
```
[x] Corriger vitest.config.ts (coverage global) - 15 min
[x] Tester tous les services restants - ✅ terminé 12/02/2026
[ ] Setup GitHub Actions coverage - 30 min
```

**Prochaines étapes tests (pour atteindre 60%+)**:
```
[ ] useComplianceMonitor.test.ts — hook complexe (monitoring continu)
[ ] usePushNotifications.test.ts — hook push notifications
[ ] Composants UI critiques (dashboard widgets, planning views)
[ ] Export PDF/CESU (cesuGenerator, pdfGenerator)
[ ] Tests E2E (Playwright — Phase 4)
```

**Timeline**:
- ~~Phase 1 (Services critiques): Semaines 6-8/2026~~ ✅ Terminé 12/02/2026
- ~~Phase 2 (Hooks): Semaine 9/2026~~ ✅ Partiellement terminé 12/02/2026 (4/8)
- Phase 2b (Hooks restants): Semaine 8-9/2026
- Phase 3 (UI + exports): Semaines 10-14/2026
- Phase 4 (E2E): Q2 2026

---

### 3. ✅ Logger Centralisé avec Redaction

**Impact**: 🔴 MOYEN-ÉLEVÉ - Sécurité
**Effort**: 1 jour
**Statut**: ✅ TERMINÉ (03/02/2026)
**Document**: `docs/SECURITY_ANALYSIS.md` (P1)

**Implémentation** (`src/lib/logger.ts`):
- ✅ Redaction automatique : emails, JWT, UUIDs, téléphones, clés API
- ✅ Sanitisation récursive des objets (clés sensibles masquées)
- ✅ Production : seuls error/warn actifs, prêt pour Sentry
- ✅ Développement : tous niveaux actifs avec données sanitisées
- ✅ 4 niveaux : `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`
- ✅ Intégré dans tous les services, hooks et composants

**Actions**:
```
[x] Créer src/lib/logger.ts
[x] Implémenter redaction (emails, IDs, tokens, téléphones)
[x] Remplacer console.* par logger dans 47 fichiers (170+ appels)
[x] Intégration dans les composants (dashboard, planning, profile, team, documents)
[ ] Intégrer Sentry/LogRocket (optionnel - prêt pour intégration)
[x] Documentation équipe (JSDoc dans le fichier)
```

**Timeline**: ~~Semaine 7/2026~~ Terminé Semaine 6/2026

---

### 2b. ✅ CORRIGÉ : Qualité de Code - Problèmes Détectés par Audit

**Impact**: Initial 🟡 MOYEN-ÉLEVÉ → Résolu ✅
**Effort**: 2h
**Statut**: ✅ CORRIGÉ (10/02/2026)
**Découvert**: Audit 09/02/2026

#### ✅ Duplication Massive du Mapping Profil (useAuth.ts)

**Corrections appliquées**:
```
[x] Créé src/lib/mappers.ts avec mapProfileFromDb(data, email) et createDefaultProfile(userId, email, meta)
[x] Créé type ProfileDbRow importé dans useAuth.ts (remplace as any)
[x] Supprimé 4 blocs dupliqués (~80 lignes) dans initialize() et signIn()
[x] 0 "as any" restant dans useAuth.ts (était 2)
[x] 0 eslint-disable restant dans useAuth.ts (était 2)
```

#### ✅ Error Boundary Global

**Corrections appliquées**:
```
[x] Créé src/components/ui/ErrorBoundary.tsx (class component React)
[x] Intégré dans main.tsx (wrappant <App />, à l'intérieur de ChakraProvider et BrowserRouter)
[x] Affichage accessible : message français, bouton retour, détail erreur en dev uniquement
[x] Erreurs loggées via logger.ts (componentDidCatch)
[x] Exporté depuis src/components/ui/index.ts
```

#### ✅ Types Supabase dans les Mappers (eslint-disable éliminés)

**Corrections appliquées**:
```
[x] Ajouté 5 interfaces DB manquantes dans database.ts : LiaisonMessageDbRow, LogEntryDbRow, NotificationDbRow, CaregiverDbRow + complété ShiftDbRow
[x] Typé 9 fonctions mapper dans 7 services (shiftService, absenceService, liaisonService, logbookService, notificationService, caregiverService, documentService)
[x] Supprimé 13 eslint-disable @typescript-eslint/no-explicit-any
[x] Remplacé 4 as any par des types explicites (ProfileDbRow, ContractDbRow, ContractWithEmployeeDbRow)
[x] 1 seul eslint-disable restant dans tout le codebase (react-hooks/exhaustive-deps dans DocumentManagementSection.tsx - justifié)
```

**Types restant génériques** (P2, non bloquant) :
```
[ ] Aligner accessibility_settings → AccessibilitySettings dans database.ts
[ ] Aligner computed_pay → ComputedPay dans ShiftDbRow
[ ] Aligner permissions → CaregiverPermissions dans CaregiverDbRow
[ ] Regenerer les types complets si besoin (npx supabase gen types)
```

---

### 2c. 🟡 Accessibilité - Écarts par Rapport à l'Objectif WCAG AAA

**Impact**: 🟡 IMPORTANT - Mission critique du projet
**Effort**: 1 jour
**Statut**: ❌ À CORRIGER
**Découvert**: Audit 09/02/2026

#### Emojis dans les Boutons (LoginForm, SignupForm)

**Fichiers**: `src/components/auth/LoginForm.tsx:132-133`, `SignupForm.tsx:227-249`

Les boutons d'affichage/masquage du mot de passe utilisent des emojis (`🙈` / `👁️`). Les lecteurs d'écran liront "singe qui se cache les yeux" ou "oeil" au lieu d'un texte utile. L'`aria-label` est présent mais l'emoji reste visuellement problématique.

**Actions**:
```
[ ] Remplacer les emojis par des icônes SVG (Chakra UI icons ou lucide-react)
[ ] Exemple : <EyeIcon /> et <EyeOffIcon />
[ ] Garder les aria-label existants
```

**Effort**: 30 min

#### Pas de ARIA Live Regions pour le Contenu Dynamique

Aucune `aria-live` region détectée pour les alertes dynamiques (conformité, notifications, messages temps réel). Les changements dynamiques ne sont pas annoncés aux lecteurs d'écran.

**Actions**:
```
[x] ClockInPage : aria-live="polite" sur messages succès, role="alert" sur erreurs (10/02/2026)
[x] ClockInPage : role="status" sur indicateur "intervention en cours" (10/02/2026)
[x] ClockInPage : role="status" aria-label sur les 3 Spinners de chargement (10/02/2026)
[x] ClockInPage : aria-live sur majoration nuit, aria-pressed sur filtres historique (10/02/2026)
[x] ClockInPage : aria-hidden sur 7 emojis décoratifs (10/02/2026)
[x] ClockInPage : accessibleLabel sur bouton Annuler, htmlFor/id sur switch nuit (10/02/2026)
[ ] Ajouter aria-live="assertive" sur les alertes de conformité critiques
[ ] Ajouter aria-live="polite" sur les notifications, indicateurs de frappe
[ ] Tester avec NVDA/VoiceOver
```

**Effort**: 1h

#### Gestion du Focus après Navigation SPA

Le focus n'est pas géré après les changements de route. L'utilisateur au clavier ou lecteur d'écran se retrouve "perdu" après navigation.

**Actions**:
```
[x] ClockInPage : focus géré après clock-in, clock-out et annulation via useRef (10/02/2026)
[ ] Implémenter un hook useRouteAnnouncer() ou composant <RouteAnnouncer />
[ ] Déplacer le focus vers le h1 de la nouvelle page après navigation
[ ] Annoncer le titre de la page aux lecteurs d'écran
```

**Effort**: 1h

---

## 🟡 PRIORITÉ 1 - FONCTIONNALITÉS MANQUANTES (Important)

### 4. 📧 Notifications Email & SMS

**Impact**: 🟡 IMPORTANT - Engagement utilisateur
**Effort**: 2 semaines
**Document**: `docs/TODO_NOTIFICATIONS.md`

**État actuel**:
- ✅ Notifications in-app (bell icon, badge, panel, mark as read, dismiss)
- ✅ Notifications Realtime (Supabase Realtime subscriptions)
- ✅ Notifications Web Push (code implémenté, service worker prêt, config VAPID manquante)
- ❌ Notifications Email (non implémenté)
- ❌ Notifications SMS (non implémenté)

#### 4.1 Web Push (Finalisation)

**Actions restantes**:
```
[ ] Générer clés VAPID
[ ] Configurer variables env (VITE_VAPID_PUBLIC_KEY)
[ ] Configurer secrets Supabase
[ ] Déployer Edge Function send-push-notification
[ ] Tests navigateurs (Chrome, Firefox, Safari)
[ ] Documentation utilisateur
```

**Effort**: 2-3 heures
**Timeline**: Cette semaine

#### 4.2 Email Notifications (Nouveau)

**Use cases**:
- Confirmation d'inscription
- Réinitialisation mot de passe (déjà fait par Supabase)
- Notifications importantes (shifts, absences approuvées)
- Rappels hebdomadaires (digest)

**Solution recommandée**: Supabase Edge Functions + SendGrid/Resend

**Actions**:
```
[ ] Choisir fournisseur email (SendGrid/Resend)
[ ] Créer templates emails (HTML + texte)
[ ] Créer Edge Function send-email
[ ] Intégrer dans notificationService
[ ] Préférences utilisateur (opt-out)
[ ] Tests envoi
```

**Effort**: 1 semaine
**Timeline**: Semaines 8-9/2026

#### 4.3 SMS Notifications (Nouveau)

**Use cases**:
- Urgences (shift annulé last minute)
- Codes de vérification (2FA)
- Alertes critiques conformité

**Solution recommandée**: Twilio Verify

**Actions**:
```
[ ] Compte Twilio + crédits
[ ] Edge Function send-sms
[ ] Intégration notificationService
[ ] Préférences utilisateur
[ ] Estimation coûts
```

**Effort**: 1 semaine
**Timeline**: Semaine 10/2026
**Budget**: ~20-50€/mois (selon volume)

---

### 5. 📱 Vérification Téléphone par SMS

**Impact**: 🟡 IMPORTANT - Sécurité & qualité données
**Effort**: 1 semaine
**Document**: `docs/PHONE_VERIFICATION.md`

**État**: Non implémenté

**Solution recommandée**: Twilio Verify (ou Supabase Phone Auth)

**Flux**:
```
1. Inscription → Saisie numéro
2. Envoi code SMS (6 chiffres)
3. Validation code
4. Numéro marqué "vérifié" en DB
```

**Actions**:
```
[ ] Décider fournisseur (Twilio vs Supabase)
[ ] Configurer compte + API keys
[ ] Créer Edge Functions (send-code, verify-code)
[ ] UI saisie code (6 inputs)
[ ] Mise à jour table profiles (phone_verified)
[ ] Tests + gestion erreurs
```

**Effort**: 1 semaine
**Timeline**: Semaine 11/2026
**Budget**: ~4-5€/mois (100 inscriptions)

---

### 6. 📄 Export Documents Amélioré

**Impact**: 🟡 IMPORTANT - Fonctionnalité métier
**Effort**: 1 semaine

**Manquants**:

#### 6.1 Export Bulletins de Paie

**Format**: PDF
**Contenu**: Salaire brut, cotisations, net à payer
**Effort**: 3 jours

```
[ ] Design template bulletin
[ ] Calculs cotisations sociales
[ ] Génération PDF (jsPDF)
[ ] Stockage documents (Supabase Storage)
[ ] Historique bulletins (table DB)
```

#### 6.2 Export Planning (PDF/Excel)

**Formats**: PDF, Excel, iCal
**Effort**: 2 jours

```
[ ] Export PDF planning mensuel
[ ] Export Excel (heures détaillées)
[ ] Export iCal (intégration calendriers)
[ ] Filtres avancés (employé, période)
```

#### 6.3 Archivage Documents

**Effort**: 2 jours

```
[ ] Table documents (metadata)
[ ] Upload documents administratifs
[ ] Catégorisation (contrat, bulletin, justificatif)
[ ] Recherche documents
[ ] Prévisualisation
```

**Timeline**: Semaines 12-13/2026

---

### 7. 👥 Gestion Avancée Équipe

**Impact**: 🟡 IMPORTANT - UX
**Effort**: 1 semaine

**Fonctionnalités manquantes**:

#### 7.1 Recherche & Filtres Auxiliaires

```
[ ] Recherche par nom, compétences
[ ] Filtres (disponibilité, distance, qualifications)
[ ] Tri (nom, distance, tarif)
[ ] Vue carte (géolocalisation)
```

**Effort**: 2 jours

#### 7.2 Historique Interventions

```
[ ] Liste interventions passées par auxiliaire
[ ] Statistiques (ponctualité, heures effectuées)
[ ] Évaluations/Feedbacks
[ ] Export historique
```

**Effort**: 2 jours

#### 7.3 Gestion Disponibilités

```
[ ] Template disponibilités récurrent
[ ] Exceptions (congés, indisponibilités)
[ ] Vue calendrier disponibilités
[ ] Conflits détectés automatiquement
```

**Effort**: 3 jours

**Timeline**: Semaines 14-15/2026

---

### 8. 📊 Analytics & Reporting

**Impact**: 🟡 IMPORTANT - Business intelligence
**Effort**: 2 semaines

**Dashboards à créer**:

#### 8.1 Dashboard Employeur

```
[ ] Coût total mensuel (par employé, par période)
[ ] Heures travaillées (graphiques)
[ ] Taux de présence auxiliaires
[ ] Conformité (score, alertes)
[ ] Prévisions budget
```

#### 8.2 Dashboard Auxiliaire

```
[ ] Revenu mensuel (détaillé)
[ ] Heures travaillées vs contractuelles
[ ] Prochains shifts
[ ] Historique interventions
```

#### 8.3 Exports Statistiques

```
[ ] Export Excel (toutes données)
[ ] Graphiques imprimables (PDF)
[ ] Comparaisons période N vs N-1
```

**Effort**: 2 semaines
**Timeline**: Semaines 16-18/2026

---

## 🟢 PRIORITÉ 2 - AMÉLIORATIONS (Recommandé)

### 9. 🎨 UI/UX Améliorations

**Impact**: 🟢 MOYEN - Confort utilisateur
**Effort**: Variable

#### 9.1 Design System Complet

```
[ ] Documentation composants (Storybook?)
[ ] Variantes composants (sizes, colors)
[ ] Tokens design (spacing, colors, typography)
[ ] Guidelines accessibilité
```

**Effort**: 1 semaine

#### 9.2 Onboarding Utilisateur

```
[ ] Tour guidé première connexion
[ ] Tooltips contextuels
[ ] Vidéos tutoriels
[ ] FAQ intégrée
```

**Effort**: 1 semaine

#### 9.3 Responsive Mobile Amélioré

```
[ ] Optimisation touch targets
[ ] Navigation mobile simplifiée
[ ] Gestes tactiles (swipe, pinch)
[ ] Mode offline (PWA)
```

**Effort**: 1 semaine

**Timeline**: Q2 2026

---

### 10. 🔍 Recherche & Filtres Globaux

**Impact**: 🟢 MOYEN - Productivité
**Effort**: 1 semaine

```
[ ] Barre recherche globale (Cmd+K)
[ ] Recherche full-text (shifts, logs, messages)
[ ] Filtres sauvegardés (favoris)
[ ] Recherche vocale (Speech Recognition déjà implémentée)
```

**Timeline**: Q2 2026

---

### 11. 📱 Application Mobile Native

**Impact**: 🟢 IMPORTANT (long terme) - Market fit
**Effort**: 3-6 mois

**Options**:
1. **React Native** (même code React)
2. **Capacitor** (wrapper PWA)
3. **Flutter** (nouvelle codebase)

**Recommandation**: Capacitor (PWA → native rapidement)

**Actions**:
```
[ ] Étude de faisabilité
[ ] Choix technologie
[ ] Prototype
[ ] Développement iOS/Android
[ ] Publication stores
```

**Timeline**: Q3-Q4 2026

---

### 12. 🌐 Internationalisation (i18n)

**Impact**: 🟢 FAIBLE (pour l'instant) - Expansion
**Effort**: 2 semaines

**Actuellement**: Interface en français uniquement

**Actions**:
```
[ ] Bibliothèque i18n (react-i18next)
[ ] Extraction strings (clés de traduction)
[ ] Fichiers traduction (fr, en, es?)
[ ] Sélecteur langue
[ ] Format dates/nombres localisé
[ ] Traduction documents exports
```

**Timeline**: Q3 2026 (si expansion hors France)

---

### 13. 🔐 Sécurité Avancée

**Impact**: 🟢 IMPORTANT - Protection
**Effort**: Variable
**Document**: `docs/SECURITY_ANALYSIS.md`

#### 13.1 Authentification 2FA

```
[ ] TOTP (Google Authenticator, Authy)
[ ] SMS (Twilio)
[ ] Email (code de secours)
[ ] Recovery codes
```

**Effort**: 1 semaine
**Timeline**: Q2 2026

#### 13.2 Rate Limiting

```
[ ] Configuration Supabase (API limits)
[ ] Rate limiting custom (Edge Functions)
[ ] Alerts dépassement limites
```

**Effort**: 2 jours
**Timeline**: Q2 2026

#### 13.3 Chiffrement Données Sensibles

```
[ ] pgsodium installation
[ ] Chiffrement handicap_type, specific_needs
[ ] Clés gestion (vault)
[ ] Migration données existantes
```

**Effort**: 1 semaine
**Timeline**: Q3 2026 (si conformité stricte)

#### 13.4 Headers Sécurité

```
[ ] Content-Security-Policy
[ ] X-Frame-Options
[ ] X-Content-Type-Options
[ ] Referrer-Policy
```

**Effort**: 1 heure (config hosting)
**Timeline**: Cette semaine

---

## 📋 BACKLOG - À PRIORISER

### 14. Fonctionnalités Avancées

#### 14.1 Messagerie Temps Réel Améliorée

- [ ] Pièces jointes (images, documents)
- [ ] Émojis/réactions
- [ ] Recherche dans messages
- [ ] Archivage conversations
- [ ] Appels vidéo (WebRTC?)

**Effort**: 2 semaines

#### 14.2 Gestion Inventaire Matériel

- [ ] Liste matériel médical
- [ ] Traçabilité utilisation
- [ ] Alertes péremption/maintenance
- [ ] Commandes/réapprovisionnement

**Effort**: 1 semaine

#### 14.3 Formation & Certifications

- [ ] Parcours formation obligatoire
- [ ] Certifications (dates validité)
- [ ] Modules e-learning
- [ ] Suivi progression

**Effort**: 3 semaines

#### 14.4 Facturation Automatisée

- [ ] Génération factures mensuelles
- [ ] Paiement en ligne (Stripe)
- [ ] Historique paiements
- [ ] Relances automatiques

**Effort**: 2 semaines

#### 14.5 IA & Automation

- [ ] Suggestions planning optimal (ML)
- [ ] Prédiction absences (pattern recognition)
- [ ] Chatbot support (FAQ)
- [ ] Reconnaissance vocale améliorée

**Effort**: Variable (R&D requis)

---

## 🧪 Tests & Qualité

### 15. Tests E2E (End-to-End)

**Impact**: 🟡 IMPORTANT - Qualité
**Effort**: 2 semaines
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md` (Phase 4)

**Setup Playwright**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Scénarios critiques**:
```
[ ] Auth flow (signup → login → profile)
[ ] Création contrat → Shifts → Validation conformité
[ ] Export CESU bout-en-bout
[ ] Notifications push
[ ] Gestion équipe complète
```

**Effort**: 2 semaines
**Timeline**: Q2 2026

---

### 16. Performance & Optimisation

**Impact**: 🟡 IMPORTANT - UX
**Effort**: 1 semaine

#### 16.1 Bundle Size Optimization & Code Splitting

**Constat audit 09/02/2026** : Toutes les pages étaient importées de manière synchrone dans `App.tsx`.
**Correction 10/02/2026** : 11 pages converties en `React.lazy()` + `<Suspense>` global avec fallback `<LoadingPage />`. Seuls les composants auth (LoginForm, SignupForm, etc.) restent en import statique (chemin critique).

```
[ ] Analyse bundle (vite-bundle-visualizer)
[x] Code splitting avec React.lazy() + Suspense sur toutes les routes (10/02/2026)
[ ] Tree shaking
[ ] Compression assets
[ ] CDN pour assets statiques
[ ] Mesurer le gain (target : <200KB initial, <500KB total)
```

**Cible**: < 200KB initial bundle

#### 16.2 Performance Runtime

**Constat audit 09/02/2026** : `calculateNightHours()` dans `utils.ts:118` itère minute par minute (720 itérations pour un shift de 12h). Peut être remplacé par un calcul d'intervalles en O(1). `refetchOnWindowFocus: false` dans React Query désactive le rafraîchissement automatique, risque de données périmées en multi-utilisateurs.

```
[ ] Optimiser calculateNightHours() avec calcul d'intervalles (pas de boucle)
[ ] Évaluer refetchOnWindowFocus: true pour les données collaboratives (shifts, messages)
[ ] React.memo sur composants lourds
[ ] useMemo/useCallback optimisations
[ ] Virtualization listes longues
[ ] Image lazy loading
[ ] Service Worker caching
```

#### 16.3 Monitoring

```
[ ] Web Vitals tracking
[ ] Sentry error tracking
[ ] LogRocket session replay
[ ] Uptime monitoring (UptimeRobot)
```

**Timeline**: Q2 2026

---

## 📅 Timeline Globale 2026

### Q1 2026 (Janvier - Mars)

**Semaine 6** (Terminée ✅):
- ✅ Logger centralisé (créé + intégré dans tous les fichiers)
- ✅ Fix majorations hardcodées (MAJORATION_RATES + calculateOvertimeHours)
- 🟡 Finaliser Web Push (config VAPID restante)

**Semaine 7** (10-14 février):
- ✅ Corrections sécurité post-audit (clé VAPID, git init, fallback Supabase, sanitisation, FK fix)
- ✅ Créer ProtectedRoute + sanitisation 6 services + fail-fast Supabase
- ✅ Migration 024 : auto-création employees/employers à l'inscription + backfill
- ✅ Extraire `mapProfileFromDb()` + `createDefaultProfile()`, supprimer duplications useAuth.ts
- ✅ Ajouter Error Boundary global (`ErrorBoundary.tsx` dans `main.tsx`)
- ✅ Code splitting : 11 pages en `React.lazy()` + `Suspense`
- ✅ Type safety : 5 interfaces DB ajoutées, 9 mappers typés, 0 `as any` / 0 `eslint-disable` type
- ✅ Refonte système d'absences — conformité IDCC 3239 (PR #67)
- ✅ Label "brut" taux horaire (PR #68)
- ✅ Interventions 24h + affichage multi-jours calendrier + conflit absence/shift (PR #69)
- ✅ Fix bugs validation formulaire absence (PR #70)
- ✅ Analyse modernité code mise à jour (`CODE_MODERNITY_ANALYSIS.md`)
- ✅ **Sprint tests massif** : 13/13 services testés + 4 hooks + declarationService (786 tests, 37% coverage)
- 🟡 Finaliser Web Push (avec nouvelles clés VAPID régénérées)

**Semaines 8-10**:
- 🟡 Tests hooks restants (useComplianceMonitor, usePushNotifications) — Phase 2b
- 🟡 Notifications Email
- 🟡 Vérification téléphone SMS
- 🟡 Setup GitHub Actions coverage

**Semaines 11-13**:
- 🟡 Tests composants UI critiques (Phase 3 — pour atteindre 60%)
- 🟡 Export documents amélioré
- 🟢 Headers sécurité

### Q2 2026 (Avril - Juin)

**Semaines 14-18**:
- 🔴 Tests UI composants (Phase 3)
- 🟡 Gestion équipe avancée
- 🟡 Analytics & Reporting
- 🟢 2FA

**Semaines 19-22**:
- 🟢 UI/UX améliorations
- 🟢 Onboarding
- 🟢 Performance optimization
- 🔴 Tests E2E (Phase 4)

**Semaine 23-26**:
- Stabilisation
- Bug fixes
- Documentation
- Préparation release v1.0

### Q3 2026 (Juillet - Septembre)

- 🟢 i18n (si expansion)
- 🟢 Chiffrement données
- 📱 Exploration app mobile
- Backlog features (selon priorités)

### Q4 2026 (Octobre - Décembre)

- 📱 App mobile (si validé)
- IA/ML features (si budget)
- Maintenance & stabilité
- Planning 2027

---

## 📊 Métriques de Succès

### Objectifs Q1 2026

- [x] Coverage tests ≥ 30% (atteint 37% le 12/02/2026) ✅
- [ ] Coverage tests ≥ 60% (cible Q2 — nécessite tests composants UI)
- [ ] 0 bugs critiques en production
- [x] **NOUVEAU** : 0 secrets exposés dans le filesystem (clé VAPID, .env protégé par git) ✅
- [x] **NOUVEAU** : Toutes les routes protégées par garde centralisée (ProtectedRoute) ✅ 10/02/2026
- [x] **NOUVEAU** : Sanitisation systématique des entrées utilisateur dans tous les services ✅ 10/02/2026
- [x] **NOUVEAU** : Client Supabase fail-fast si env vars manquantes ✅ 10/02/2026
- [x] **NOUVEAU** : Trigger handle_new_user crée employees/employers automatiquement ✅ 10/02/2026
- [x] **NOUVEAU** : Error Boundary global (crash = écran de secours, pas écran blanc) ✅ 10/02/2026
- [x] **NOUVEAU** : Code splitting React.lazy() sur 11 pages (bundle initial allégé) ✅ 10/02/2026
- [x] **NOUVEAU** : 0 `as any` et 0 `eslint-disable` type dans le codebase ✅ 10/02/2026
- [x] Notifications in-app + Realtime (Supabase)
- [ ] Notifications multi-canal Push + Email (Push: code prêt, config manquante)
- [ ] Export documents conformes légalement (majorations en cours)
- [x] Logger production sécurisé (✅ logger.ts avec redaction)

### Objectifs Q2 2026

- [ ] Coverage tests ≥ 70%
- [ ] Tests E2E critiques passent
- [ ] Score Web Vitals > 90
- [ ] 2FA disponible
- [ ] Analytics complets

### Objectifs Q3-Q4 2026

- [ ] App mobile (beta)
- [ ] i18n support
- [ ] Chiffrement données sensibles
- [ ] 1000+ utilisateurs actifs

---

## 💰 Estimation Budget

### Développement

| Poste | Effort | Coût estimé |
|-------|--------|-------------|
| **P0 - Bugs critiques** | 2 semaines | Interne |
| **P0 - Tests** | 6 semaines | Interne |
| **P1 - Fonctionnalités** | 8 semaines | Interne |
| **P2 - Améliorations** | 6 semaines | Interne |
| **Total dev** | **22 semaines** | - |

### Services Externes (Mensuel)

| Service | Coût/mois | Notes |
|---------|-----------|-------|
| Supabase (Pro) | ~25€ | Database, Auth, Storage |
| Twilio (SMS) | ~20-50€ | Vérification + notifications |
| SendGrid/Resend | ~10-30€ | Email notifications |
| Sentry | ~20€ | Error tracking |
| Codecov | Gratuit | Open source |
| **Total** | **~75-125€/mois** | |

### Infrastructure

- Hosting: Netlify/Vercel (gratuit ou ~20€/mois)
- Domain: ~15€/an
- SSL: Gratuit (Let's Encrypt)

**Budget total estimé**: ~100-150€/mois en production

---

## 👥 Ressources Requises

### Équipe Recommandée

**Minimum viable**:
- 1 Full-stack developer (React + Supabase)
- 1 QA/Tester (temps partiel)

**Idéal**:
- 1 Frontend developer (React/TypeScript)
- 1 Backend developer (Supabase/PostgreSQL)
- 1 QA engineer
- 1 UX/UI designer (temps partiel)
- 1 Product manager (temps partiel)

### Compétences Clés

- ✅ React 19 + TypeScript
- ✅ Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- ✅ Tests (Vitest, Testing Library, Playwright)
- ⚠️ Conformité métier (Code du travail, CC IDCC 3239)
- ⚠️ Sécurité (RGPD, OWASP)

---

## 📚 Documentation Associée

- `docs/SECURITY_ANALYSIS.md` - Analyse sécurité complète
- `docs/TEST_COVERAGE_ANALYSIS.md` - Plan tests détaillé
- `docs/issues/HARDCODED_MAJORATIONS_ISSUE.md` - Bug critique exports
- `docs/TODO_NOTIFICATIONS.md` - Détails notifications
- `docs/PHONE_VERIFICATION.md` - Vérification SMS
- `docs/compliance/README.md` - Règles métier conformité
- `CODE_MODERNITY_ANALYSIS.md` - Analyse modernité du code (mise à jour 11/02/2026)
- `README.md` - Setup & installation

> **Note** : Audit complet multi-domaines réalisé le 09/02/2026 couvrant sécurité, qualité, architecture, accessibilité et performance. Les résultats sont intégrés dans cette roadmap aux sections P0 (0a-0f), 2b (✅ corrigé 10/02/2026), 2c, et 16 (16.1 code splitting ✅). Semaine 7 : 4 PRs mergées (absences IDCC 3239, interventions 24h, label brut, fix validation) + sprint tests massif le 12/02 (786 tests, couverture 37%, objectif Q1 atteint).

---

## ✅ Prochaines Actions Immédiates

### Semaine 6 - Bilan (Terminé)

1. ~~**Logger centralisé**~~ ✅ TERMINÉ (03/02/2026)
   - [x] Créer src/lib/logger.ts
   - [x] Remplacer console.* dans tous les fichiers (services, hooks, composants)
   - [x] Redaction données sensibles
   - [x] Intégration dashboard, planning, profile, team, documents

2. ~~**Fix majorations hardcodées**~~ ✅ CORRIGÉ
   - [x] Utiliser MAJORATION_RATES depuis calculatePay.ts (plus de valeurs hardcodées)
   - [x] Calcul réel des heures sup via calculateOvertimeHours()
   - [x] Gestion has_night_action (acte vs présence seule)
   - [ ] Tests unitaires declarationService.test.ts (restant)

### 🚨 URGENT - Actions Immédiates Post-Audit (09/02/2026)

> Ces actions ont été identifiées lors de l'audit complet du 9 février 2026.
> Elles sont prioritaires sur les tâches de la semaine 7.

**0. Sécurité critique (AUJOURD'HUI)**:
   - [x] ✅ Régénérer les clés VAPID et supprimer `.vapid-keys.json` du filesystem (09/02/2026)
   - [x] ✅ Dépôt git initialisé, `.gitignore` actif (09/02/2026)
   - [x] ✅ Vérifié : `.env` et `.vapid-keys.json` sont bien exclus de git (09/02/2026)
   - [x] ✅ Secrets VAPID configurés sur Supabase + Edge Function redéployée v12 (09/02/2026)
   - [x] ✅ Migrations synchronisées (22 marquées applied) (09/02/2026)
   - [x] ✅ config.toml corrigé (clés non supportées retirées) (09/02/2026)
   - [x] ✅ Faire échouer explicitement le client Supabase si env vars manquantes (10/02/2026)

**1. Protection des routes** ✅ (10/02/2026):
   - [x] Créer composant `<ProtectedRoute>` centralisé
   - [x] L'appliquer à toutes les routes authentifiées dans `App.tsx`
   - [x] Ajouter support restriction par rôle (`allowedRoles`)
   - [x] Supprimer les gardes auth individuelles dans 9 composants

**2. Sanitisation des entrées** ✅ (10/02/2026):
   - [x] Appliquer `sanitizeText()` sur `notes`/`tasks` dans `shiftService.ts`
   - [x] Auditer et corriger les autres services (liaison, absence, logbook, profile, caregiver)

**2b. Fix FK constraint** ✅ (10/02/2026):
   - [x] Migration 024 : handle_new_user crée employees/employers automatiquement
   - [x] Rattrapage utilisateurs existants (backfill)
   - [x] Validation côté front (profileComplete check)

**3. Qualité code** ✅ (10/02/2026):
   - [x] Créé `src/lib/mappers.ts` avec `mapProfileFromDb()` + `createDefaultProfile()`
   - [x] Supprimé 4 blocs dupliqués et 2 `as any` dans `useAuth.ts`
   - [x] Ajouté Error Boundary global dans `main.tsx` (`src/components/ui/ErrorBoundary.tsx`)
   - [x] Code splitting : 11 pages en `React.lazy()` + `Suspense` dans `App.tsx`
   - [x] Typé 9 mappers dans 7 services (5 nouvelles interfaces DB dans `database.ts`)
   - [x] Éliminé 13/14 `eslint-disable` (1 restant justifié : `react-hooks/exhaustive-deps`)

### Cette Semaine (Semaine 7 - 10-14 février)

3. **Tests declarationService** ✅ (12/02/2026)
   - [x] Créé declarationService.test.ts (34 tests)
   - [ ] Tests d'intégration export CESU
   - [ ] Code review + Merge

4. **Web Push finalization**
   - [ ] ~~Générer clés VAPID~~ → Inclus dans actions urgentes ci-dessus
   - [ ] Config variables env (VITE_VAPID_PUBLIC_KEY)
   - [ ] Déployer Edge Function send-push-notification
   - [ ] Tests navigateurs

5. **Sprint tests services + hooks** ✅ (12/02/2026)
   - [x] 13/13 services testés (488 tests services au total)
   - [x] 4/8 hooks testés (useNotifications, useComplianceCheck, useShiftReminders)
   - [x] Couverture services : 91.42% statements
   - [ ] Setup GitHub Actions coverage (30 min)

### Semaine Prochaine (Semaine 8 - 17-21 février)

6. **Tests hooks restants** (Phase 2b)
   - [ ] useComplianceMonitor.test.ts
   - [ ] usePushNotifications.test.ts

7. **Setup CI/CD tests**
   - [ ] GitHub Actions : vitest run --coverage sur chaque PR
   - [ ] Badge coverage dans README

8. **Début tests composants UI** (Phase 3, pour atteindre 60%)
   - [ ] Dashboard widgets prioritaires
   - [ ] Planning views (WeekView, MonthView)

---

## 🔄 Cycle de Review

- **Hebdomadaire**: Review roadmap, ajustements priorités (chaque lundi)
- **Mensuel**: Analyse métriques, retrospective
- **Trimestriel**: Stratégie, budget, recrutement

> **Dernière review**: 12 février 2026 - Sprint tests massif (786 tests, 37% coverage, 13/13 services testés, 4/8 hooks testés)

---

**Maintenu par**: Tech Lead
**Prochaine revue**: 17 février 2026
**Feedback**: [Ouvrir une issue](https://github.com/zephdev-92/Unilien/issues)
