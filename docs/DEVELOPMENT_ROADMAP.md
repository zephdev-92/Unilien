# 🗺️ Roadmap de Développement - Unilien

**Dernière mise à jour**: 9 février 2026 (post-audit complet)
**Version**: 1.1.0
**Statut projet**: 🟡 En développement actif

---

## 📊 Vue d'Ensemble

### État Actuel

| Catégorie | Complétude | Statut |
|-----------|------------|--------|
| **Authentification** | 95% | ✅ Excellent (login, signup, reset, rôles) |
| **Dashboards** | 95% | ✅ Excellent (3 dashboards rôle-spécifiques) |
| **Planning** | 90% | ✅ Bon (semaine/mois, shifts, absences) |
| **Cahier de liaison** | 80% | 🟡 Bon (realtime, typing indicators) |
| **Équipe/Contrats** | 90% | ✅ Bon (contrats, aidants, permissions) |
| **Conformité** | 95% | ✅ Excellent |
| **Documents/Export** | 75% | 🟡 À améliorer (gestion OK, exports avancés manquants) |
| **Notifications** | 70% | 🟡 Partiel (in-app + push OK, email/SMS manquants) |
| **Tests** | 20% | 🔴 Critique (16 fichiers, couverture limitée) |
| **Sécurité** | 70% | 🔴 À corriger (secrets exposés, routes non protégées) |

### Métriques Clés

- **Fichiers source**: ~140 fichiers TS/TSX
- **Lignes de code**: ~16,000 lignes
- **Tests**: 16 fichiers (~20% coverage)
- **Migrations DB**: 23 migrations
- **Composants UI**: ~65 composants
- **Services**: 13 services
- **Hooks**: 8 hooks
- **Routes**: 16 routes (dont 10 protégées)

---

## ✅ Réalisations Récentes (Semaines 6-7 - Février 2026)

### Audit Complet (09/02/2026)

Audit multi-domaines réalisé couvrant sécurité, qualité, architecture, accessibilité et performance. Résultats :
- **2 problèmes critiques** : clé VAPID privée exposée, credentials .env sans protection git
- **4 problèmes hauts** : routes sans garde, client Supabase silencieux, sanitisation manquante, duplication code
- **6 problèmes moyens** : error boundary absent, code splitting manquant, types Supabase génériques, emojis accessibilité, ARIA live regions, performance calculateNightHours
- **5 problèmes bas** : focus SPA, refetchOnWindowFocus désactivé, paramètre _date inutilisé

### Fonctionnalités Complétées

| Fonctionnalité | Détails |
|----------------|---------|
| **Logger Centralisé** | `src/lib/logger.ts` - Redaction automatique, 4 niveaux, intégré dans tous les fichiers |
| **Dashboards Complets** | 3 dashboards rôle-spécifiques (Employer, Employee, Caregiver) avec widgets |
| **Profil Complet** | Sections PersonalInfo, Employee, Employer, Caregiver, Accessibility + avatar upload |
| **Équipe & Contrats** | Gestion auxiliaires, aidants, contrats CDI/CDD, permissions granulaires |
| **Planning Complet** | Vues semaine/mois, shifts CRUD, absences avec justificatifs, approbation |
| **Documents** | Gestion absences/justificatifs, filtres, statistiques, approbation |
| **Notifications In-App** | Bell icon, badge, panel, mark as read, dismiss, Realtime Supabase |
| **Push Notifications** | Code implémenté, service worker, Edge Function (config VAPID restante) |
| **Messaging Realtime** | Cahier de liaison temps réel avec indicateurs de frappe |
| **Navigation Responsive** | Sidebar rôle-based, mobile overlay, accessibility (skip link) |
| **23 Migrations DB** | Tables, RLS policies, fonctions, storage buckets, realtime |
| **16 Fichiers Tests** | Compliance (7), Auth (4), Services (3), Store (1), Hook (1) |
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

### 0b. 🔴 CRITIQUE : Fichier .env avec Credentials en Clair (hors git)

**Fichier**: `.env`
**Impact**: 🔴 CRITIQUE - Credentials Supabase exposées
**Effort**: 15 min
**Statut**: ❌ À CORRIGER IMMÉDIATEMENT
**Découvert**: Audit 09/02/2026

**Problème**: Le fichier `.env` contient l'URL et la clé Supabase live (`lczfygydhnyygguvponw.supabase.co`). Le projet **n'est pas un dépôt git**, donc `.gitignore` ne protège rien. Toute copie du dossier inclut les credentials.

