# 🗺️ Roadmap de Développement - Unilien

**Dernière mise à jour**: 10 avril 2026 (2210 tests / 126 fichiers — revue roadmap complète, 96/102 prototype items, E2E Playwright, email Resend, 2FA TOTP, OAuth)
**Version**: 1.15.0
**Statut projet**: 🟡 En développement actif

---

## 📊 Vue d'Ensemble

### État Actuel

| Catégorie | Complétude | Statut |
|-----------|------------|--------|
| **Authentification** | 99% | ✅ Excellent (login, signup, reset, rôles, OAuth Google/Microsoft, 2FA TOTP, recovery codes V2) |
| **Dashboards** | 95% | ✅ Excellent (3 dashboards rôle-spécifiques + mobile aidant, dark mode, onboarding widget, CTAs dynamiques — demo banner + empty state manquants) |
| **Planning** | 98% | ✅ Excellent (semaine/mois, shifts 24h, absences IDCC 3239, conflits, répétition, TaskSelector + courses) |
| **Cahier de liaison** | 85% | 🟡 Bon (realtime, typing indicators, pièces jointes — réactions emoji/search/archive manquants) |
| **Équipe/Contrats** | 90% | ✅ Bon (contrats, aidants, permissions — recherche avancée, disponibilités, évaluations V2) |
| **Conformité** | 95% | ✅ Excellent |
| **Documents/Export** | 90% | 🟡 Bon (bulletins v2, @react-pdf/renderer, CESU, planning exports — search + table unifiée manquants) |
| **Notifications** | 85% | 🟡 Bon (in-app + push + email Resend OK — SMS + vérification tél manquants) |
| **Tests** | 54% stmts | 🟡 Bon (2210 tests / 126 fichiers, E2E Playwright 8 tests — Phase 3 UI + plus de scénarios E2E à faire) |
| **Sécurité** | 98% | ✅ Excellent (RLS renforcé 041-049, RGPD art. 9, audit trail, droit effacement, CSP enforced — pgsodium V3) |
| **Qualité code** | 98% | ✅ Excellent (0 `select('*')`, 0 Supabase direct dans composants, Provider snippet v3, 0 `as any`, 0 `eslint-disable` type) |

### Métriques Clés

- **Fichiers source**: ~270 fichiers TS/TSX (hors tests)
- **Tests**: 2210 tests / 126 fichiers (54% stmts — 54/40/40/50 seuils) + 8 tests E2E Playwright
- **Migrations DB**: 49 migrations
- **Composants UI**: ~145 composants
- **Services**: 30 services
- **Hooks**: 24 hooks custom
- **Routes**: 18 routes francisées (dont 10 protégées avec ErrorBoundary individuel)
- **Prototype Gap**: 96/102 items (94%) — 6 restants : demo banner, empty state, contact, palette, confidentialité, empty states onboarding

---

## ✅ Réalisations Récentes (Semaines 6-20 - Février/Avril 2026)

### Semaine 20 — 10 avril 2026 (PRs #241–#245)

#### Fix sécurité + E2E (PRs #241–#244 ✅)

