# Analyse de sécurité

_Dernière mise à jour : 2026-02-11_

## Objectif

Cette note synthétise les points de sécurité observés dans le code front-end, les fonctions edge et l'infrastructure Supabase, et propose des recommandations concrètes priorisées.

---

## Résumé exécutif

- ~~**P0 — Critique** : IDOR dans `send-push-notification`~~ ✅ Corrigé — la fonction edge utilise désormais `notificationId` (lookup DB) au lieu de `userId` brut + CORS restreint.
- **P1 — Élevé** : absence de `Content-Security-Policy` côté hébergement ; la réduction d'impact d'un XSS reste insuffisante.
- ~~**P2 — Moyen** : cache PWA + rate limiting~~ ✅ Cache REST supprimé, rate limiting ajouté sur edge function.

---

## Points positifs

### Authentification & Session
- **Gestion de session robuste via Supabase** : `autoRefreshToken`, `persistSession` et `detectSessionInUrl` sont activés, réduisant les risques de sessions expirées et d'incohérences client.【F:src/lib/supabase/client.ts†L15-L28】
- **Non‑persistance de tokens dans le store** : la configuration `partialize` du store ne persiste que le profil utilisateur, pas les tokens JWT ni la session.【F:src/stores/authStore.ts†L67-L72】
- **Fail‑fast en production** : l'application lève une erreur si les variables Supabase ne sont pas configurées, évitant un démarrage avec une config invalide.【F:src/lib/supabase/client.ts†L7-L13】
- **Protection mots de passe compromis** : HaveIBeenPwned activé pour empêcher l'utilisation de mots de passe exposés dans des fuites.【F:supabase/config.toml†auth.enable_hibp】

### Contrôle d'accès UI
- **Segmentation de l'UI par rôles** : le `Dashboard` rend des vues spécifiques selon le rôle (employer, employee, caregiver), limitant l'exposition fonctionnelle côté client.【F:src/components/dashboard/Dashboard.tsx†L43-L60】

### Validation des entrées
- **Schémas Zod pour les formulaires** : validation côté client des emails, mots de passe (8 caractères, majuscule, minuscule, chiffre), et numéros de téléphone français.【F:src/components/auth/SignupForm.tsx†L20-L57】
- **Validation des uploads avatar** : types MIME autorisés (JPEG, PNG, GIF, WebP uniquement) et limite de taille à 2 Mo.【F:src/services/profileService.ts†L33-L58】
- **Contraintes PostgreSQL** : validation backend des emails et téléphones FR au niveau base de données.【F:supabase/migrations/013_add_backend_validation.sql】

### Protection XSS
- **React échappe automatiquement** : tout contenu rendu via `{variable}` dans JSX est automatiquement échappé par React, empêchant les attaques XSS.
- **Pas de `dangerouslySetInnerHTML`** : aucune utilisation de HTML brut dans l'application.

### Protection CSRF
- **Architecture JWT** : Supabase utilise des tokens JWT en header `Authorization`, pas de cookies de session classiques, réduisant les risques CSRF.

### Audit & Traçabilité
- **Audit des uploads** : table `file_upload_audit` pour tracer tous les uploads de fichiers (justificatifs, avatars).【F:supabase/migrations/013_add_backend_validation.sql】

### Logger centralisé
- **Redaction intégrée** : le logger masque des patterns sensibles (email, JWT, clés API) et limite les niveaux de logs en production.【F:src/lib/logger.ts】