**Actions**:
```
[ ] Initialiser le dépôt git IMMÉDIATEMENT (git init)
[ ] Vérifier que .env est bien dans .gitignore (déjà OK dans le fichier)
[ ] Utiliser .env.local pour les variables sensibles (Vite le supporte nativement)
[ ] Auditer les copies/backups du dossier F:\warp
[ ] Considérer une rotation de la clé anon Supabase si exposée
```

---

### 0c. 🔴 HAUTE : Routes Protégées Sans Garde Centralisée

**Fichier**: `src/App.tsx:104-129`
**Impact**: 🔴 HAUTE - Accès non autorisé possible
**Effort**: 1h
**Statut**: ❌ À CORRIGER
**Découvert**: Audit 09/02/2026

**Problème**: Les routes `/dashboard`, `/settings`, `/planning`, `/clock-in`, `/logbook`, `/liaison`, `/team`, `/compliance`, `/documents` n'ont **aucune garde centralisée**. Chaque composant gère sa propre authentification individuellement (commentaires : "gère sa propre protection"). Pattern fragile :
- Si un composant oublie la vérification → faille de sécurité
- Un composant `PublicRoute` existe déjà mais pas de `ProtectedRoute` équivalent
- Duplication du code de vérification dans chaque page

**Actions**:
```
[ ] Créer composant <ProtectedRoute> (même pattern que PublicRoute existant)
[ ] Wrapper toutes les routes authentifiées dans App.tsx
[ ] Supprimer les vérifications individuelles redondantes dans chaque page
[ ] Ajouter option de restriction par rôle (<ProtectedRoute allowedRoles={['employer']}>)
[ ] Tests unitaires du composant ProtectedRoute
```

---

### 0d. 🔴 HAUTE : Client Supabase Silencieux en Cas de Config Manquante

**Fichier**: `src/lib/supabase/client.ts:14-16`
**Impact**: 🔴 HAUTE - Bugs silencieux en production
**Effort**: 15 min
**Statut**: ❌ À CORRIGER
**Découvert**: Audit 09/02/2026

**Problème**: Quand les variables d'environnement sont absentes, le client Supabase se rabat silencieusement sur `'https://placeholder.supabase.co'` avec `'placeholder-key'`. Cela masque les erreurs de configuration en production et provoque des comportements imprévisibles au lieu d'un crash explicite.

**Actions**:
```
[ ] Remplacer le fallback par un throw Error explicite si VITE_SUPABASE_URL manque
[ ] Idem pour VITE_SUPABASE_ANON_KEY
[ ] Garder un message clair pour aider au debug ("Variables VITE_SUPABASE_* manquantes")
```

---

### 0e. 🔴 HAUTE : Sanitisation Manquante dans les Services

**Fichier**: `src/services/shiftService.ts` (lignes 86, 147)
**Impact**: 🔴 HAUTE - XSS potentiel via données stockées
**Effort**: 1h
**Statut**: ❌ À CORRIGER
**Découvert**: Audit 09/02/2026

**Problème**: Le module `sanitize.ts` existe avec DOMPurify, mais les champs `notes` et `tasks` dans `shiftService.ts` sont envoyés directement à Supabase sans sanitisation. Tout texte utilisateur pourrait contenir du HTML/JS malicieux.

**Actions**:
```
[ ] Appeler sanitizeText() sur le champ notes dans createShift()
[ ] Appeler sanitizeText() sur chaque élément du tableau tasks
[ ] Auditer les autres services (caregiverService, absenceService, liaisonService)
[ ] Appliquer sanitizeText() à tout champ texte libre avant écriture en DB
[ ] Ajouter tests unitaires vérifiant la sanitisation
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
[ ] Créer tests unitaires (declarationService.test.ts)
[ ] Tests d'intégration export CESU
[ ] Validation expert paie
```

**Timeline**: ~~Cette semaine (Semaine 6/2026)~~ Code corrigé, tests restants

---

### 2. 🧪 Couverture de Tests Insuffisante