- Fix path traversal dans `attachmentService.ts` + `npm audit fix` (#241)
- Tests E2E Playwright : 8 tests auth + dashboard (chromium) (#244)

#### Revue roadmap (PR #245 ✅)

Audit complet des 9 sections de la roadmap :
- Seuils coverage relevés 50/40/40/50 (#230)
- Types `accessibility_settings` + `computed_pay` alignés dans `database.ts` ✅
- Sanitisation 5 services + tests ProtectedRoute vérifiés ✅
- FAQ intégrée (`HelpPage`) ✅, upload documents Storage ✅, rate limiting Edge Functions ✅
- Tokens design : colors/typography ✅, spacing custom ⏳
- PWA offline : assets + Storage ✅, `/rest/v1/` exclu volontairement ⏳
- Table documents : upload + prévisualisation ✅, search + table unifiée ⏳

#### Prototype Gap Checklist (10/04/2026)

- **96/102 items terminés** (était 88/102)
- 2FA toggle ✅ (PR #220), email notifications ✅ (PR #240), onboarding banner ✅ (PR #237) — mis à jour dans checklist
- 6 items restants : demo banner, empty state dashboard, contact (optgroups + PJ), palette couleurs, confidentialité toggles, empty states onboarding

#### Métriques session (10/04/2026)
- PRs : #241–#245
- Tests : 2210 / 126 fichiers + 8 E2E Playwright
- Migrations : 49

---

### Semaine 19 — 5-9 avril 2026 (PRs #227–#240)

#### Tests & couverture (PRs #227–#231 ✅)

- Fix test timezone-dependent `auxiliaryService` (#227)
- Tests unitaires `accountService` — suppression données/compte (#228)
- Tests unitaires `conventionSettingsService` (#229)
- Seuils coverage relevés à 50/40/40/50 (#230)
- Mise à jour stats coverage (2199 tests / 125 fichiers / 54%) (#231)

#### Dashboard enrichi (PRs #232–#234 ✅)

- `WelcomeCard` centré mobile + fix nudge mois bulletin (#232)
- Logo responsive homepage + logo cliquable dashboard (#233)
- CTA dynamique employé selon shifts du jour (#234)

#### Page aide (PR #235 ✅)

- Nouvelle `HelpPage` avec 9 sections : prise en main, planning, contrats, conformité, documents, messagerie, notifications, export, compte
- Route `/aide` accessible depuis la nav

#### Dashboard onboarding (PRs #236–#237 ✅)

- Widget onboarding pour nouveaux utilisateurs (checklist complétude) (#237)
- Fix nudge bulletin : exclusion contrats futurs (#236)

#### OAuth social login (PR #238 ✅)

- `SocialLoginButtons` : Google + Microsoft
- `AuthCallbackPage` : gestion callback OAuth
- `OnboardingRolePage` : sélection rôle pour nouveaux comptes OAuth
- Providers configurés : Google ✅, Azure/Microsoft ✅
- Redirect URI Supabase : `https://lczfygydhnyygguvponw.supabase.co/auth/v1/callback`

#### Fix copy homepage (PR #239 ✅)

- Titre hero : "auxiliaires de vie" + corrections formulations

#### Email notifications Resend (PR #240 ✅)

- Edge Function `send-email` : Resend API, JWT auth, rate limiting 10/min
- `emailService.ts` : templates HTML rappel intervention J-1 + nouveau message
- Branché dans `notificationCreators.ts` (shift reminder + message)
- Préférences e-mail fonctionnelles dans SettingsPage (plus de badge "Bientôt")
- Fix PGRST100 : `not.read_by.cs` → `read_by.not.cs` dans `liaisonService`
- Migration `049` : correctif email profil

#### Métriques session (09/04/2026)
- PRs : #227–#240
- Tests : 2210 / 126 fichiers
- Migrations : 49

---

### Semaine 16 — 3 avril 2026 (PRs #218–#220)

#### Refonte textes homepage (PRs #218-#219 ✅)

Refonte complète du copy de la page d'accueil pour un ton plus rassurant :
- Hero : nouveau titre/sous-texte, CTA "30 jours gratuits", preuves simplifiées
- Pain points : reformulation empathique, moins alarmiste
- Features : descriptions simplifiées, section conformité humanisée
- Tarifs : 3 plans → 1 plan Essentiel centré (30 jours, auxiliaires illimités)
- CTA final : "Simplifiez votre quotidien dès aujourd'hui"
- Settings : panneau abonnement simplifié (plan unique Essentiel)

#### 2FA TOTP (PR #220 ✅)

Authentification à deux facteurs via Supabase MFA natif :
- Hook `useMfa` (enroll, verify, unenroll, AAL check, nettoyage facteurs non vérifiés)
- `MfaEnrollment` : QR code + copie clé + vérification code 6 chiffres
- `MfaChallenge` : écran intermédiaire au login
- Card 2FA fonctionnelle dans Settings > Sécurité (activer/désactiver)
- Intégration LoginForm : détection AAL → challenge MFA avant redirection
- `mfaPending` dans auth store pour éviter race condition
- ProfileSidebar connecté au vrai état MFA

#### Métriques session (03/04/2026)
- PRs : #218–#220
- Nouveaux fichiers : `useMfa.ts`, `MfaEnrollment.tsx`, `MfaChallenge.tsx`
- Tests : 2165 / 122 fichiers

### Semaine 14-15 — 30-31 mars 2026 (PRs #203–#207)

#### RGPD données de santé (PR #203 ✅)

Conformité RGPD article 9 — données de santé :
- Modal consentement santé (`HealthDataConsentModal`) + hook `useHealthConsent`
- Table `employer_health_data` séparée avec RLS owner-only (migration 043)
- Table `user_consents` pour traçabilité consentement (migration 042)
- Table `audit_logs` immuable (migration 044) + `auditService.ts`
- `EmployerSection` bloque champs santé sans consentement
- `SettingsPage` > Données : panneau grant/revoke consentement
- 17 nouveaux tests (8 hook + 9 composant)

#### Fix login error messages (PR #204 ✅)

- Correction message d'erreur invisible sur mauvais mot de passe
- `Box as="form"` → `<form>` natif (Chakra v3 ne forward pas onSubmit)
- Messages d'erreur traduits en français (credentials, email, rate limit, réseau)
- Fix `PublicRoute` qui unmount le formulaire pendant `isLoading`

#### Persistance déclarations CESU (PR #205 ✅)

Les déclarations CESU survivent maintenant au rechargement de page :
- Migration 045 : table `cesu_declarations` (JSONB snapshot + colonnes dénormalisées)
- Service `cesuDeclarationService.ts` : save (upsert), get, delete + upload/download PDF
- Bucket Storage `cesu-declarations` avec RLS
- `CesuDeclarationSection` : chargement DB au mount, sauvegarde après génération, bouton supprimer

#### Fix absences et filtres documents (PR #206 ✅)

- 5 filtres sur l'onglet absences : employé, mois, type, statut, justificatif
- Absences aidants visibles (requête `caregiver_id` ajoutée dans `documentService`)
- Fix téléchargement justificatif 404 : stockage chemin → URL signée à la demande
- Migration 046 : policy RLS pour justificatifs aidants

#### Zone de danger — suppression compte/données (PR #207 ✅)

- Migration 047 : 2 RPC `SECURITY DEFINER` (`delete_own_account`, `delete_own_data`)
- Service `accountService.ts` : `deleteAllUserData()` + `deleteAccount()`
- UI : double confirmation par saisie (SUPPRIMER / SUPPRIMER MON COMPTE)
- Gestion tables sans CASCADE + anonymisation audit_logs (RGPD art. 17)

#### Métriques session (31/03/2026)
- Migrations DB : 41 → 47 (+6)
- Services : +2 (`cesuDeclarationService`, `accountService`)
- PRs : #203–#207

#### Convention settings → Supabase DB (PR #208 ✅)

Persistance des paramètres de convention IDCC 3239 depuis localStorage vers Supabase :
- Migration 048 : table `convention_settings` avec RLS owner-only
- Service `conventionSettingsService.ts` + store Zustand double persistance (localStorage + Supabase debounced)
- Hook `useConventionSettings` auto-load/sync
- Panneau Convention : auto-save + loading spinner (plus de bouton "Enregistrer" manuel)

#### Accessibilité outillage (PR #210 ✅)

- axe-core intégré en mode dev (`@axe-core/react` dans `main.tsx`)
- `eslint-plugin-jsx-a11y` ajouté à la config ESLint
- Fix `AccessibleButton` : suppression `VisuallyHidden` redondant

#### Métriques session (01/04/2026)
- Tests : 2167 / 122 fichiers
- Coverage stmts : 54.03%
- Migrations DB : 41 → 48 (+7 depuis 23/03)
- Services : +3 (`cesuDeclarationService`, `accountService`, `conventionSettingsService`)
- Hooks : +1 (`useHealthConsent`, `useConventionSettings`)

### Semaine 13 — ~19-23 mars 2026 (PRs #183–#194)

#### Dark mode complet (PR #192 ✅)

Implémentation du dark mode sur l'ensemble de l'application avec tokens sémantiques :
- Toggle dark/light mode fonctionnel (Paramètres > Apparence)
- ~237 couleurs hex hardcodées migrées vers les tokens Chakra UI v3 (PR #185)
- Tokens sémantiques : `bg.surface`, `text.primary`, `text.muted`, `border.default`, etc.
- Cohérence visuelle totale dark/light sur les 18 routes

#### Fix 21 violations WCAG (PR #186 ✅)

Résolution des violations d'accessibilité issues de l'audit WCAG 2.2 AA :
- Ratios de contraste insuffisants corrigés
- Labels manquants sur formulaires et boutons icônes
- Focus visible sur tous les éléments interactifs
- Aria attributes manquants ajoutés

#### Toast notifications (PR #191 ✅)

Ajout de feedback visuel via toasts sur les pages clock-in, planning et équipe :
- Toasts succès/erreur/warning cohérents avec le système Chakra UI v3
- Actions : clock-in/out, création/modification shift, approbation absence, invitation équipe

#### Redesign page Documents (PR #190 ✅)

Refonte de la page Documents pour aligner sur le prototype :
- Onglets : Bulletins → Contrats → Absences → Export planning → Déclarations CESU
- Fix PDFs flous, en-têtes alignés sur le prototype, filtre contrats aidants (PR #194)

#### Cookie consent banner + Legal page (PR #193 ✅)

- Bannière de consentement cookies conforme CNIL
- Page mentions légales (`/mentions-legales`) mise à jour

#### Flow invitation aidants (PR #188 ✅)

- `feat(team)` : flow complet d'invitation aidants
- Fix gestion erreurs invitation employés
- Fix client admin JWT dans Edge Functions (PR #189)

#### Métriques session (~23/03/2026)
- Design tokens : 237 hex → tokens sémantiques (PR #185)
- Migrations DB : 41 (inchangé à ce stade)

---

### ~27-28 mars 2026 — Migration PDF (PR #201)

#### Migration jsPDF → @react-pdf/renderer (PR #201 ✅)

Refonte des générateurs PDF pour résoudre les problèmes de qualité :
- Bulletins de paie, CESU, planning exportés via `@react-pdf/renderer`
- PDFs nets (pas de flou), layout React déclaratif
- Meilleure maintenabilité des templates

---

### Semaine 14 — 23 mars 2026 (PRs #180–#181)

#### TaskSelector & intervention settings (PR #180 ✅)

Sélecteur de tâches riche pour les interventions, remplaçant le simple textarea :
- **12 tâches IDCC prédéfinies** avec filtre de recherche
- **Liste de courses imbriquée** : quantités, marques, notes, autocomplete clavier (ARIA combobox)
- **Tâches personnalisées** : limite 20, déduplication case-insensitive
- **Panneau Paramètres > Interventions** : tâches par défaut + liste courses type (employer only)
- **Store Zustand** avec double persistance localStorage + Supabase (debounced)
- Migration `040` : tables `intervention_settings` + `shopping_article_history`
- Intégration dans `NewShiftModal`, `ShiftEditForm`, `ShiftDetailModal`, `ShiftDetailView`
- 77 nouveaux tests (fonctions pures, service, composant)

#### Audit règles .claude/rules — Sécurité & qualité code (PR #181 ✅)

Audit complet du codebase contre les 6 fichiers de règles (`.claude/rules/`). Corrections appliquées :

**Code quality** :
- 16 `select('*')` remplacés par des sélections explicites de colonnes dans 12 services
- 2 nouveaux services extraits : `nudgeService.ts`, `dataExportService.ts` (suppression imports Supabase directs dans composants)
- Fix bug latent : requête payslips filtrait sur colonne inexistante `period_start` → corrigé en `year`/`month`

**Sécurité (11 vulnérabilités corrigées — 3 critiques, 3 hautes, 5 moyennes)** :
- Migration `041_security_fixes.sql` : RLS renforcé (caregiver auto-élévation, IDOR notifications, profils exposés, conversations non autorisées)
- URL validation 5 couches : RPC SQL, service, NotificationsPanel, pushService, sw-push.js
- Signed URLs pour buckets privés (justifications, attachments) — remplacement `getPublicUrl`
- CSP enforced (`Content-Security-Policy` au lieu de `Report-Only`)
- Path traversal fix dans `attachmentService.ts` (sanitisation nom fichier)
- Champ `legal_status` aidant verrouillé côté UI (disabled)

**Chakra UI v3 conventions** :
- Création `src/components/ui/provider.tsx` (snippet Provider v3)
- Migration `ChakraProvider` → `Provider` dans `main.tsx`, `test/helpers.tsx` et 5 fichiers de test
- Fix `NotificationBell.tsx` : `outline: 'none'` → outline visible (WCAG AAA)

#### Métriques session (23/03/2026)
- Tests : 2084 → 2161 (+77 tests, 119 fichiers)
- 41 migrations DB (était 38)
- ~80 hex hardcodés identifiés → backlog Q2 (migration design tokens sémantiques)

#### Documentation sécurité, accessibilité & SEO (26–27 mars 2026)

Remise à plat des livrables d’audit avec l’état **post-`041_security_fixes.sql`** et **`docs/SECURITY_CHECK_2026-03-26.md`** (régressions Burp / API à rejouer) :

- **IDOR / pentest** : `SECURITY_IDOR_ANALYSIS.md` (tableau + statuts §1–§5), `SECURITY_PENTEST_REPORT.md`, `SECURITY_PENTEST_ARTIFACTS.md` (§4.4 synthèse post-041), `BUG_BOUNTY_REPORTS.md` (Remediation status #1–#3)
- **Synthèses** : `SECURITY_ANALYSIS.md`, `SECURITY_SUMMARY.md`, `SECURITY_XSS_ANALYSIS.md`
- **Offensive** : `OFFENSIVE_SECURITY_REVIEW.md` (Current posture + remediation), `OFFENSIVE_SECURITY_VERIFICATION.md`
- **SEO** : `SEO_LINKS_ANALYSIS.md` — favicon `/Favicon.svg`, encadré de relève 26/03
- **Projet** : `CLAUDE.md` — entrée **`docs/ACCESSIBILITY.md`** dans la liste documentation
- **Rapports déjà présents** dans `docs/` : `ACCESSIBILITY.md`, `CODE_QUALITY_2026-03-26.md`, `SECURITY_CHECK_2026-03-26.md` (référence unique migration 041)

### Semaine 12 — 16 mars 2026 (PRs #158–#164)

#### Dashboard aidant — Mobile + fixes (PR #163 ✅)

Réorganisation complète du dashboard aidant avec layouts séparés desktop/mobile :
- **Mobile** : ordre Timeline → ClockIn → Messages → PCH → Actions → Semaine → Stats
- **Desktop** : Stats en bas, grille 2 colonnes
- 3 nouveaux widgets : `CaregiverShiftTimeline`, `PchMiniWidget`, `WeekSummaryWidget`
- Stats aidant enrichies : `shiftsToday`, `hoursThisMonth`, `pchMonthlyHours`, `pchRemaining`, `documentsToSign`

#### Clock-in & garde 24h — Corrections (PR #163 ✅)

- Fix clock-in utilisant l'heure prévue du shift au lieu de l'heure réelle
- Fix `calculateShiftDuration` retournant 0 quand start===end (au lieu de 24h)
- Heures de fin des segments de garde 24h désormais éditables
- Validation rétroactive accepte les gardes 24h / présence nuit
- Auto-dismiss du message succès après 8 secondes
- WelcomeCard n'affiche plus les heures auxiliaire sur le dashboard aidant

#### Profil auxiliaire — Champs administratifs (PR #164 ✅)

Ajout de 3 champs au profil employé (auxiliaire de vie) :
- **Date de naissance**, **N° sécurité sociale**, **IBAN**
- Migration 037 : nouvelles colonnes sur `employees`
- Validation Zod (format sécu 13-15 chiffres, format IBAN)
- Section "Informations administratives" dans `EmployeeSection`

#### Métriques session (16/03/2026)
- Tests : 2026 → 2084 (+58 tests, 116 fichiers)
- 37 migrations DB (était 36)

### Semaine 12-13 — 15-16 mars 2026 (PRs #158–#165)

#### Prototype alignment, retroactive clock-in & mobile responsive (PR #158 ✅)

- Timeline, leave, documents, clock-in widgets alignés sur le prototype CSS
- DateNavigator 8 jours pour pointage rétroactif, RetroactiveEntryForm, badge "Rétroactif"
- SpotlightSearch : moteur de recherche global Ctrl+K (searchService, useSpotlightSearch)
- Mobile responsive : boutons header condensés, logo icône seule, ordre widgets mobile

#### Caregiver dashboard mobile & clock-in fixes (PR #163 ✅)

- Layout mobile dashboard aidant, corrections clock-in, améliorations garde 24h

#### Employee profile fields (PR #164 ✅)

- Ajout date de naissance, N° sécurité sociale, IBAN au profil auxiliaire
- Migration 037, composant `MaskedValue` (afficher/masquer avec bouton outline)
- Validation Zod (SSN 13-15 chiffres, IBAN format FR)

#### Employee emergency contacts & liaison fix

- Migration 038 : `emergency_contacts JSONB` sur table `employees`
- Formulaire édition contacts d'urgence (ajout/suppression, nom/téléphone/relation)
- Vue lecture avec avatar, nom, relation, téléphone
- Fix RouteAnnouncer : ajout `/profil` et `/analytique` dans ROUTE_LABELS
- **Fix message double** : `NewConversationModal` avait `onClick` + `type="submit"` sur le bouton Envoyer → double appel `handleSubmit`
- Déduplication realtime INSERT par `message.id` dans LiaisonPage

#### Métriques session (16/03/2026)
- Tests : 2026 → 2084 (+58 tests, 116 fichiers)
- Migrations : 35 → 38

### Semaine 11 — 10 mars 2026 (PRs #154–#155)

#### Documents restructure (PR #154 ✅)

Restructuration complète de la page Documents pour correspondre au prototype :
- Nouveaux onglets : Bulletins → Contrats → Absences → Export planning → Déclarations CESU
- `ContractsSection` : liste des contrats avec statut (Actif/Résilié/Suspendu)
- `DocumentManagementSection` : absences converties en tableau (Employé, Type, Du, Au, Durée, Statut, Actions)
- `PayslipSection` : tableau récapitulatif des bulletins + formulaire de génération

#### Landing page redesign (PR #155 ✅)

Refonte complète de la page d'accueil (11 items checklist) :
- Navigation avec ancres, hero avec risque juridique, 4 stats clés, 3 pain points
- 6 feature cards, section conformité IDCC 3239, 3 témoignages
- 3 plans tarifaires (Gratuit/Essentiel/Pro → simplifié en 1 plan Essentiel PR #218-219), FAQ accordéon, footer complet
- 27 tests couvrant toutes les sections

#### Métriques session (10/03/2026)
- Tests : 2017 → 2026 (+9 tests, 108 fichiers)
- Prototype Gap Checklist : 53/101 → 67/101 (Landing 11/11, Documents 3/3)

### Semaine 10-11 — Mars 2026 (PRs #122–#136)

#### URLs francisées (PR #126 ✅)

Toutes les routes de l'application ont été francisées pour une meilleure UX et cohérence linguistique. Redirect URL Supabase mise à jour en conséquence (PR #127).

#### Fix création intervention travail effectif + validation inter-employeurs (PR #135 ✅)

Correction de deux bugs dans le module planning :
- La création d'intervention de type "travail effectif" ne transmettait pas le `shiftType` lors du reset du formulaire
- La validation quotidienne des heures prenait en compte les shifts d'autres employeurs → corrigée pour filtrer par employeur

#### Répétition d'interventions (PR #136 ✅)

Nouvelle fonctionnalité permettant de répéter une intervention de manière hebdomadaire ou personnalisée :
- Sélection de la fréquence (hebdomadaire, personnalisée)
- Configuration des jours de la semaine
- Le shift original est inclus dans la série générée

#### Conversations privées (PR #137 ✅)

Ajout de conversations privées (1-à-1) entre membres d'une équipe dans le cahier de liaison :
- Migration 035 : table `conversations` (types `team` / `private`, `participant_ids UUID[]`)
- Composants : `ConversationList`, `MessageInput` avec saisie vocale, `NewConversationModal`
- Remplacement de `react-icons` par des SVGs inline (non installé)
- Labels groupes (Général / Conversations), recherche dans la liste
- Tests : `ConversationList.test.tsx` (11 tests), `MessageInput.test.tsx` (28 tests)

#### Dashboard — Alignement prototype (PRs #138–#140 ✅)

- **PR #138** : Greeting enrichi (eyebrow jour/date, chips contextuelles), action nudges, PROTOTYPE_GAP_CHECKLIST créée
- **PR #139** : Planning du jour, tendances stats, alertes conformité sidebar, restructuration layout
- **PR #140** : Planning du jour finalisé, budget forecast, stats trends & compliance alerts

#### Analytics (PR #141 ✅)

Page analytics dédiée (`/analytique`) avec statistiques multi-mois pour employeurs et auxiliaires.

#### Team — Enrichissement (PR #142 ✅)

Cards auxiliaires enrichies (date embauche, heures/semaine, email), recherche employés, flow invitation.

#### Pièces jointes messagerie (09/03/2026)

Implémentation complète de l'upload de pièces jointes dans le cahier de liaison :
- Service `attachmentService.ts` : upload vers bucket `liaison-attachments`, validation (5 Mo max, 5 fichiers/message, JPG/PNG/WebP/GIF/PDF/DOCX)
- `MessageInput` : sélection multi-fichiers, prévisualisation avec nom/taille/suppression
- `MessageBubble` : affichage images (prévisualisation cliquable) et documents (carte icône/nom/taille)
- `liaisonService.createLiaisonMessage()` : paramètre `attachments` ajouté
- Tests : 18 tests attachmentService + tests MessageInput mis à jour

#### Compliance — Redesign dashboard (commit c92f213)

Redesign complet du dashboard conformité : score circulaire SVG, cards alertes avec actions, checks IDCC par catégorie.

#### CI/CD & Dépendances (PRs #128–#130)

- Bump `actions/github-script` v7 → v8
- Bump `actions/upload-artifact` v6 → v7
- Bump dépendances dev

#### Métriques session (09/03/2026)

- **2014 tests** / 108 fichiers (était 1942 / 102)
- 35 migrations DB
- Routes francisées
- Aucune régression (lint + tests passent)

---

### Sprint Refactoring Architectural — 8 PRs (25-26/02/2026)

Décomposition des fichiers monolithiques (> 500 lignes) en modules ciblés, typage précis des types DB, et correction d'un bug de contrainte DB sur les absences.

#### Décompositions (PRs #107–#113)

| PR | Fichier | Avant | Après | Modules extraits |
|----|---------|-------|-------|-----------------|
| #107 ✅ | `ShiftDetailModal.tsx` | 979 lignes | 260 lignes | `useShiftDetailData`, `useShiftEditLogic`, `ShiftEditForm`, `ShiftDetailView` |
| #109 ✅ | `NewShiftModal.tsx` | 811 lignes | 378 lignes | `useNewShiftForm`, `Guard24hSection`, `ShiftHoursSummary` |
| #110 ✅ | `absenceService.ts` | 592 lignes | 469 lignes | `absenceJustificationService.ts` |
| #111 ✅ | `caregiverService.ts` | 582 lignes | 331 lignes | `caregiverTeamService.ts` |
| #112 ✅ | `NewContractModal.tsx` | 547 lignes | 279 lignes | `useNewContractForm`, `ContractLeaveHistorySection`, `contractSchemas.ts` |
| #113 ✅ | `ClockInPage.tsx` | 557 lignes | 150 lignes | `useClockIn`, `ClockInProgressSection`, `ClockInTodaySection` |

#### Typage database.ts (PR #114 ✅)

Remplacement des 4 types imprécis dans `src/types/database.ts` :
- `LiaisonMessageDbRow.attachments` + `LogEntryDbRow.attachments` : `unknown[]` → `Attachment[]`
- `CaregiverDbRow.permissions` : `Record<string,boolean>` → `CaregiverPermissions`
- `CaregiverDbRow.address` : `Record<string,unknown>` → `AddressDb`
- `NotificationDbRow.data` : `Record<string,unknown>` → `NotificationData` (nouvelle interface)
- Suppression des casts `as X[]` dans liaisonService, logbookService, notificationService

#### Fix bug absence événement familial (PR #115 + migration 032 ✅)

La contrainte `absences_absence_type_check` créée à l'init de la table ne couvrait pas `family_event` et `emergency`. Migration 032 corrige le CHECK et est appliquée sur Supabase distant. Le registre des migrations est maintenant synchronisé (025→032 tous alignés).

#### Métriques session (26/02/2026)

- **1651 tests** / 81 fichiers (était 1605 / 79)
- 32 migrations DB synchronisées (était 30)
- Aucun composant > 500 lignes dans les modules refactorisés

---

### Sprint /wd:analyze Remediation — 9 PRs (24/02/2026)

Analyse multi-agents (security, performance, quality) suivie d'un sprint de remédiation complet. 9 PRs créées en une session, toutes sur branches séparées.

#### Bug critique corrigé — `calculatePay.ts` dimanche `presence_day` (PR #92 ✅)

Pour les shifts `presence_day` un dimanche ou jour férié, `sundayMajoration` et `holidayMajoration` étaient calculés sur `basePay` (heures brutes × taux) au lieu de `presenceResponsiblePay` (2/3 des heures × taux). Surpaiement de ~50% sur la part majoration. Correction conforme à Art. 137.1 IDCC 3239.

#### Sprint qualité — PRs mergées

| PR | Branche | Description |
|----|---------|-------------|
| #87 ✅ | `fix/sanitize-text-services` | Sanitisation services supplémentaires, `useEffect` + cleanup `DocumentManagementSection`, extraction `notificationService.core.ts` + `notificationCreators.ts` |
| #88 ✅ | `refactor/decouple-getprofilename` | `getProfileName` migré vers `profileService` (5 services + 1 hook + 6 tests mis à jour) |
| #89 ✅ | `refactor/useauth-split` | Extraction `loadProfile()` helper — DRY `useAuth.ts` (339 → 316 lignes) |
| #90 ✅ | `fix/newshiftmodal-calculateshiftduration` | Restaurer imports manquants `calculateShiftDuration`, `getMinBreakForSegment`, `GuardSegment` dans `NewShiftModal` |
| #91 ✅ | `feat/error-boundaries` | `<ErrorBoundary>` autour de chaque route protégée dans `App.tsx` (9 routes) |
| #92 ✅ | `fix/calculatepay-presence-day-sunday` | **CRITIQUE** : majoration dimanche/férié sur `presenceResponsiblePay` pour `presence_day` |

#### Sprint qualité — PRs mergées (suite)

| PR | Branche | Description |
|----|---------|-------------|
| #93 ✅ | `fix/usenotifications-double-render` | Double `setNotifications` dans UPDATE/DELETE/dismiss → un seul updater (−1 re-render par event) |
| #94 ✅ | `fix/shift-validation-query-window` | Fenêtre requête shifts validation : 3 mois → ±4 semaines (suffisant pour toutes les règles IDCC 3239) |
| #95 ✅ | `refactor/shiftdetailmodal-usereducer` | 13 `useState` → 1 `useReducer` + 20 actions typées dans `ShiftDetailModal` + fenêtre requête fixes |

#### Métriques session (24/02/2026)

- **1605 tests** / 79 fichiers (était 1154 / 52)
- **~60% coverage** (était ~53%)
- `notificationService.ts` splitté : `notificationService.core.ts` + `notificationCreators.ts`
- `useShiftValidationData`, `useShiftNightHours`, `useShiftRequalification`, `useShiftEffectiveHours`, `useGuardSegments` ajoutés

---

### Sprint Tests Hooks Restants + Feature Présence Responsable (17/02/2026)

#### Sprint Tests — 835 tests, 42% coverage, 7/7 hooks (PR #71)

Complétion de la Phase 2 hooks : les 3 hooks restants sont maintenant couverts. Passage de 786 tests/37% à **835 tests / 35 fichiers / 42% coverage**.

| Fichier | Tests | Fonctions couvertes |
|---------|-------|---------------------|
| `useComplianceMonitor.test.ts` | ~15 | Monitoring continu, polling, alertes, cleanup |
| `usePushNotifications.test.ts` | ~17 | Souscription, permission, envoi, désabonnement |
| `useSpeechRecognition.test.ts` | ~17 | Démarrage, arrêt, résultats, gestion erreurs |

**Couverture hooks** : **7/7** ✅ (useAuth, useNotifications, useComplianceCheck, useShiftReminders, useComplianceMonitor, usePushNotifications, useSpeechRecognition)

#### Feature Présence Responsable Jour/Nuit — IDCC 3239 (PR #72)

Implémentation complète du concept de présence responsable conforme à la Convention Collective IDCC 3239 dans la gestion des shifts.

| Élément | Détails |
|---------|---------|
| **Nouveau type shift** | `shift_type` : `effective` / `presence_day` / `presence_night` |
| **Présence responsable jour** | Conversion 2/3 h de travail effectif (Art. 137.1) |
| **Présence responsable nuit** | Indemnité forfaitaire ≥ 1/4 salaire horaire (Art. 148) |
| **Seuil requalification** | ≥ 4 interventions pendant présence nuit → requalifiée 100% travail effectif |
| **Nouvelles validations compliance** | Limite 12h consécutives nuit, max 5 nuits consécutives |
| **Récapitulatif temps réel** | Heures converties + calcul paie enrichi dans la modale |
| **Modèle de données** | Champs `night_interventions_count`, `is_requalified`, `effective_hours` |
| **Documentation** | `docs/presence_responsable.md`, `docs/Garde_de_24_heures.md` |

#### Logo SVG Unilien dans Header (PR #73)

Intégration du logo SVG Unilien dans la navigation principale.

#### Feature Reprise Historique Congés à la Création de Contrat Antérieur

Résolution du problème de solde de congés incorrect lors de la saisie d'un contrat avec date de début antérieure à aujourd'hui.

| Élément | Détails |
|---------|---------|
| **Problème corrigé** | Contrat antérieur → `taken_days` initialisé à 0 et acquis surestimés |
| **Section optionnelle** | Apparaît dans `NewContractModal` si date début < aujourd'hui |
| **Saisie historique** | Mois effectivement travaillés + jours de congés déjà pris |
| **Calcul automatique** | Solde réel = jours acquis (prorata mois saisis) − jours déjà pris |
| **Documentation** | `docs/feature_reprise_conges_contrat.md` |

---

### Semaine 10 — Hook useEmployerResolution + Sanitisation + 030 garde 24h (23-24/02/2026)

#### Hook `useEmployerResolution` (23/02/2026) — 9e hook

Nouveau hook centralisant la résolution de l'`employerId` selon le rôle (employer / employee / caregiver), utilisé par `LiaisonPage` et `LogbookPage`. Supprime les imports Supabase directs dans ces deux pages.

| Élément | Détails |
|---------|---------|
| **Fichier** | `src/hooks/useEmployerResolution.ts` |
| **Rôles gérés** | `employer` (profil direct), `employee` (via contrat actif), `caregiver` (via profil aidant) |
| **Param optionnel** | `requiredCaregiverPermission?: keyof CaregiverPermissions` |
| **Pages mises à jour** | `LiaisonPage.tsx`, `LogbookPage.tsx` |
| **Bénéfice** | Suppression imports Supabase directs dans les composants (architecture propre) |

#### Sanitisation `notificationService` (23/02/2026)

Ajout de `sanitizeText()` sur les champs `title` et `message` avant écriture DB.
Dette technique partiellement résorbée : 7/13 services maintenant sanitisés.

#### Migration 030 — Guard segments v2 (23/02/2026)

| Élément | Détails |
|---------|---------|
| **Migration** | `030_guard_segments_v2.sql` |
| **Colonne** | `guard_segments` JSONB (N-segments libres) |
| **Interface** | `GuardSegment { startTime, type: 'effective'|'astreinte'|'break', breakMinutes? }` |
| **UI** | Liste éditable + barre visuelle + ajout/division/suppression par segment |
| **Validations** | Total effectif ≤ 12h (bloquant), présence nuit > 12h (avertissement) |
| **Paie** | Majorations nuit auto sur segments effectifs entre 21h–6h |

#### Métriques session (24/02/2026)

- **578 tests** (+5 grâce au nouveau hook `useEmployerResolution`)
- **8/8 hooks** testés ✅

---

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
| **35 Migrations DB** | Tables, RLS policies, fonctions, storage buckets, realtime, conversations |
| **1942 Tests (102 fichiers)** | Services (13/13), Compliance (7), Auth (4), Hooks (8/8), Store (1), Export (4), Composants UI |
| **19 Services** | CRUD complet pour toutes les entités métier |
| **Composants Accessibles** | AccessibleInput, AccessibleButton, AccessibleSelect, VoiceInput |
| **URLs Francisées** | Toutes les routes de l'app en français (PR #126) |
| **Répétition Interventions** | Hebdomadaire ou personnalisée, configuration jours de la semaine (PR #136) |

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
- ✅ Nouvelles clés VAPID régénérées (npx web-push generate-vapid-keys)
- ✅ Fichier .vapid-keys.json supprimé du filesystem
- ✅ .env mis à jour avec la nouvelle clé publique
- ✅ Dépôt git vérifié : aucun secret tracké
- ✅ Ancienne clé privée absente de tous les fichiers du projet
- ✅ Secrets Supabase mis à jour (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
- ✅ Edge Function send-push-notification redéployée (v12)
- ✅ Clé privée supprimée de la documentation
- ❌ Vérifier qu'aucune copie/backup externe ne contient l'ancienne clé
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
- ✅ Initialiser le dépôt git (09/02/2026)
- ✅ Vérifier que .env est bien dans .gitignore (ligne 18 — OK)
- ✅ Vérifier que .env n'a jamais été commité (git log — confirmé)
- ✅ Vérifier absence de service_role_key côté client (confirmé)
- ✅ Ajouter supabase/.temp/ au .gitignore (10/02/2026)
- ✅ Auditer les RLS policies (sécurité dépend des RLS, pas de la clé anon) — ✅ 24/02/2026
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
- ✅ Créer composant <ProtectedRoute> dans App.tsx (même pattern que PublicRoute)
- ✅ Support prop allowedRoles?: UserRole[] pour restriction par rôle
- ✅ Wrapper les 9 routes authentifiées dans App.tsx avec <ProtectedRoute>
- ✅ Routes avec restriction de rôle : /clock-in (employee), /team /compliance /documents (employer, caregiver)
- ✅ Supprimer les gardes auth individuelles dans 9 composants (Dashboard, ProfilePage, PlanningPage, ClockInPage, LogbookPage, LiaisonPage, TeamPage, CompliancePage, DocumentsPage)
- ✅ Nettoyer les imports inutilisés (Navigate, isAuthenticated, isLoading)
- ✅ Conserver les vérifications fines de permissions internes (canManageTeam, canExportData)
- ✅ Build TypeScript + Vite : 0 erreur
- ✅ Tests unitaires du composant ProtectedRoute (App.test.tsx — describe('ProtectedRoute', ...) ✅)
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
- ✅ Remplacer le fallback par un throw Error explicite si VITE_SUPABASE_URL manque
- ✅ Idem pour VITE_SUPABASE_ANON_KEY
- ✅ Message clair avec instructions ("Copiez .env.example vers .env...")
- ✅ Suppression des placeholders fictifs — le client reçoit les vraies valeurs
- ✅ Suppression de l'import logger inutilisé
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
- ✅ shiftService.ts : sanitizeText() sur notes + tasks[].map(sanitizeText) (create + update)
- ✅ liaisonService.ts : sanitizeText() sur content (create + update)
- ✅ absenceService.ts : sanitizeText() sur reason (create)
- ✅ logbookService.ts : sanitizeText() sur content (create + update)
- ✅ profileService.ts : sanitizeText() sur firstName, lastName, phone, handicapName, specificNeeds, cesuNumber, address.* (updateProfile + upsertEmployer + upsertEmployee)
- ✅ caregiverService.ts : sanitizeText() sur relationship, relationshipDetails, emergencyPhone, availabilityHours, address.* (upsert + updateProfile)
- ✅ Ajouter tests unitaires vérifiant la sanitisation (shiftService, liaisonService, absenceService, logbookService, caregiverService — ✅)
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
- ✅ Migration 024 : handle_new_user crée automatiquement la ligne employees/employers avec valeurs par défaut
- ✅ Migration 024 : rattrapage des utilisateurs existants (backfill)
- ✅ contractService.ts : searchEmployeeByEmail vérifie l'existence dans la table employees (profileComplete flag)
- ✅ contractService.ts : message d'erreur spécifique pour l'erreur FK 23503
- ✅ NewContractModal.tsx : bloque la création avec message clair si profil auxiliaire incomplet
- ✅ contractService.test.ts : tests mis à jour pour le nouveau champ profileComplete
- ✅ Migration appliquée sur Supabase distant (db push OK)
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
- ✅ Exporter MAJORATION_RATES depuis calculatePay.ts
- ✅ Utiliser MAJORATION_RATES + calculateOvertimeHours() pour chaque shift
- ✅ Implémenter calcul réel des heures sup (cumul progressif par shift)
- ✅ Gestion has_night_action (acte vs présence seule)
- ✅ Créer tests unitaires (declarationService.test.ts)
- ❌ Tests d'intégration export CESU
- ❌ Validation expert paie
```

**Timeline**: ~~Cette semaine (Semaine 6/2026)~~ Code corrigé, tests restants

---

### 2. 🧪 Couverture de Tests — En Progression

**Impact**: 🟡 IMPORTANT - Risque de régression (en cours de réduction)
**Effort**: 6-8 semaines (Phase 1+2 terminées en 1 jour)
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md`

**État actuel**: 70%+ coverage — 1942 tests / 102 fichiers ✅ (cibles Q1 30% et 70% atteintes — PR #121)

**Services testés (13/13)** ✅ Phase 1 terminée (12/02/2026):
```
- ✅ src/services/notificationService.test.ts (68 tests)
- ✅ src/services/caregiverService.test.ts (53 tests)
- ✅ src/services/absenceService.test.ts (49 tests)
- ✅ src/services/contractService.test.ts (48 tests)
- ✅ src/services/pushService.test.ts (44 tests)
- ✅ src/lib/export/declarationService.test.ts (34 tests)
- ✅ src/services/profileService.test.ts (31 tests)
- ✅ src/services/liaisonService.test.ts (29 tests)
- ✅ src/services/logbookService.test.ts (28 tests)
- ✅ src/services/leaveBalanceService.test.ts (24 tests)
- ✅ src/services/auxiliaryService.test.ts (19 tests)
- ✅ src/services/statsService.test.ts (17 tests)
- ✅ src/services/documentService.test.ts (17 tests)
- ✅ src/services/complianceService.test.ts (11 tests)
- ✅ src/services/shiftService.test.ts (existant, complété)
```

**Hooks testés (8/8)** ✅ — Phase 2 terminée (17/02/2026) + useEmployerResolution (24/02/2026):
```
- ✅ useAuth.test.ts (existant)
- ✅ useNotifications.test.ts (20 tests)
- ✅ useComplianceCheck.test.ts (16 tests)
- ✅ useShiftReminders.test.ts (12 tests)
- ✅ useComplianceMonitor.test.ts (~15 tests) — ✅ 17/02/2026
- ✅ usePushNotifications.test.ts (~17 tests) — ✅ 17/02/2026
- ✅ useSpeechRecognition.test.ts (~17 tests) — ✅ 17/02/2026
- ✅ useEmployerResolution.test.ts (5 tests) — ✅ 24/02/2026
```

**Autres tests existants**:
```
- ✅ src/lib/compliance/**/*.test.ts (7 fichiers - conformité)
- ✅ src/stores/authStore.test.ts (26 tests)
- ✅ src/components/auth/*.test.tsx (3 fichiers - LoginForm, SignupForm, ForgotPasswordForm)
```

**Quick Wins restants**:
```
- ✅ Corriger vitest.config.ts (coverage global) - 15 min
- ✅ Tester tous les services restants - ✅ terminé 12/02/2026
- ✅ Setup GitHub Actions coverage (pr-checks.yml) - ✅ Semaine 9/2026
```

**Prochaines étapes tests (pour atteindre 70%+)**:
```
- ✅ useComplianceMonitor.test.ts — ✅ 17/02/2026 (PR #71)
- ✅ usePushNotifications.test.ts — ✅ 17/02/2026 (PR #71)
- ✅ Composants UI critiques (dashboard widgets, planning views) — ✅ Semaine 9/2026
- ✅ Export PDF/CESU (cesuGenerator, pdfGenerator) — ✅ @react-pdf/renderer, CESU persisté en DB/Storage (PR #205)
- ✅ Tests E2E (Playwright — Phase 4) — ✅ Playwright + Chromium, 8 tests (PR #244)
```

**Timeline**:
- ~~Phase 1 (Services critiques): Semaines 6-8/2026~~ ✅ Terminé 12/02/2026
- ~~Phase 2 (Hooks): Semaine 9/2026~~ ✅ Terminé 17/02/2026 (7/7)
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
- ✅ Créer src/lib/logger.ts
- ✅ Implémenter redaction (emails, IDs, tokens, téléphones)
- ✅ Remplacer console.* par logger dans 47 fichiers (170+ appels)
- ✅ Intégration dans les composants (dashboard, planning, profile, team, documents)
- ⚠️ Intégrer Sentry/LogRocket — logger.ts prêt (TODO commenté), aucune dépendance installée → À FAIRE
- ✅ Documentation équipe (JSDoc dans le fichier)
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
- ✅ Créé src/lib/mappers.ts avec mapProfileFromDb(data, email) et createDefaultProfile(userId, email, meta)
- ✅ Créé type ProfileDbRow importé dans useAuth.ts (remplace as any)
- ✅ Supprimé 4 blocs dupliqués (~80 lignes) dans initialize() et signIn()
- ✅ 0 "as any" restant dans useAuth.ts (était 2)
- ✅ 0 eslint-disable restant dans useAuth.ts (était 2)
```

#### ✅ Error Boundary Global

**Corrections appliquées**:
```
- ✅ Créé src/components/ui/ErrorBoundary.tsx (class component React)
- ✅ Intégré dans main.tsx (wrappant <App />, à l'intérieur de ChakraProvider et BrowserRouter)
- ✅ Affichage accessible : message français, bouton retour, détail erreur en dev uniquement
- ✅ Erreurs loggées via logger.ts (componentDidCatch)
- ✅ Exporté depuis src/components/ui/index.ts
```

#### ✅ Types Supabase dans les Mappers (eslint-disable éliminés)

**Corrections appliquées**:
```
- ✅ Ajouté 5 interfaces DB manquantes dans database.ts : LiaisonMessageDbRow, LogEntryDbRow, NotificationDbRow, CaregiverDbRow + complété ShiftDbRow
- ✅ Typé 9 fonctions mapper dans 7 services (shiftService, absenceService, liaisonService, logbookService, notificationService, caregiverService, documentService)
- ✅ Supprimé 13 eslint-disable @typescript-eslint/no-explicit-any
- ✅ Remplacé 4 as any par des types explicites (ProfileDbRow, ContractDbRow, ContractWithEmployeeDbRow)
- ✅ 1 seul eslint-disable restant dans tout le codebase (react-hooks/exhaustive-deps dans DocumentManagementSection.tsx - justifié)
```

**Types restant génériques** (P2, non bloquant) :
```
- ✅ Aligner accessibility_settings → AccessibilitySettings dans database.ts ✅
- ✅ Aligner computed_pay → ComputedPay dans ShiftDbRow ✅
- ✅ Aligner permissions → CaregiverPermissions dans CaregiverDbRow (PR #114, 26/02/2026)
- ✅ Aligner address → AddressDb dans CaregiverDbRow (PR #114, 26/02/2026)
- ✅ Typer attachments → Attachment[] dans LiaisonMessageDbRow + LogEntryDbRow (PR #114, 26/02/2026)
- ✅ Typer data → NotificationData dans NotificationDbRow (PR #114, 26/02/2026)
- ⚠️ Regenerer les types complets (npx supabase gen types) — types database.ts écrits à la main, dérive possible avec 49 migrations → À FAIRE
```

---

### 2c. 🟡 Accessibilité - Écarts par Rapport à l'Objectif WCAG AAA

**Impact**: 🟡 IMPORTANT - Mission critique du projet
**Effort**: 1 jour
**Statut**: 🟡 EN COURS (toggles settings implémentés ✅, ARIA live regions partielles)
**Découvert**: Audit 09/02/2026

> ✅ **19/02/2026** — Toggles d'accessibilité fonctionnels : contraste élevé, mouvement réduit, optimisation lecteur d'écran, taille du texte ajustable (slider 80–150%).

#### Emojis dans les Boutons (LoginForm, SignupForm)

**Fichiers**: `src/components/auth/LoginForm.tsx:132-133`, `SignupForm.tsx:227-249`

Les boutons d'affichage/masquage du mot de passe utilisent des emojis (`🙈` / `👁️`). Les lecteurs d'écran liront "singe qui se cache les yeux" ou "oeil" au lieu d'un texte utile. L'`aria-label` est présent mais l'emoji reste visuellement problématique.

**Actions**:
```
- ✅ Remplacer les emojis par des icônes SVG (PasswordToggleButton, SVG inline) (19/02/2026)
- ✅ aria-hidden="true" sur les SVG, aria-label sur le bouton
```

**Effort**: 30 min

#### Pas de ARIA Live Regions pour le Contenu Dynamique

Aucune `aria-live` region détectée pour les alertes dynamiques (conformité, notifications, messages temps réel). Les changements dynamiques ne sont pas annoncés aux lecteurs d'écran.

**Actions**:
```
- ✅ ClockInPage : aria-live="polite" sur messages succès, role="alert" sur erreurs (10/02/2026)
- ✅ ClockInPage : role="status" sur indicateur "intervention en cours" (10/02/2026)
- ✅ ClockInPage : role="status" aria-label sur les 3 Spinners de chargement (10/02/2026)
- ✅ ClockInPage : aria-live sur majoration nuit, aria-pressed sur filtres historique (10/02/2026)
- ✅ ClockInPage : aria-hidden sur 7 emojis décoratifs (10/02/2026)
- ✅ ClockInPage : accessibleLabel sur bouton Annuler, htmlFor/id sur switch nuit (10/02/2026)
- ✅ Ajouter aria-live sur les alertes de conformité critiques — ComplianceAlert.tsx : role="alert" + aria-live="polite" ✅
- ✅ Ajouter aria-live="polite" sur les notifications — NotificationBell + NotificationsPanel ✅
- ❌ Tester avec NVDA/VoiceOver
```

**Effort**: 1h

#### Gestion du Focus après Navigation SPA

Le focus n'est pas géré après les changements de route. L'utilisateur au clavier ou lecteur d'écran se retrouve "perdu" après navigation.

**Actions**:
```
- ✅ ClockInPage : focus géré après clock-in, clock-out et annulation via useRef (10/02/2026)
- ✅ Implémenter un hook useRouteAnnouncer() ou composant <RouteAnnouncer /> — ✅ PR #120 (25/02/2026)
- ✅ Déplacer le focus vers le h1 de la nouvelle page après navigation — ✅ PR #120
- ✅ Annoncer le titre de la page aux lecteurs d'écran — ✅ PR #120
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
- ✅ Notifications Email (Resend + Edge Function, PR #240 — 09/04/2026)
- ❌ Notifications SMS (non implémenté)

#### 4.1 Web Push (Finalisation) ✅ (19/02/2026)

**Actions complétées**:
```
- ✅ Générer clés VAPID
- ✅ Configurer variables env (VITE_VAPID_PUBLIC_KEY)
- ✅ Configurer secrets Supabase (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
- ✅ Déployer Edge Function send-push-notification (v12)
- ✅ Tests navigateurs (Chrome, Firefox, Safari)
- ✅ Documentation utilisateur
```

**Effort**: 2-3 heures
**Timeline**: Cette semaine

#### 4.2 Email Notifications ✅ (09/04/2026 — PR #240)

**Fournisseur** : Resend via Supabase Edge Function `send-email`

**Implémenté** :
```
- ✅ Edge Function send-email (Resend API, JWT auth, rate limiting 10/min)
- ✅ emailService.ts : sendShiftReminder(), sendNewMessageNotification()
- ✅ Templates HTML : rappel intervention J-1, nouveau message
- ✅ Intégration notificationCreators.ts (shift + message)
- ✅ Préférences utilisateur dans SettingsPage (opt-in/out par type)
- ✅ Fix requête read_by PostgREST (PGRST100)
```

**Limitation** : `onboarding@resend.dev` → envoi uniquement vers l'email du compte Resend.
**Prochaine étape** : vérifier un domaine dans Resend pour la prod.

#### 4.3 SMS Notifications (Nouveau)

**Use cases**:
- Urgences (shift annulé last minute)
- Codes de vérification (2FA)
- Alertes critiques conformité

**Solution recommandée**: Twilio Verify

**Actions**:
```
- ❌ Compte Twilio + crédits
- ❌ Edge Function send-sms
- ❌ Intégration notificationService
- ❌ Préférences utilisateur
- ❌ Estimation coûts
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
- ❌ Décider fournisseur (Twilio vs Supabase)
- ❌ Configurer compte + API keys
- ❌ Créer Edge Functions (send-code, verify-code)
- ❌ UI saisie code (6 inputs)
- ❌ Mise à jour table profiles (phone_verified)
- ❌ Tests + gestion erreurs
```

**Effort**: 1 semaine
**Timeline**: Semaine 11/2026
**Budget**: ~4-5€/mois (100 inscriptions)

---

### 6. 📄 Export Documents Amélioré

**Impact**: 🟡 IMPORTANT - Fonctionnalité métier
**Effort**: 1 semaine

**Manquants**:

#### 6.1 Export Bulletins de Paie ✅ (19/02/2026)

**Format**: PDF — jsPDF · **Taux** : IDCC 3239 / 2025 — indicatif

```
- ✅ Design template bulletin (5 sections : header, parties, brut, cotisations, nets)
- ✅ Calculs cotisations sociales salariales (CSG/CRDS/vieillesse/AGIRC-ARRCO T1)
- ✅ Calculs cotisations patronales (maladie/vieillesse/alloc. fam./chômage/FNAL/CSA/AT-MP)
- ✅ Exonération cotisations patronales SS (Art. L241-10 CSS — employeurs PCH/invalide/MTP/PCTP)
- ✅ Génération PDF (jsPDF) — téléchargement direct
- ✅ Onglet "Bulletins de paie" dans DocumentManagementSection
- ✅ Stockage documents (Supabase Storage) — v2 ✅ PR #117
- ✅ Historique bulletins (table DB) — v2 ✅ PR #117
- ✅ Taux PAS configurable par employé (contrats) — v2 ✅ PR #117
```

---

### 6b. 🏥 PCH — Prestation de Compensation du Handicap

**Impact** : 🔴 CRITIQUE MÉTIER — La PCH finance les auxiliaires de vie des employeurs Unilien
**Documentation** : `docs/PCH_PRESTATION_COMPENSATION_HANDICAP.md`
**Référence tarifaire** : Tarifs au 01/01/2026 (indexés IDCC 3239 + SMIC)

> Tarif PCH emploi direct 2026 : **19,34 €/h** (150% × salaire horaire brut AV-C IDCC 3239)

#### 6b.1 Données employeur PCH (Niveau 1 — sprint court)

**Effort** : 2 jours · **Timeline** : ✅ Terminé (PR #98 — 25/02/2026)

```
- ✅ Enrichir type Employer : pchType ('emploiDirect'|'mandataire'|'prestataire'|'aidantFamilial')
- ✅ Enrichir type Employer : pchMonthlyHours (heures allouées par le plan de compensation)
- ✅ Enrichir type Employer : pchElement1Rate (tarif horaire PCH auto-calculé via pchType)
- ✅ Migration DB : pch_type, pch_monthly_hours, pch_element1_rate
- ✅ Mettre à jour EmployerSection.tsx (nouveaux champs + sélecteur pchType)
- ✅ Créer src/lib/pch/pchTariffs.ts avec constantes 2026
- ✅ Auto-suggestion exonération SS si pchBeneficiary === true (bulletin de paie)
```

**Constantes PCH 2026 à intégrer** :
```ts
emploiDirectGeneral : 19,34 €/h
emploiDirectSoins   : 20,10 €/h
mandataireGeneral   : 21,27 €/h
mandataireSoins     : 22,11 €/h
prestataire         : 25,00 €/h
aidantFamilial      : 4,78 €/h
aidantFamilialCessation : 7,16 €/h
```

#### 6b.2 Widget Enveloppe PCH — Dashboard (Niveau 2)

**Effort** : 2 jours · **Timeline** : ✅ Terminé (PR #98 — 25/02/2026)

```
- ✅ Composant PchEnvelopeWidget dans EmployerDashboard
- ✅ Calcul mensuel : consommé (coût total employeur) vs alloué (pchMonthlyHours × tarif)
- ✅ Barre de progression avec reste à charge
- ✅ Alerte si dépassement prévu en fin de mois
- ✅ Comparaison avec / sans exonération patronale SS
```

**Formule reste à charge** :
```
Coût total employeur = brut + cotisations patronales
Enveloppe PCH = pchMonthlyHours × pchElement1Rate
Reste à charge = max(0, coût total - enveloppe PCH)
```

#### 6b.3 Bulletin de paie — Section PCH (Niveau 3)

**Effort** : 1 jour · **Timeline** : ✅ Terminé (PR #98 — 25/02/2026)

```
- ✅ Section "Récapitulatif PCH" dans le PDF généré
    → Enveloppe allouée / coût réel / reste à charge
- ✅ Mention exonération auto si pchBeneficiary === true
- ✅ Note légale : "PCH versée par le Conseil Départemental"
```

#### 6b.4 Module PCH complet (Niveau 4 — long terme) — **V2**

**Effort** : 1 semaine · **Timeline** : V2

```
- ❌ Suivi du plan de compensation (dates d'attribution, révisions)
- ❌ Alertes échéance plan PCH (renouvelable tous les 3 ou 5 ans)
- ❌ Multi-éléments PCH (aides techniques, aménagement logement, charges spécifiques)
- ❌ Historique décisions Conseil Départemental (upload PDF notification)
- ❌ Export "attestation employeur" pour justification PCH
```

---

#### 6.2 Export Planning (PDF/Excel)

**Formats**: PDF, Excel, iCal
**Effort**: 2 jours

```
- ✅ Export PDF planning mensuel (planningPdfGenerator.ts — feat/export-planning)
- ✅ Export Excel (heures détaillées) (planningExcelGenerator.ts — feat/export-planning)
- ✅ Export iCal (intégration calendriers) (planningIcalGenerator.ts — feat/export-planning)
- ✅ Filtres avancés (employé, période) (PlanningExportSection.tsx — feat/export-planning)
```

#### 6.3 Archivage Documents

**Effort**: 2 jours

```
- 🔧 Table documents (metadata) — tables séparées par type (payslips, cesu_declarations, absences) mais pas de table unifiée ⏳
- ✅ Upload documents administratifs — bulletins ✅, CESU ✅, justificatifs absences ✅ (Storage Supabase)
- 🔧 Catégorisation (contrat, bulletin, justificatif) — implicite par section, pas de champ category centralisé ⏳
- ❌ Recherche documents
- ✅ Prévisualisation — signed URLs bulletins + CESU + justificatifs ✅
```

**Timeline**: Semaines 12-13/2026

---

### 7. 👥 Gestion Avancée Équipe — **V2**

**Impact**: 🟡 IMPORTANT - UX
**Effort**: 1 semaine
**Timeline**: V2

**Fonctionnalités manquantes**:

#### 7.1 Recherche & Filtres Auxiliaires

```
- ❌ Recherche par nom, compétences
- ❌ Filtres (disponibilité, distance, qualifications)
- ❌ Tri (nom, distance, tarif)
- ❌ Vue carte (géolocalisation)
```

**Effort**: 2 jours

#### 7.2 Évaluations Auxiliaires

```
- ❌ Évaluations/Feedbacks par auxiliaire
- ❌ Note moyenne et commentaires
```

> Historique interventions et statistiques → couverts par 8.1 Analytics
> Export historique → déplacé vers 8.3

**Effort**: 1 jour

#### 7.3 Gestion Disponibilités

```
- ❌ Template disponibilités récurrent
- ❌ Exceptions (congés, indisponibilités)
- ❌ Vue calendrier disponibilités
- ❌ Conflits détectés automatiquement
```

**Effort**: 3 jours

**Timeline**: Semaines 14-15/2026

---

### 7b. 🏠 Dashboard — Alignement Prototype

**Impact**: 🟡 IMPORTANT - Première impression utilisateur, onboarding, engagement
**Effort**: 1-2 semaines
**Référence**: `template-final/dashboard.html`

Le prototype statique contient plusieurs éléments dashboard absents de l'app React.

#### 7b.1 Onboarding & Demo

```
- ❌ Demo banner — bandeau "Mode démo" avec badge, texte explicatif, CTA inscription, bouton fermer (dismissible localStorage)
- ✅ Onboarding banner — 3 étapes avec progression (compte créé ✓, ajouter employé, planifier intervention) + CTA par étape — ✅ OnboardingWidget (PR #237)
- ❌ Empty state dashboard — variante onboarding quand aucun employé/intervention (stats à "0", planning vide avec CTA)
```

#### 7b.2 Greeting & Navigation Contextuelle

```
- ✅ Greeting enrichi — eyebrow jour/date, greeting "Bonjour, [Name]" ✅
- ✅ Greeting chips — "Prochaine intervention à 14:00" + "3 alertes conformité" (badges) ✅
- ✅ Greeting CTA — bouton "Voir le planning" (lien vers /planning) ✅
- ✅ Greeting skeleton — skeleton loading sur le bloc greeting ✅
```

#### 7b.3 Action Nudges & Quick Actions

```
- ✅ Action nudges — ActionNudgesWidget : bulletins non générés + heures non validées, dynamique ✅
- ✅ Quick actions grid — QuickActionsWidget existant : 4 actions par rôle, grille 2×4 responsive ✅
```

#### 7b.4 Planning du Jour

```
- ✅ Carte "Planning du jour" — TodayPlanningWidget : tableau interventions du jour (employé avec avatar, horaire, type tag, statut pill) ✅
- ✅ Planning du jour — lignes cliquables (navigation vers /planning?shift=id) ✅
- ✅ Planning du jour — empty state (icône calendrier + message + CTA "Planifier une intervention" + "Voir l'equipe") ✅
```

#### 7b.5 Stats & Tendances

```
- ✅ Tendances stats — indicateurs ↑/↓ sur les stats cards, SVG icons avec backgrounds colorés (remplace emojis) ✅
- ✅ Alertes conformité sidebar — AlertSummaryList : alertes flat (icône SVG, titre, description, critical/warning/success) ✅
```

**Effort**: 1-2 semaines
**Timeline**: Semaines 12-14/2026

---

### 8. 📊 Analytics & Reporting

**Impact**: 🟡 IMPORTANT - Business intelligence
**Effort**: 2 semaines

**Décision** : Page `/analytique` dédiée (pas sur le dashboard, qui est déjà chargé).
Le dashboard garde ses widgets actuels comme aperçu, avec liens "voir plus" vers Analytics.

> **V2** : Dashboard configurable (choix des widgets affichés par l'utilisateur)

#### 8.1 Page Analytics Employeur (`/analytique`) — PR #141 ✅

```
- ✅ Coût total mensuel (par employé, par période) — AnalyticsSummaryCards + MonthlyChart
- ✅ Heures travaillées (graphiques) — MonthlyChart barres avec completed/planned
- ✅ Taux de présence auxiliaires — PresenceRateWidget (anneau SVG + mini trend)
- ✅ Répartition par auxiliaire — AuxiliaryBreakdownWidget (heures, coût, barres)
- ✅ Prévisions budget (déjà sur dashboard — lien vers vue détaillée)
- ✅ Sélecteur de période 3/6/12 mois
```

#### 8.2 Page Analytics Auxiliaire (`/analytique`) — PR #141 ✅

```
- ✅ Revenu mensuel (détaillé) — MonthlyChart + AnalyticsSummaryCards
- ✅ Heures travaillées (graphiques) — MonthlyChart barres
- ✅ Taux de présence — PresenceRateWidget
- ❌ Heures travaillées vs contractuelles
- ❌ Historique interventions
```

#### 8.3 Exports Statistiques

```
- ❌ Export Excel (toutes données)
- ❌ Export historique interventions par auxiliaire (ex-7.2)
- ❌ Graphiques imprimables (PDF)
- ❌ Comparaisons période N vs N-1
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
- ❌ Documentation composants (Storybook?)
- ❌ Variantes composants (sizes, colors)
- 🔧 Tokens design (spacing, colors, typography) — colors ✅ + typography ✅ (theme.ts PR #185) | spacing custom ⏳
- ❌ Guidelines accessibilité
```

**Effort**: 1 semaine

#### 9.2 Onboarding Utilisateur

> Note : Les éléments de base (demo banner, onboarding banner 3 étapes, empty states) sont dans la section 7b.1 ci-dessus. Cette section couvre les améliorations avancées.

```
- ❌ Tour guidé première connexion (highlight interactif des éléments clés)
- ❌ Tooltips contextuels (première visite de chaque page)
- ❌ Vidéos tutoriels
- ✅ FAQ intégrée — HelpPage avec accordéon Q/R (9 sections, PR #235) ✅
- ❌ Checklist profil complet (widget progression — cf. prototype profile.html)
```

**Effort**: 1 semaine

#### 9.3 Responsive Mobile Amélioré

```
- 🔧 Optimisation touch targets — AccessibleInput/Select avec tailles min, pas de système global 44px ⏳
- 🔧 Navigation mobile simplifiée — sidebar mobile + overlay existants, pas de simplification dédiée mobile ⏳
- ❌ Gestes tactiles (swipe, pinch)
- 🔧 Mode offline (PWA) — Service worker + workbox actif, cache assets + Storage Supabase. /rest/v1/ exclu volontairement (données sensibles) ⏳
```

**Effort**: 1 semaine

**Timeline**: Q2 2026

---

### 10. 🔍 Recherche & Filtres Globaux

**Impact**: 🟢 MOYEN - Productivité
**Effort**: 1 semaine

```
- ✅ Barre recherche globale (Cmd+K) — SpotlightSearch + searchService + useSpotlightSearch ✅
- ✅ Recherche full-text (shifts, logs, messages) ✅
- ❌ Filtres sauvegardés (favoris)
- ❌ Recherche vocale (Speech Recognition déjà implémentée)
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
- ❌ Étude de faisabilité
- ❌ Choix technologie
- ❌ Prototype
- ❌ Développement iOS/Android
- ❌ Publication stores
```

**Timeline**: Q3-Q4 2026

---

### 12. 🌐 Internationalisation (i18n)

**Impact**: 🟢 FAIBLE (pour l'instant) - Expansion
**Effort**: 2 semaines

**Actuellement**: Interface en français uniquement

**Actions**:
```
- ❌ Bibliothèque i18n (react-i18next)
- ❌ Extraction strings (clés de traduction)
- ❌ Fichiers traduction (fr, en, es?)
- ❌ Sélecteur langue
- ❌ Format dates/nombres localisé
- ❌ Traduction documents exports
```

**Timeline**: Q3 2026 (si expansion hors France)

---

### 13. 🔐 Sécurité Avancée

**Impact**: 🟢 IMPORTANT - Protection
**Effort**: Variable
**Document**: `docs/SECURITY_ANALYSIS.md`

#### 13.1 Authentification 2FA ✅ (03/04/2026 — PR #220)

```
- ✅ TOTP via Supabase MFA natif (Google Authenticator, Authy, 1Password)
- ✅ Hook useMfa (enroll, verify, unenroll, AAL check)
- ✅ Composant MfaEnrollment (QR code + copie clé + vérification)
- ✅ Composant MfaChallenge (écran intermédiaire au login)
- ✅ Card 2FA fonctionnelle dans Settings > Sécurité (activer/désactiver)
- ✅ Intégration LoginForm (détection AAL + challenge MFA)
- ✅ ProfileSidebar connecté au vrai état MFA
- ❌ SMS OTP (Twilio) — prévu V2
- ❌ Recovery codes — prévu V2
```

#### 13.2 Rate Limiting

```
- ❌ Configuration Supabase (API limits)
- ✅ Rate limiting custom (Edge Functions) — send-email 10/min + send-push 30/min, réponse 429 ✅
- ❌ Alerts dépassement limites
```

**Effort**: 2 jours
**Timeline**: Q2 2026

#### 13.3 Chiffrement Données Sensibles

```
- ❌ pgsodium installation
- ❌ Chiffrement handicap_type, specific_needs
- ❌ Clés gestion (vault)
- ❌ Migration données existantes
```

**Effort**: 1 semaine
**Timeline**: Q3 2026 (si conformité stricte)

#### 13.4 Headers Sécurité

```
- ✅ Content-Security-Policy — enforcement (`netlify.toml`, voir `SECURITY_CHECK_2026-03-26.md`)
- ✅ X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy — déjà présents sur Netlify (`netlify.toml`)
```

**Effort**: suivi lors des changements de dépendances / inline scripts
**Timeline**: continu

---

## 📋 BACKLOG - À PRIORISER

### 14. Reconnaissance Vocale — Fallback Firefox (Whisper)

**Impact** : 🟡 IMPORTANT — Firefox (~30% des utilisateurs desktop) sans reconnaissance vocale
**Effort** : 1 jour
**Document** : `docs/SPEECH_RECOGNITION_FIREFOX.md`

**Solution retenue** : Option A — MediaRecorder + OpenAI Whisper via Edge Function

```
- ❌ Créer supabase/functions/speech-to-text/index.ts (Whisper API)
- ❌ Ajouter OPENAI_API_KEY dans les secrets Supabase
- ❌ Modifier useSpeechRecognition : fallback MediaRecorder si !isSupported
- ❌ Exposer isUsingFallback: boolean dans le return du hook
- ❌ Mettre à jour VoiceInput + NewLogEntryModal (indicateur "mode différé")
- ❌ Tests mock Edge Function + MediaRecorder
```

**Timeline** : Semaines 11-12/2026

---

### 15. Fonctionnalités Avancées

#### 14.1 Messagerie Temps Réel Améliorée

- ✅ Pièces jointes (images, documents) ✅ (09/03/2026)
- ❌ Émojis/réactions
- ❌ Recherche dans messages
- ❌ Archivage conversations
- ❌ Appels vidéo (WebRTC?)

**Effort**: 2 semaines

#### 14.2 Gestion Inventaire Matériel

- ❌ Liste matériel médical
- ❌ Traçabilité utilisation
- ❌ Alertes péremption/maintenance
- ❌ Commandes/réapprovisionnement

**Effort**: 1 semaine

#### 14.3 Formation & Certifications

- ❌ Parcours formation obligatoire
- ❌ Certifications (dates validité)
- ❌ Modules e-learning
- ❌ Suivi progression

**Effort**: 3 semaines

#### 14.4 Facturation Automatisée

- ❌ Génération factures mensuelles
- ❌ Paiement en ligne (Stripe)
- ❌ Historique paiements
- ❌ Relances automatiques

**Effort**: 2 semaines

#### 14.5 Refactoring — Gros Composants et Services

Fichiers identifiés le 24/02/2026 comme candidats prioritaires au découpage (seuil > 500 lignes) :

| Fichier | Lignes | Type | Statut |
|---------|--------|------|--------|
| `components/planning/NewShiftModal.tsx` | ~811 | Composant | ✅ Décomposé (PR #109) → `useNewShiftForm`, `Guard24hSection`, `ShiftHoursSummary` |
| `services/notificationService.ts` | ~400 | Service | ✅ Splitté (24/02) → `notificationService.core.ts` + `notificationCreators.ts` |
| `components/clock-in/ClockInPage.tsx` | ~557 | Page | ✅ Décomposé (PR #113) → `useClockIn`, `ClockInProgressSection`, `ClockInTodaySection` |
| `components/planning/ShiftDetailModal.tsx` | ~979 | Composant | ✅ useReducer (PR #95) — 13 useState → 1 reducer |
| `services/absenceService.ts` | 592 | Service | ✅ Splitté (PR #110) → `absenceJustificationService.ts` |
| `services/caregiverService.ts` | 582 | Service | ✅ Splitté (PR #111) → `caregiverTeamService.ts` |
| `components/team/NewContractModal.tsx` | 546 | Composant | ✅ Décomposé (PR #112) → `useNewContractForm`, `ContractLeaveHistorySection` |
| `components/team/TeamPage.tsx` | 504 | Page | ✅ Décomposé (PR #119) |
| `components/profile/sections/EmployeeSection.tsx` | 504 | Composant | ✅ Décomposé (PR #119) |

**Actions suggérées** :
```
- ✅ NewShiftModal → useNewShiftForm + Guard24hSection + ShiftHoursSummary (PR #109 — 26/02/2026)
- ✅ ShiftDetailModal → 13 useState → useReducer (24/02/2026 — PR #95)
- ✅ ClockInPage → useClockIn + ClockInProgressSection + ClockInTodaySection (PR #113 — 26/02/2026)
- ✅ notificationService → splitté en notificationService.core.ts + notificationCreators.ts (24/02/2026)
```

**Effort estimé** : 1 semaine par composant majeur
**Timeline** : Q2-Q3 2026 (après stabilisation tests E2E)

#### 14.6 IA & Automation

- ❌ Suggestions planning optimal (ML)
- ❌ Prédiction absences (pattern recognition)
- ❌ Chatbot support (FAQ)
- ❌ Reconnaissance vocale améliorée

**Effort**: Variable (R&D requis)

---

## 🧪 Tests & Qualité

### 15. Tests E2E (End-to-End)

**Impact**: 🟡 IMPORTANT - Qualité
**Effort**: 2 semaines
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md` (Phase 4)

**Setup Playwright** : ✅ installé (PR #244) — chromium, `e2e/`, `playwright.config.ts`

**Tests existants (7)** :
```
- ✅ auth.spec.ts — affiche la page de connexion
- ✅ auth.spec.ts — redirige vers connexion si non authentifié
- ✅ auth.spec.ts — affiche une erreur sur mauvais mot de passe
- ✅ dashboard.spec.ts — affiche le dashboard après login
- ✅ dashboard.spec.ts — affiche la navigation principale
- ✅ dashboard.spec.ts — navigue vers le planning
- ✅ dashboard.spec.ts — navigue vers la messagerie
```

**Scénarios critiques métier (à écrire)** :
```
- ❌ Auth flow complet (signup → sélection rôle → profil)
- ❌ Création contrat → shifts → validation conformité
- ❌ Export CESU bout-en-bout
- ❌ Notifications push
- ❌ Gestion équipe complète
```

**Effort**: 1 semaine (infrastructure déjà en place)
**Timeline**: Q2 2026

---

### 16. Performance & Optimisation

**Impact**: 🟡 IMPORTANT - UX
**Effort**: 1 semaine

#### 16.1 Bundle Size Optimization & Code Splitting

**Constat audit 09/02/2026** : Toutes les pages étaient importées de manière synchrone dans `App.tsx`.
**Correction 10/02/2026** : 11 pages converties en `React.lazy()` + `<Suspense>` global avec fallback `<LoadingPage />`. Seuls les composants auth (LoginForm, SignupForm, etc.) restent en import statique (chemin critique).

```
- ✅ Code splitting avec React.lazy() + Suspense sur toutes les routes (10/02/2026)
- ✅ manualChunks Rollup : vendor 1.9MB → 7 chunks logiques (10/04/2026)
- ✅ Import dynamique xlsx : ne charge que sur clic "Exporter Excel" (10/04/2026)
- ✅ Mesurer le gain : -47% initial load (907KB → 478KB gzip)
- ❌ Compression assets (vite-plugin-compression — Netlify gzip déjà actif)
- ❌ CDN pour assets statiques
```

**Résultats (10/04/2026)** :

| Chunk | Gzip | Chargement |
|-------|------|-----------|
| vendor-core (React + Router…) | 315 KB | Toujours |
| vendor-chakra (@chakra-ui + @ark-ui + Emotion) | 77 KB | Toujours |
| vendor-supabase | 49 KB | Toujours |
| vendor-forms (zod + react-hook-form) | 27 KB | Toujours |
| vendor-dates (date-fns) | 9 KB | Toujours |
| **Total initial** | **477 KB** | — |
| vendor-pdf (@react-pdf/renderer) | 331 KB | Lazy (DocumentsPage / PlanningPage) |
| vendor-xlsx (SheetJS + pako) | 176 KB | Dynamique (clic Export Excel uniquement) |

La cible < 200 KB n'est pas atteignable avec React 19 + Chakra UI v3 + Supabase. L'optimisation réelle : **caching indépendant par chunk + PDF/XLSX exclus du bundle initial**.

#### 16.2 Performance Runtime

```
- ✅ Optimiser calculateNightHours() — calcul O(1) par intersections d'intervalles (utils.ts:126) ✅
- 🔧 refetchOnWindowFocus — non applicable : pas de TanStack Query en prod (useEffect + services)
- ❌ React.memo sur composants lourds — non audité, à faire si perf concrète mesurée
- ❌ useMemo/useCallback optimisations — non audité
- ❌ Virtualisation listes longues — pas de grandes listes pour l'instant
- 🔧 Image lazy loading — non pertinent (pas d'images app, avatars via signed URLs Supabase)
- ✅ Service Worker caching — workbox actif (assets + Storage Supabase cachés, /rest/v1/ exclu volontairement) ✅
```

#### 16.3 Monitoring

```
- ❌ Web Vitals tracking
- ❌ Sentry error tracking
- ❌ LogRocket session replay
- ❌ Uptime monitoring (UptimeRobot)
```

**Timeline**: Q2 2026

---

## 📅 Timeline Globale 2026

### Q1 2026 (Janvier - Mars)

**Semaine 6** (Terminée ✅):
- ✅ Logger centralisé (créé + intégré dans tous les fichiers)
- ✅ Fix majorations hardcodées (MAJORATION_RATES + calculateOvertimeHours)
- ✅ Finaliser Web Push (icônes PWA générées, robots.txt ajouté)

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
- ✅ Finaliser Web Push (VAPID configuré, icônes PWA générées)

**Semaine 8** (17-21 février) :
- ✅ Sprint tests hooks restants : useComplianceMonitor, usePushNotifications, useSpeechRecognition (835 tests, 42% coverage, 7/7 hooks) — PR #71
- ✅ Feature Présence Responsable Jour/Nuit — IDCC 3239 (PR #72)
- ✅ Logo SVG Unilien dans header (PR #73)
- ✅ Feature Reprise historique congés à la création de contrat antérieur

**Semaine 9-10** (18-24 février) :
- ✅ Setup CI/CD tests (GitHub Actions — pr-checks.yml)
- ✅ Export Bulletins de Paie PDF (jsPDF, cotisations salariales + patronales, exonération SS)
- ✅ Documentation PCH (tarifs 2026 + plan implémentation 4 niveaux)
- ✅ Toggles accessibilité fonctionnels (contraste, mouvement réduit, lecteur d'écran, taille texte)
- ✅ Tests composants UI — 6 widgets + 2 vues planning + 3 dashboards + cotisations + conformité
- ✅ Hook `useEmployerResolution` (9e hook — 23/02/2026) — LiaisonPage + LogbookPage sans imports Supabase
- ✅ Sanitisation `notificationService` (`title` + `message`) — 23/02/2026
- ✅ Migration `030_guard_segments_v2.sql` — garde 24h N-segments libres
- ✅ **Sprint /wd:analyze** (24/02/2026) — 9 PRs : bug CRITIQUE dimanche presence_day, useReducer ShiftDetailModal, useNotifications double-render, fenêtre requête, ErrorBoundary par route, découpages services
- ✅ **1605 tests** / 79 fichiers (~60% coverage)

**Semaines 11-13** (mars 2026) :
- ✅ Export planning (PDF mensuel, Excel, iCal) — PR #124
- ✅ URLs francisées — PR #126
- ✅ Fix validation inter-employeurs — PR #135
- ✅ Répétition d'interventions (hebdomadaire/personnalisée) — PR #136
- ✅ Conversations privées — PR #137
- ✅ Dashboard — alignement prototype (greeting, nudges, planning du jour, tendances, budget) — PRs #138–#140
- ✅ Analytics page — PR #141
- ✅ Team enrichissement (cards, recherche, invitation) — PR #142
- ✅ Compliance redesign (score ring, alert cards, IDCC checks)
- 🟡 Notifications Email
- 🟡 Vérification téléphone SMS
- 🟡 Tests composants UI critiques restants (Phase 3)
- ✅ Documentation sécurité / accessibilité / SEO alignée (`041` + `SECURITY_CHECK` — 26–27/03/2026)
- ✅ Design tokens sémantiques (~237 hex migrés) — PR #185
- ✅ Dark mode complet — PR #192
- ✅ Fix 21 violations WCAG — PR #186
- ✅ Toast notifications — PR #191
- ✅ Cookie consent banner + Legal page — PR #193
- ✅ Migration jsPDF → @react-pdf/renderer — PR #201
- ✅ Convention settings persistées en DB (migration 048) — PR #208
- ✅ axe-core + eslint-plugin-jsx-a11y — PR #210
- ✅ Docs sécurité / coverage mis à jour — PR #212

### Q2 2026 (Avril - Juin)

**Semaines 14-20 — Terminé ✅** :
- ✅ 2FA TOTP — PR #220
- ✅ Refonte copy homepage — PRs #218-#219
- ✅ Onboarding widget — PR #237
- ✅ Page aide — PR #235
- ✅ OAuth Google/Microsoft — PR #238
- ✅ Email notifications Resend — PR #240
- ✅ Tests E2E Playwright (8 tests) — PR #244
- ✅ Revue roadmap complète — PR #245
- ✅ Fix sécurité attachmentService — PR #241

**Semaines 21-22 (en cours)** :
- 🔴 Domaine Resend (débloquer email prod)
- 🟡 Demo banner + empty state dashboard
- 🟡 Document search
- 🟡 Analytics exports
- 🟡 Profile completion widget

**Semaine 23-26** :
- 🟡 SMS notifications + vérification téléphone
- 🟡 Tests UI Phase 3 (composants restants)
- 🟡 Spacing tokens custom
- 🟢 Performance (Web Vitals, Sentry)
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

- ✅ Coverage tests ≥ 30% (atteint 37% le 12/02/2026) ✅
- ✅ Coverage tests ≥ 60% (atteint ~60% le 24/02/2026 — 1605 tests / 79 fichiers) ✅
- ✅ Coverage tests ≥ 70% (atteint 70%+ le 27/02/2026 — 1897 tests / 97 fichiers — PR #121) ✅
- ❌ 0 bugs critiques en production
- ✅ **NOUVEAU** : 0 secrets exposés dans le filesystem (clé VAPID, .env protégé par git) ✅
- ✅ **NOUVEAU** : Toutes les routes protégées par garde centralisée (ProtectedRoute) ✅ 10/02/2026
- ✅ **NOUVEAU** : Sanitisation systématique des entrées utilisateur dans tous les services ✅ 10/02/2026
- ✅ **NOUVEAU** : Client Supabase fail-fast si env vars manquantes ✅ 10/02/2026
- ✅ **NOUVEAU** : Trigger handle_new_user crée employees/employers automatiquement ✅ 10/02/2026
- ✅ **NOUVEAU** : Error Boundary global (crash = écran de secours, pas écran blanc) ✅ 10/02/2026
- ✅ **NOUVEAU** : Code splitting React.lazy() sur 11 pages (bundle initial allégé) ✅ 10/02/2026
- ✅ **NOUVEAU** : 0 `as any` et 0 `eslint-disable` type dans le codebase ✅ 10/02/2026
- ✅ Notifications in-app + Realtime (Supabase)
- 🔧 Notifications multi-canal Push + Email — Email ✅ (Resend, templates, préférences PR #240) | Push 🔧 (code complet, VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY à configurer dans .env + secrets Supabase)
- 🔧 Export documents conformes légalement — Bulletins paie ✅ (cotisations IDCC 3239 2025, majorations dim/férié/nuit/HS, PCH, PAS, exo SS), CESU ✅ (PR #205), Planning PDF/Excel/iCal ✅ | presenceResponsiblePay et nightPresenceAllowance hardcodés à 0 dans payslipService.ts (non calculés depuis les shifts)
- ✅ Logger production sécurisé (✅ logger.ts avec redaction)

### Objectifs Q2 2026

- ✅ Coverage tests ≥ 70% ✅ (atteint en Q1 — PR #121)
- 🔧 Tests E2E critiques passent — Playwright configuré, auth setup + 7 tests auth/dashboard (PR #244) | user.json vide (E2E_EMAIL/E2E_PASSWORD à configurer), tests dashboard KO sans session valide, scénarios critiques (planning, absences, documents) manquants
- ❌ Score Web Vitals > 90
- ✅ 2FA disponible ✅ (TOTP — PR #220)
- - 🔧 Analytics (page /analytique créée PR #141 — exports restants)

### Objectifs Q3-Q4 2026

- ❌ App mobile (beta)
- ❌ i18n support
- ❌ Chiffrement données sensibles
- ❌ 1000+ utilisateurs actifs

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
- `docs/SECURITY_CHECK_2026-03-26.md` - Revue synthétique post-migration 041
- `docs/ACCESSIBILITY.md` - Accessibilité (WCAG, préférences, limites)
- `docs/TEST_COVERAGE_ANALYSIS.md` - Plan tests détaillé
- `docs/issues/HARDCODED_MAJORATIONS_ISSUE.md` - Bug critique exports
- `docs/TODO_NOTIFICATIONS.md` - Détails notifications
- `docs/PHONE_VERIFICATION.md` - Vérification SMS
- `docs/compliance/README.md` - Règles métier conformité
- `CODE_MODERNITY_ANALYSIS.md` - Analyse modernité du code (mise à jour 11/02/2026)
- `README.md` - Setup & installation

> **Note** : Audit complet multi-domaines réalisé le 09/02/2026 couvrant sécurité, qualité, architecture, accessibilité et performance. Les résultats sont intégrés dans cette roadmap aux sections P0 (0a-0f), 2b (✅ corrigé 10/02/2026), 2c, et 16 (16.1 code splitting ✅). Semaine 7 : 4 PRs mergées (absences IDCC 3239, interventions 24h, label brut, fix validation) + sprint tests massif le 12/02 (786 tests, couverture 37%, objectif Q1 atteint). Semaine 8 : sprint hooks terminé (835 tests, 42%, 7/7 hooks), feature présence responsable IDCC 3239 (#72), logo SVG (#73), reprise historique congés. **Mars 2026** : migration **041** + documentation sécurité réalignée (`SECURITY_CHECK_2026-03-26`, analyses IDOR/XSS/pentest/offensive).

---

## ✅ Prochaines Actions — Priorités Q2 2026

> Mise à jour : 10 avril 2026. Toutes les actions P0 (sécurité, bugs critiques) sont résolues.

### 🔴 P1 — À faire prochainement

1. **Domaine Resend** — vérifier un domaine pour débloquer l'envoi email à tous les utilisateurs (actuellement limité à `vzepharren@yahoo.fr`)
   - ❌ Ajouter un domaine vérifié dans Resend
   - ❌ Mettre à jour `from:` dans Edge Function `send-email`

2. **Demo banner + Empty state dashboard**
   - ❌ Bandeau "Mode démo" dismissible (localStorage)
   - ❌ Variante dashboard quand aucun employé/intervention (icône + CTA)

3. **Document search + table unifiée**
   - ❌ Champ recherche sur la page Documents (nom, type, période)
   - ❌ Optionnel : table `documents` centralisée avec `category` + métadonnées

4. **Analytics exports**
   - ❌ Export Excel (données brutes interventions)
   - ❌ Export PDF graphiques
   - ❌ Heures travaillées vs contractuelles (auxiliaire)

5. **Profile completion widget** (prototype `profile.html`)
   - ❌ Widget progression par rôle (employer/employee/caregiver)
   - ❌ Champs manquants listés avec liens
   - Voir `memory/profile-completion-widget.md`

6. **Présence responsable & présence nuit dans les bulletins de paie**
   - ❌ Calculer `presenceResponsiblePay` (2/3 du salaire) depuis les shifts `presence_responsable` — actuellement hardcodé à `0` dans `payslipService.ts:105`
   - ❌ Calculer `nightPresenceAllowance` (indemnité forfaitaire) depuis les shifts de présence nuit — actuellement hardcodé à `0` dans `payslipService.ts:106`
   - ⚠️ Corriger `sundayMajoration` pour `presence_day` : utiliser `presenceResponsiblePay` comme base au lieu de `basePay`

### 🟡 P2 — Moyen terme

7. **SMS & vérification téléphone** (Twilio Verify)
   - ❌ Edge Function `send-sms` + `verify-phone`
   - ❌ Champ `phone_verified` dans `profiles`
   - ❌ UI saisie code 6 chiffres

8. **Contact page** (basse priorité)
   - ❌ Optgroups sur le sélecteur de sujet
   - ❌ Upload pièce jointe (PDF/PNG, 5 Mo max)

9. **Spacing tokens custom** — compléter la migration design tokens
   - ❌ Espaces custom (`spacing.xs`, etc.) dans le thème Chakra UI v3

10. **Touch targets 44px** — système global pour mobile (AccessibleInput/Select déjà partiels)

11. **Tests UI — Phase 3** — composants restants sans couverture
    - ✅ SettingsPage (66 tests)
    - ❌ LiaisonPage — pas de tests
    - ❌ LogbookPage — pas de tests
    - ❌ Nouveaux tests E2E (création shift, export CESU, notifications)

### 🟢 V2 — Long terme

11. **SMS OTP + Recovery codes 2FA**
12. **Gestion équipe avancée** : recherche/filtres, disponibilités, évaluations
13. **Stripe** : intégration abonnement
14. **pgsodium** : chiffrement colonnes médicales (`handicap_type`, `specific_needs`)
15. **Sentry** : error tracking production
16. **Web Vitals** : monitoring Core Web Vitals
17. **TaskSelector** : drag & drop (dnd-kit) + lien majorations IDCC
18. **Speech recognition Firefox** : fallback Whisper via Edge Function
19. **App mobile** : Capacitor (Q3-Q4 2026)
20. **i18n** : react-i18next (si expansion hors France)

---

### Semaine 6 - Bilan (Terminé — Historique)

1. ~~**Logger centralisé**~~ ✅ TERMINÉ (03/02/2026)
   - ✅ Créer src/lib/logger.ts
   - ✅ Remplacer console.* dans tous les fichiers (services, hooks, composants)
   - ✅ Redaction données sensibles
   - ✅ Intégration dashboard, planning, profile, team, documents

2. ~~**Fix majorations hardcodées**~~ ✅ CORRIGÉ
   - ✅ Utiliser MAJORATION_RATES depuis calculatePay.ts (plus de valeurs hardcodées)
   - ✅ Calcul réel des heures sup via calculateOvertimeHours()
   - ✅ Gestion has_night_action (acte vs présence seule)
   - ✅ Tests unitaires declarationService.test.ts (77 tests)

### 🚨 URGENT - Actions Immédiates Post-Audit (09/02/2026)

> Ces actions ont été identifiées lors de l'audit complet du 9 février 2026.
> Elles sont prioritaires sur les tâches de la semaine 7.

**0. Sécurité critique (AUJOURD'HUI)**:
   - ✅ Régénérer les clés VAPID et supprimer `.vapid-keys.json` du filesystem (09/02/2026)
   - ✅ Dépôt git initialisé, `.gitignore` actif (09/02/2026)
   - ✅ Vérifié : `.env` et `.vapid-keys.json` sont bien exclus de git (09/02/2026)
   - ✅ Secrets VAPID configurés sur Supabase + Edge Function redéployée v12 (09/02/2026)
   - ✅ Migrations synchronisées (22 marquées applied) (09/02/2026)
   - ✅ config.toml corrigé (clés non supportées retirées) (09/02/2026)
   - ✅ Faire échouer explicitement le client Supabase si env vars manquantes (10/02/2026)

**1. Protection des routes** ✅ (10/02/2026):
   - ✅ Créer composant `<ProtectedRoute>` centralisé
   - ✅ L'appliquer à toutes les routes authentifiées dans `App.tsx`
   - ✅ Ajouter support restriction par rôle (`allowedRoles`)
   - ✅ Supprimer les gardes auth individuelles dans 9 composants

**2. Sanitisation des entrées** ✅ (10/02/2026):
   - ✅ Appliquer `sanitizeText()` sur `notes`/`tasks` dans `shiftService.ts`
   - ✅ Auditer et corriger les autres services (liaison, absence, logbook, profile, caregiver)

**2b. Fix FK constraint** ✅ (10/02/2026):
   - ✅ Migration 024 : handle_new_user crée employees/employers automatiquement
   - ✅ Rattrapage utilisateurs existants (backfill)
   - ✅ Validation côté front (profileComplete check)

**3. Qualité code** ✅ (10/02/2026):
   - ✅ Créé `src/lib/mappers.ts` avec `mapProfileFromDb()` + `createDefaultProfile()`
   - ✅ Supprimé 4 blocs dupliqués et 2 `as any` dans `useAuth.ts`
   - ✅ Ajouté Error Boundary global dans `main.tsx` (`src/components/ui/ErrorBoundary.tsx`)
   - ✅ Code splitting : 11 pages en `React.lazy()` + `Suspense` dans `App.tsx`
   - ✅ Typé 9 mappers dans 7 services (5 nouvelles interfaces DB dans `database.ts`)
   - ✅ Éliminé 13/14 `eslint-disable` (1 restant justifié : `react-hooks/exhaustive-deps`)

### Cette Semaine (Semaine 7 - 10-14 février)

3. **Tests declarationService** ✅ (12/02/2026)
   - ✅ Créé declarationService.test.ts (34 tests)
   - ❌ Tests d'intégration export CESU
   - ❌ Code review + Merge

4. **Web Push finalization** ✅ (19/02/2026)
   - ✅ ~~Générer clés VAPID~~ → Inclus dans actions urgentes ci-dessus
   - ✅ Config variables env (VITE_VAPID_PUBLIC_KEY)
   - ✅ Déployer Edge Function send-push-notification (v12)
   - ✅ Tests navigateurs

5. **Sprint tests services + hooks** ✅ (12/02/2026)
   - ✅ 13/13 services testés (488 tests services au total)
   - ✅ 4/8 hooks testés (useNotifications, useComplianceCheck, useShiftReminders)
   - ✅ Couverture services : 91.42% statements
   - ✅ Setup GitHub Actions coverage (30 min)

### Semaine 8 - Bilan (17 février) ✅

6. **Tests hooks restants** (Phase 2b) ✅ (17/02/2026)
   - ✅ useComplianceMonitor.test.ts
   - ✅ usePushNotifications.test.ts
   - ✅ useSpeechRecognition.test.ts
   - ✅ 835 tests / 35 fichiers / 42% coverage

7. **Feature Présence Responsable** ✅ PR #72 (17/02/2026)
   - ✅ Nouveau type shift (effective, presence_day, presence_night)
   - ✅ Conversion 2/3 jour, indemnité forfaitaire nuit
   - ✅ Seuil requalification ≥4 interventions
   - ✅ Validations compliance supplémentaires

8. **Logo SVG + Reprise congés** ✅ (17/02/2026)
   - ✅ Logo SVG dans header (PR #73)
   - ✅ Reprise historique congés pour contrats antérieurs

### Semaine 9 (18-24 février 2026)

9. **Setup CI/CD tests** ✅ (19/02/2026)
   - ✅ GitHub Actions : vitest coverage sur chaque PR (pr-checks.yml)
   - ✅ Job `Code Quality` + job `Accessibility Check` (noms requis branch protection)
   - ✅ Commentaire automatique coverage + taille build sur chaque PR

10. **Export Bulletins de Paie PDF** ✅ (19/02/2026)
    - ✅ Générateur PDF complet (jsPDF) — cotisations salariales + patronales + net à payer
    - ✅ Exonération cotisations patronales SS (Art. L241-10 CSS — PCH/invalide/MTP/PCTP)
    - ✅ Onglet "Bulletins de paie" dans page Documents
    - ✅ Tarifs IDCC 3239 2025 (`cotisationsCalculator.ts`)

11. **Documentation PCH** ✅ (19/02/2026)
    - ✅ `docs/PCH_PRESTATION_COMPENSATION_HANDICAP.md` — tarifs 2026, connexion IDCC 3239
    - ✅ Plan d'implémentation 4 niveaux intégré dans la roadmap

12. **Toggles d'accessibilité fonctionnels** ✅ (19/02/2026)
    - ✅ `AccessibilityApplier` dans `App.tsx` — data-attributes sur `<html>` réactifs au store Zustand
    - ✅ Contraste élevé : fond noir / texte blanc (`[data-high-contrast]`)
    - ✅ Mouvement réduit : animations/transitions à 0ms (`[data-reduced-motion]`)
    - ✅ Lecteur d'écran : focus ring 3px bleu sur tous les éléments (`[data-screen-reader]`)
    - ✅ Taille du texte : toggle on/off + slider 80–150% (pas 5%, défaut 120%) — scale tous les `rem` Chakra UI

13. **Tests composants UI — Dashboard widgets** ✅ (20/02/2026)
    - ✅ UpcomingShiftsWidget.test.tsx (18 tests)
    - ✅ QuickActionsWidget.test.tsx (10 tests)
    - ✅ StatsWidget.test.tsx (18 tests)
    - ✅ ComplianceWidget.test.tsx (11 tests)
    - ✅ TeamWidget.test.tsx (12 tests)
    - ✅ RecentLogsWidget.test.tsx (15 tests)
    - ✅ **Total** : 84 nouveaux tests — **1010 tests / 45 fichiers**

14. **Tests composants UI — Vues planning** ✅ (20/02/2026)
    - ✅ WeekView.test.tsx (25 tests) — grille 7 jours, shifts, absences, multi-jours, callbacks, clavier
    - ✅ MonthView.test.tsx (20 tests) — calendrier complet, overflow, multi-jours, callbacks
    - ✅ **Total** : 45 nouveaux tests — **1055 tests / 47 fichiers**

15. **Tests composants UI — Dashboards** ✅ (20/02/2026)
    - ✅ EmployerDashboard.test.tsx (15 tests) — composition, shifts filtrés/limités, compliance monitor
    - ✅ EmployeeDashboard.test.tsx (10 tests) — composition, shifts filtrés/limités, pas de team/compliance
    - ✅ CaregiverDashboard.test.tsx (18 tests) — loading, null caregiver, permissions, erreurs
    - ✅ **Total** : 43 nouveaux tests — **1098 tests / 50 fichiers**

16. **Tests export + conformité** ✅ (20/02/2026)
    - ✅ cotisationsCalculator.test.ts (34 tests) — pure function, barèmes IDCC 3239 2025, exonération SS, PAS, cas limites
    - ✅ ComplianceDashboard.test.tsx (22 tests) — loading, stat cards, tableau, navigation semaine, aide, actualiser
    - ✅ **Total** : 56 nouveaux tests — **1154 tests / 52 fichiers**

---

## 🔄 Cycle de Review

- **Hebdomadaire**: Review roadmap, ajustements priorités (chaque lundi)
- **Mensuel**: Analyse métriques, retrospective
- **Trimestriel**: Stratégie, budget, recrutement

> **Dernière review**: 10 avril 2026 — Revue complète roadmap (PR #245) : 9 sections auditées, prototype gap 96/102 (94%), E2E Playwright, email Resend, 2FA TOTP, OAuth ; métriques : **2210 tests / 126 fichiers** (Semaine 20 — 10/04/2026).

---

**Maintenu par**: Tech Lead
**Prochaine revue**: mai 2026
**Feedback**: [Ouvrir une issue](https://github.com/zephdev-92/Unilien/issues)
