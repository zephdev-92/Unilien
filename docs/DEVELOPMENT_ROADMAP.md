# 🗺️ Roadmap de Développement - Unilien

**Dernière mise à jour**: 5 février 2026
**Version**: 1.0.0
**Statut projet**: 🟡 En développement actif

---

## 📊 Vue d'Ensemble

### État Actuel

| Catégorie | Complétude | Statut |
|-----------|------------|--------|
| **Authentification** | 90% | ✅ Bon |
| **Dashboards** | 85% | ✅ Bon |
| **Planning** | 80% | 🟡 À améliorer |
| **Cahier de liaison** | 75% | 🟡 À améliorer |
| **Équipe/Contrats** | 80% | 🟡 À améliorer |
| **Conformité** | 95% | ✅ Excellent |
| **Documents/Export** | 70% | 🔴 Bugs critiques |
| **Notifications** | 60% | 🟡 Partiel |
| **Tests** | 15% | 🔴 Critique |
| **Sécurité** | 90% | ✅ Bon (logger centralisé) |

### Métriques Clés

- **Fichiers source**: 137 fichiers TS/TSX
- **Lignes de code**: ~15,000 lignes
- **Tests**: 16 fichiers (15% coverage)
- **Migrations DB**: 21 migrations
- **Composants UI**: 60 composants
- **Services**: 14 services
- **Hooks**: 8 hooks

---

## 🔴 PRIORITÉ 0 - BUGS CRITIQUES (Urgent)

### 1. 🐛 Majorations Hardcodées dans DeclarationService

**Fichier**: `src/lib/export/declarationService.ts`
**Impact**: 🔴 CRITIQUE - Exports CESU incorrects
**Effort**: 1 jour
**Document**: `docs/issues/HARDCODED_MAJORATIONS_ISSUE.md`

**Problèmes**:
- ❌ Majorations hardcodées (30%, 60%, 20%)
- ❌ Heures supplémentaires toujours à 0
- ❌ Non-conformité légale (Code du travail)
- ❌ Sous-paiement des employés

**Actions**:
```
[x] Exporter MAJORATION_RATES depuis calculatePay.ts
[ ] Utiliser calculateShiftPay() pour chaque shift
[ ] Implémenter calcul réel des heures sup
[ ] Créer tests unitaires (declarationService.test.ts)
[ ] Tests d'intégration export CESU
[ ] Validation expert paie
```

**Timeline**: **Cette semaine** (Semaine 6/2026)

---

### 2. 🧪 Couverture de Tests Insuffisante

**Impact**: 🔴 CRITIQUE - Risque de régression
**Effort**: 6-8 semaines
**Document**: `docs/TEST_COVERAGE_ANALYSIS.md`

**État actuel**: 15% coverage (cible: 70%)

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
[ ] Créer premiers tests services - 1 semaine
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
- Redaction automatique : emails, JWT, UUIDs, téléphones, clés API
- Sanitisation récursive des objets (clés sensibles masquées)
- Production : seuls error/warn actifs, prêt pour Sentry
- Développement : tous niveaux actifs avec données sanitisées
- 4 niveaux : `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`

**Actions**:
```
[x] Créer src/lib/logger.ts
[x] Implémenter redaction (emails, IDs, tokens, téléphones)
[x] Remplacer console.* par logger dans 47 fichiers (170+ appels)
[ ] Intégrer Sentry/LogRocket (optionnel - prêt pour intégration)
[x] Documentation équipe (JSDoc dans le fichier)
```

**Timeline**: ~~Semaine 7/2026~~ Terminé Semaine 6/2026

---

## 🟡 PRIORITÉ 1 - FONCTIONNALITÉS MANQUANTES (Important)

### 4. 📧 Notifications Email & SMS

**Impact**: 🟡 IMPORTANT - Engagement utilisateur
**Effort**: 2 semaines
**Document**: `docs/TODO_NOTIFICATIONS.md`

**État actuel**:
- ✅ Notifications Web Push (code implémenté, config manquante)
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

#### 16.1 Bundle Size Optimization

```
[ ] Analyse bundle (webpack-bundle-analyzer)
[ ] Code splitting (React.lazy)
[ ] Tree shaking
[ ] Compression assets
[ ] CDN pour assets statiques
```

**Cible**: < 500KB initial bundle

#### 16.2 Performance Runtime

```
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

**Semaine 6** (Actuelle):
- 🔴 Fix majorations hardcodées
- 🔴 Logger centralisé
- 🟡 Finaliser Web Push

**Semaines 7-10**:
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

- [x] Coverage tests ≥ 60%
- [ ] 0 bugs critiques en production
- [ ] Notifications multi-canal (Push, Email)
- [ ] Export documents conformes légalement
- [ ] Logger production sécurisé

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

---

## ✅ Prochaines Actions Immédiates

### Cette Semaine (Semaine 6)

1. **Lundi-Mardi**: Fix majorations hardcodées
   - [ ] Refactor declarationService.ts
   - [ ] Tests unitaires
   - [ ] Code review
   - [ ] Merge + déploiement

2. **Mercredi**: Logger centralisé
   - [ ] Créer src/lib/logger.ts
   - [ ] Remplacer console.* dans fichiers critiques
   - [ ] Tests

3. **Jeudi-Vendredi**: Web Push finalization
   - [ ] Générer clés VAPID
   - [ ] Config variables env
   - [ ] Déployer Edge Function
   - [ ] Tests navigateurs

### Semaine 7

4. **Début tests services**
   - [ ] notificationService.test.ts (2 jours)
   - [ ] absenceService.test.ts (1 jour)
   - [ ] Setup GitHub Actions coverage (30 min)

---

## 🔄 Cycle de Review

- **Hebdomadaire**: Review roadmap, ajustements priorités
- **Mensuel**: Analyse métriques, retrospective
- **Trimestriel**: Stratégie, budget, recrutement

---

**Maintenu par**: Tech Lead
**Prochaine revue**: 12 février 2026
**Feedback**: [Ouvrir une issue](https://github.com/zephdev-92/Unilien/issues)