**Impact**: 🔴 CRITIQUE - Risque de régression
**Effort**: 6-8 semaines
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md`

**État actuel**: ~20% coverage (cible: 70%)

**Tests existants (16 fichiers)**:
```
[x] src/lib/compliance/**/*.test.ts (7 fichiers - conformité)
[x] src/hooks/useAuth.test.ts
[x] src/stores/authStore.test.ts
[x] src/services/contractService.test.ts
[x] src/services/shiftService.test.ts
[x] src/services/profileService.test.ts
[x] src/components/auth/*.test.tsx (3 fichiers - LoginForm, SignupForm, etc.)
```

**Services non testés (10/13)** - P0:
```
[ ] notificationService.ts (943 lignes!) - 2 jours
[ ] absenceService.ts - 1 jour
[ ] caregiverService.ts - 1 jour
[ ] documentService.ts - 1 jour
[ ] liaisonService.ts - 1 jour
[ ] auxiliaryService.ts - 1 jour
[ ] logbookService.ts - 1 jour
[ ] complianceService.ts - 1 jour
[ ] pushService.ts - 1 jour
[ ] statsService.ts - 1 jour
```

**Hooks non testés (7/8)** - P1:
```
[ ] useNotifications.ts
[ ] useComplianceMonitor.ts
[ ] usePushNotifications.ts
[ ] useShiftReminders.ts
[ ] useSpeechRecognition.ts
[ ] useComplianceCheck.ts
```

**Quick Wins**:
```
[x] Corriger vitest.config.ts (coverage global) - 15 min
[ ] Créer premiers tests services restants - 1 semaine
[ ] Setup GitHub Actions coverage - 30 min
```

**Timeline**:
- Phase 1 (Services critiques): Semaines 6-8/2026
- Phase 2 (Hooks): Semaine 9/2026
- Phase 3 (UI): Semaines 10-14/2026

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

### 2b. 🟡 Qualité de Code - Problèmes Détectés par Audit

**Impact**: 🟡 MOYEN-ÉLEVÉ - Maintenabilité & fiabilité
**Effort**: 2-3 jours
**Statut**: ❌ À CORRIGER
**Découvert**: Audit 09/02/2026

#### Duplication Massive du Mapping Profil (useAuth.ts)

**Fichier**: `src/hooks/useAuth.ts`

Le code de conversion DB → Profile est dupliqué **4 fois** dans le même fichier :
1. `initialize()` quand le profil existe (lignes 118-129)
2. `initialize()` quand le profil est créé (lignes 151-162)
3. `signIn()` quand le profil existe (lignes 280-291)
4. `signIn()` quand le profil est créé (lignes 311-322)

+ Casting `as any` dans 2 endroits (lignes 117, 279) contournant TypeScript.

**Actions**:
```
[ ] Extraire une fonction mapProfileFromDb(data, email) réutilisable
[ ] Extraire une fonction createFallbackProfile(user) réutilisable
[ ] Supprimer les 4 duplications et les remplacer par des appels à ces fonctions
[ ] Supprimer les "as any" en typant correctement les réponses Supabase
```

**Effort**: 1h

#### Absence d'Error Boundary Global

L'application n'a pas de React Error Boundary au niveau racine. Si un composant crash, l'écran blanc sans message apparaît.

**Actions**:
```
[ ] Créer un composant ErrorBoundary global
[ ] L'intégrer dans main.tsx (wrappant <App />)
[ ] Afficher un message d'erreur accessible en cas de crash
[ ] Logger l'erreur via logger.ts
```

**Effort**: 30 min

#### Types Supabase Trop Génériques

**Fichier**: `src/lib/supabase/types.ts`

Les champs structurés utilisent `Record<string, unknown>` au lieu de types précis :
- `accessibility_settings` → devrait être `AccessibilitySettings`
- `address` → devrait être `Address`
- `computed_pay` → devrait être `ComputedPay`
- `permissions` → devrait être `CaregiverPermissions`

**Actions**:
```
[ ] Aligner les types Supabase avec les interfaces de types/index.ts
[ ] Supprimer les Record<string, unknown> génériques
[ ] Regenerer les types si possible (npx supabase gen types)
```

**Effort**: 1h

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
[ ] Ajouter aria-live="assertive" sur les alertes de conformité critiques
[ ] Ajouter aria-live="polite" sur les notifications, indicateurs de frappe
[ ] Tester avec NVDA/VoiceOver
```

**Effort**: 1h

#### Gestion du Focus après Navigation SPA

Le focus n'est pas géré après les changements de route. L'utilisateur au clavier ou lecteur d'écran se retrouve "perdu" après navigation.

**Actions**:
```
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

**Constat audit 09/02/2026** : Toutes les pages sont importées de manière synchrone dans `App.tsx`. Aucun code splitting. Pour une PWA, c'est un problème de performance au premier chargement.

```
[ ] Analyse bundle (vite-bundle-visualizer)
[ ] Code splitting avec React.lazy() + Suspense sur toutes les routes
[ ] Tree shaking
[ ] Compression assets
[ ] CDN pour assets statiques
[ ] Mesurer le gain (target : <200KB initial, <500KB total)
```

**Cible**: < 200KB initial bundle (actuellement toutes les pages chargées d'un coup)

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

**Semaine 7** (Actuelle - 10-14 février):
- 🔴 **URGENT** : Corrections sécurité post-audit (clé VAPID, git init, fallback Supabase)
- 🔴 **URGENT** : Créer ProtectedRoute + sanitisation services
- 🔴 Extraire mapProfileFromDb, supprimer duplications useAuth.ts
- 🔴 Ajouter Error Boundary global
- 🟡 Finaliser Web Push (avec nouvelles clés VAPID régénérées)
- 🔴 Début tests services critiques

**Semaines 8-10**:
- 🔴 Tests services critiques (Phase 1)
- 🟡 Notifications Email
- 🟡 Vérification téléphone SMS

**Semaines 11-13**:
- 🔴 Tests hooks (Phase 2)
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

- [ ] Coverage tests ≥ 60% (actuellement ~20%)
- [ ] 0 bugs critiques en production
- [ ] **NOUVEAU** : 0 secrets exposés dans le filesystem (clé VAPID, .env protégé par git)
- [ ] **NOUVEAU** : Toutes les routes protégées par garde centralisée (ProtectedRoute)
- [ ] **NOUVEAU** : Sanitisation systématique des entrées utilisateur dans tous les services
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
- `README.md` - Setup & installation

> **Note** : Audit complet multi-domaines réalisé le 09/02/2026 couvrant sécurité, qualité, architecture, accessibilité et performance. Les résultats sont intégrés dans cette roadmap aux sections P0 (0a-0e), 2b, 2c, et 16.

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
   - [ ] Faire échouer explicitement le client Supabase si env vars manquantes (supprimer les fallbacks placeholder)

**1. Protection des routes (CETTE SEMAINE)**:
   - [ ] Créer composant `<ProtectedRoute>` centralisé
   - [ ] L'appliquer à toutes les routes authentifiées dans `App.tsx`
   - [ ] Ajouter support restriction par rôle

**2. Sanitisation des entrées (CETTE SEMAINE)**:
   - [ ] Appliquer `sanitizeText()` sur `notes`/`tasks` dans `shiftService.ts`
   - [ ] Auditer et corriger les autres services (caregiver, absence, liaison)

**3. Qualité code (CETTE SEMAINE)**:
   - [ ] Extraire helper `mapProfileFromDb()` dans `useAuth.ts` (supprimer 4x duplication)
   - [ ] Supprimer les castings `as any` dans `useAuth.ts`
   - [ ] Ajouter un Error Boundary global dans `main.tsx`

### Cette Semaine (Semaine 7 - 10-14 février)

3. **Tests declarationService** (suite fix majorations)
   - [ ] Créer declarationService.test.ts
   - [ ] Tests d'intégration export CESU
   - [ ] Code review + Merge

4. **Web Push finalization**
   - [ ] ~~Générer clés VAPID~~ → Inclus dans actions urgentes ci-dessus
   - [ ] Config variables env (VITE_VAPID_PUBLIC_KEY)
   - [ ] Déployer Edge Function send-push-notification
   - [ ] Tests navigateurs

5. **Début tests services**
   - [ ] notificationService.test.ts (2 jours)
   - [ ] absenceService.test.ts (1 jour)
   - [ ] Setup GitHub Actions coverage (30 min)

---

## 🔄 Cycle de Review

- **Hebdomadaire**: Review roadmap, ajustements priorités (chaque lundi)
- **Mensuel**: Analyse métriques, retrospective
- **Trimestriel**: Stratégie, budget, recrutement

> **Dernière review**: 9 février 2026 - Mise à jour post-audit complet (sécurité, qualité, architecture, accessibilité, performance)

---

**Maintenu par**: Tech Lead
**Prochaine revue**: 16 février 2026
**Feedback**: [Ouvrir une issue](https://github.com/zephdev-92/Unilien/issues)