### Headers Netlify de base
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` déjà configurés.

### Row Level Security (RLS)
- **Toutes les tables protégées** : RLS activé sur toutes les tables sensibles avec policies basées sur les relations utilisateurs.【F:supabase/migrations/021_fix_rls_policy_conflicts.sql】
- **Logique métier respectée** : employés voient les données handicap de leur employeur (nécessaire pour les soins), aidants ont accès selon leurs permissions.
- **Tuteurs/Curateurs** : accès complet aux données de leur protégé (autorité légale).

---

## Points de vigilance

### Stockage client
- **localStorage vulnérable au XSS** : le store Zustand persiste dans `localStorage`, accessible en cas de faille XSS. Risque atténué par le fait que seul le profil (pas les tokens) est persisté.

### Validation
- **Double validation requise** : les schémas Zod valident côté client, les contraintes PostgreSQL valident côté serveur. Les deux sont nécessaires et doivent rester synchronisées.

---

## Analyse des données sensibles

| Donnée | Stockage | Risque | Mitigation |
|--------|----------|--------|------------|
| Tokens JWT | Mémoire (Supabase SDK) | Moyen | Non persisté dans localStorage |
| Profil utilisateur | localStorage | Faible | Pas de données médicales/bancaires |
| Mot de passe | Jamais stocké | - | Hashé côté Supabase Auth + HIBP |
| Numéro CESU | Base Supabase | Moyen | RLS strict ✅ |
| Données handicap | Base Supabase | Élevé | RLS strict ✅ (accès employés/aidants autorisés) |
| Messages liaison | Base Supabase | Moyen | RLS par employer_id ✅ |

---

## Risques actifs et recommandations

### ~~P0 — Critique~~ ✅ Corrigé (2026-02-11)

#### ~~1. IDOR dans la fonction edge de push notifications~~

**Correction appliquée**
- La fonction edge accepte désormais un `notificationId` au lieu de `userId + title + body`.
- Elle récupère la notification depuis la DB (service role) et en extrait le `user_id` cible — impossible de cibler un utilisateur arbitraire.
- Vérification anti-replay : seules les notifications créées il y a moins de 5 minutes sont livrées en push.
- CORS restreint aux domaines applicatifs connus (+ localhost en dev) au lieu de `*`.
- `console.log` sensibles supprimés (user ID, endpoints, tokens).
- Le frontend n'envoie plus que `{ notificationId }` à la fonction edge.

---

### P1 — Élevé

#### 2. CSP manquante sur l'hébergement

**Constat**
- Les headers Netlify n'incluent pas de `Content-Security-Policy`.

**Impact**
- En cas d'injection XSS, l'absence de CSP réduit fortement la capacité à contenir l'exécution de scripts arbitraires.

**Recommandation**
- Ajouter une CSP stricte et l'ajuster progressivement :
  ```
  default-src 'self'; script-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'
  ```
- Déployer d'abord en mode `Content-Security-Policy-Report-Only` puis basculer en enforcement.

---

### P2 — Moyen

#### 3. CORS permissif sur la fonction edge

**Constat**
- La fonction edge retourne `Access-Control-Allow-Origin: *`.

**Impact**
- N'ouvre pas directement la fonction sans token, mais élargit inutilement la surface d'appel cross-origin.

**Recommandation**
- Restreindre les origines autorisées aux domaines applicatifs connus (prod + preview).

#### ~~4. Cache PWA sur endpoints API Supabase~~ ✅ Corrigé (2026-02-11)

**Correction appliquée**
- Supprimé le `runtimeCaching` `NetworkFirst` sur `rest/v1/*` dans `vite.config.ts`.
- Toutes les tables contiennent des données utilisateur sensibles (profils, contrats, données handicap) — aucune n'est candidate au cache.
- Seul le cache `CacheFirst` sur `/storage/v1/*` (avatars, fichiers statiques) est conservé.

#### 5. Chiffrement des données sensibles

- Envisager le chiffrement côté client pour les données médicales (`handicap_type`, `specific_needs`).
- Utiliser `pgsodium` de Supabase pour le chiffrement au repos.

#### ~~6. Rate limiting~~ ✅ Corrigé (2026-02-11)

**Correction appliquée**
- Rate limiting en mémoire ajouté dans la fonction edge `send-push-notification` : max 30 appels/min par utilisateur authentifié (HTTP 429).
- Note : rate limiting global API (auth, REST) à configurer via le dashboard Supabase (settings > Rate Limiting).

---

## Plan d'actions priorisé

| Priorité | Action | Effort estimé |
|----------|--------|---------------|
| ~~**P0 immédiat**~~ | ~~Corriger l'autorisation dans `send-push-notification`~~ | ✅ Fait |
| **P1 court terme** | Déployer une CSP monitorée (Report-Only → enforcement) | Moyen |
| ~~**P2 court terme**~~ | ~~Restreindre CORS edge aux domaines connus~~ | ✅ Fait |
| ~~**P2 court terme**~~ | ~~Revoir les patterns de cache Workbox~~ | ✅ Fait |
| **P2 moyen terme** | Chiffrement données sensibles (`pgsodium`) | Élevé |
| ~~**P2 moyen terme**~~ | ~~Rate limiting edge function~~ | ✅ Fait |
| **P2 continu** | Audits RLS à chaque migration de schéma | Faible |

---

## Vérifications complémentaires recommandées

- Tests d'autorisation automatisés pour les fonctions edge (cas autorisé/refusé).
- Revue des payloads de notification pour empêcher l'injection de contenu inattendu dans le client.
- Ajout d'alerting sécurité (volume anormal d'envois push, erreurs 401/403 répétées).

---

## Travail effectué

### Migrations de sécurité (013-021)

| Migration | Description |
|-----------|-------------|
| 013 | Contraintes email/téléphone + table audit uploads |
| 014 | Fix `get_user_role()` search_path |
| 015 | Fix `update_updated_at_column()`, `is_employee()` + RLS audit |
| 016 | Fix `update_push_subscriptions_updated_at()` search_path |
| 017 | Fix `handle_new_user()` search_path |
| 018 | Fix `is_employer()` search_path |
| 019 | Drop `test_auth_context()` (fonction debug) |
| **021** | **Audit RLS complet - sécurisation de toutes les tables** |

### Warnings Supabase corrigés

| Warning | Statut |
|---------|--------|
| Function search_path mutable | ✅ Corrigé (toutes les fonctions) |
| Leaked password protection disabled | ✅ Activé (HIBP) |
| RLS policy always true | ✅ Corrigé (file_upload_audit) |
| Tables without RLS | ✅ Corrigé (migration 020) |

### Ancien P0 résolu
- ~~**Audit et durcissement RLS Supabase**~~ ✅ — Toutes les tables ont des policies RLS strictes. Vérifié via migration 021.

### Logger centralisé
- ~~**Centraliser et filtrer les logs en production**~~ ✅ — Logger applicatif avec niveaux et redaction déployé.【F:src/lib/logger.ts】

---

## Checklist RLS Supabase

| Table | SELECT | INSERT | UPDATE | DELETE | Vérifié |
|-------|--------|--------|--------|--------|---------|
| profiles | ✅ own + relations | ✅ own | ✅ own | ❌ | ✅ |
| employers | ✅ own + employés + aidants | ✅ own | ✅ own + tuteurs | ❌ | ✅ |
| employees | ✅ own + employeurs | ✅ own | ✅ own | ❌ | ✅ |
| contracts | ✅ parties + aidants | ✅ employer + tuteurs | ✅ employer + tuteurs | ✅ employer + tuteurs | ✅ |
| shifts | ✅ parties + aidants | ✅ parties + tuteurs | ✅ parties + tuteurs | ✅ employer + tuteurs | ✅ |
| absences | ✅ employee + employer + tuteurs | ✅ employee | ✅ employee (pending) + employer + tuteurs | ✅ employee (pending) | ✅ |
| notifications | ✅ own | ✅ system | ✅ own (read) | ✅ own | ✅ |
| liaison_messages | ✅ team | ✅ team | ✅ author | ✅ author | ✅ |
| log_entries | ✅ team + aidants + tuteurs | ✅ team + aidants + tuteurs | ✅ author + employer + tuteurs | ✅ author + tuteurs | ✅ |
| caregivers | ✅ employer + own | ✅ employer | ✅ employer + own (profile) | ✅ employer | ✅ |
| push_subscriptions | ✅ own | ✅ own | ✅ own | ✅ own | ✅ |
| notification_preferences | ✅ own | ✅ own | ✅ own | ✅ own | ✅ |
| file_upload_audit | ✅ own | ✅ trigger only | ❌ | ❌ | ✅ |
| storage (justifications) | ✅ own + employer + tuteurs | ✅ own folder | ❌ | ❌ | ✅ |

### Légende accès
- **own** : l'utilisateur accède à ses propres données
- **parties** : les deux parties d'un contrat (employeur + employé)
- **team** : employeur + employés avec contrat actif + aidants avec permission
- **aidants** : aidants avec permissions spécifiques (view_planning, view_logbook, etc.)
- **tuteurs** : tuteurs/curateurs (autorité légale complète)
- **employer** : uniquement l'employeur

---

## Conclusion

Le projet présente de solides fondamentaux de sécurité :
- ✅ Gestion de session robuste
- ✅ Validation côté client ET serveur
- ✅ Segmentation par rôle
- ✅ Protection des uploads
- ✅ Protection XSS native via React
- ✅ Protection mots de passe compromis (HIBP)
- ✅ RLS complet sur toutes les tables
- ✅ Logique métier respectée (employés, aidants, tuteurs)
- ✅ Logger centralisé avec redaction
- ✅ Headers de sécurité de base (Netlify)

**Priorité immédiate** : corriger la vulnérabilité IDOR dans `send-push-notification` (P0) et déployer une CSP (P1).

Le risque principal à moyen terme réside dans les données de santé (`handicap_type`, `specific_needs`) qui nécessitent une attention particulière en termes de conformité RGPD. Le chiffrement via `pgsodium` est recommandé pour une protection renforcée.
