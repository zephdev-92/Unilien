# Analyse de sécurité

_Dernière mise à jour : 2026-03-26_

## Objectif

Cette note synthétise les points de sécurité observés dans le code front-end, les fonctions edge et l'infrastructure Supabase, et propose des recommandations concrètes priorisées.

---

## Résumé exécutif

- ~~**P0 — Critique** : IDOR dans `send-push-notification`~~ ✅ Corrigé — la fonction edge utilise désormais `notificationId` (lookup DB) au lieu de `userId` brut + CORS restreint.
- ~~**P1 — Élevé** : CSP en `Report-Only`~~ ✅ Corrigé (2026-03-26) — **`Content-Security-Policy`** en enforcement dans `netlify.toml` (voir aussi `docs/SECURITY_CHECK_2026-03-26.md`).
- ~~**P1 — Élevé** : RPC `create_notification` (IDOR + `action_url`)~~ ✅ Corrigé — migration **`041_security_fixes.sql`** : relation métier obligatoire, validation stricte des chemins relatifs pour `action_url`.
- **P1 — Élevé** : Dépendance `vite-plugin-pwa` → `serialize-javascript` (CVE RCE, CVSS 8.1) — surveiller les montées de version.
- ~~**P2 — Moyen** : stratégie de cache PWA trop large~~ ✅ Corrigé — le cache ne porte plus que sur `storage/v1/` (avatars, justificatifs), pas sur `/rest/v1/`.
- **P2 — Moyen** : `attachmentService` — `file.name` utilisé dans le chemin d'upload sans sanitisation (risque path traversal).

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
- **`dangerouslySetInnerHTML`** : une seule utilisation dans `NavIcon.tsx` pour les chemins SVG — données issues d'un objet statique `PATHS[name]`, jamais d'entrée utilisateur. ✅

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

### ~~P1 — Élevé~~ ✅ Corrigé (migration 041 — 2026-03)

#### 2. RPC `create_notification` — IDOR + action_url non validé

**Constat historique (avant migration 041)**

- La fonction RPC `create_notification` était exécutable par tout utilisateur authentifié sans vérification de relation métier avec `p_user_id`, et `p_action_url` n’était pas validé côté serveur.

**État actuel**

- Migration **`041_security_fixes.sql`** : la fonction impose une **relation métier** avec la cible (contrats actifs, employeur↔aidant, etc.) et **rejette** les `action_url` dangereuses (chemins relatifs `/...` uniquement ; rejet de `javascript:`, `data:`, URLs absolues, etc.).
- Côté client, la navigation et les push restent défendus en profondeur (`NotificationsPanel`, `pushService`, `sw-push.js`) — voir `docs/SECURITY_XSS_ANALYSIS.md` et `docs/SECURITY_CHECK_2026-03-26.md`.

#### 3. Dépendance `serialize-javascript` (CVE RCE)

**Constat**
- `npm audit` signale une vulnérabilité haute (CVSS 8.1) dans `serialize-javascript` (RCE via RegExp.flags / Date.prototype.toISOString).
- Chaîne : `vite-plugin-pwa` → `workbox-build` → `@rollup/plugin-terser` → `serialize-javascript`.

**Recommandation**
- Suivre les mises à jour de `vite-plugin-pwa` et vérifier si une version corrigée est disponible.
- En attendant : évaluer un downgrade vers une version sans la dépendance vulnérable, ou un `npm audit fix` si proposé.

---

### ~~P1 — Élevé~~ ✅ CSP en enforcement (2026-03-26)

#### 4. CSP sur l'hébergement

**Historique**

- Phase **Report-Only** puis passage à l’**enforcement** documenté dans `docs/SECURITY_CHECK_2026-03-26.md`.

**État actuel (`netlify.toml`)**

- Header **`Content-Security-Policy`** (bloquant), par exemple :
  ```
  default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  img-src 'self' data: blob: https://*.supabase.co;
  font-src 'self'; worker-src 'self'; manifest-src 'self';
  object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```
- `style-src 'unsafe-inline'` requis par Chakra UI v3 (emotion).
- `blob:` dans `img-src` pour les prévisualisations d'avatars ; `wss://*.supabase.co` pour Realtime.

**Suivi**

- Surveiller la console navigateur en déploiement après changements de dépendances ou de contenus inline.

---

### P2 — Moyen

#### 5. Path traversal dans `attachmentService`

**Constat**
- `uploadAttachment` utilise `file.name` (contrôlé par l'utilisateur) dans le chemin : `${conversationId}/${senderId}/${Date.now()}_${file.name}`.
- Un nom comme `../../bucket/autre` pourrait tenter une écriture hors du dossier prévu.

**Recommandation**
- Sanitiser `file.name` : retirer `..`, `/`, `\`, caractères de contrôle ; limiter la longueur ; n'autoriser qu'alphanumériques, tirets, underscores et points pour l'extension.

#### 6. ~~CORS permissif sur les fonctions edge~~ ✅ Corrigé

Les fonctions `send-push-notification` et `invite-employee` restreignent déjà les origines via `ALLOWED_ORIGINS` (unilien.fr, netlify.app, localhost).

#### 7. ~~Cache PWA sur endpoints API~~ ✅ Corrigé

Le `vite.config.ts` ne met en cache que `https://*.supabase.co/storage/v1/*` (avatars, justificatifs). Les endpoints `/rest/v1/*` ne sont plus cachés.

#### 8. Chiffrement des données sensibles

- Envisager le chiffrement côté client pour les données médicales (`handicap_type`, `specific_needs`).
- Utiliser `pgsodium` de Supabase pour le chiffrement au repos.

#### 9. Rate limiting

- Configurer des limites de requêtes sur les endpoints sensibles (auth, upload).
- Utiliser les fonctionnalités de rate limiting de Supabase.

---

## Plan d'actions priorisé

| Priorité | Action | Effort estimé |
|----------|--------|---------------|
| ~~**P0 immédiat**~~ | ~~Corriger l'autorisation dans `send-push-notification`~~ | ✅ Fait |
| ~~**P1 court terme**~~ | ~~Restreindre RPC `create_notification` + valider `action_url`~~ | ✅ Fait (041) |
| **P1 court terme** | Mettre à jour `vite-plugin-pwa` / résoudre vulnérabilité `serialize-javascript` | Moyen |
| ~~**P1 court terme**~~ | ~~CSP Report-Only → enforcement~~ | ✅ Fait |
| ~~**P2 court terme**~~ | ~~Restreindre CORS edge~~ | ✅ Fait |
| ~~**P2 court terme**~~ | ~~Cache PWA /rest/v1~~ | ✅ Fait |
| **P2 court terme** | Sanitiser `file.name` dans `attachmentService` | Faible |
| **P2 moyen terme** | Chiffrement données sensibles (`pgsodium`) | Élevé |
| **P2 moyen terme** | Rate limiting endpoints sensibles | Moyen |
| **P2 continu** | Audits RLS à chaque migration de schéma | Faible |

---

## Audit sécurité mars 2026 — Synthèse

### Points forts confirmés

| Domaine | État |
|---------|------|
| Sanitisation entrées | 8 services utilisent `sanitizeText` avant écriture DB : profile, caregiver, shift, liaison, logbook, notification, absence, push |
| Services sans sanitisation | auxiliary, compliance, contract, document, leaveBalance, stats — read-only ou valeurs contrôlées (enums, UUIDs, dates) uniquement |
| RLS Supabase | Toutes les tables protégées, policies cohérentes avec le métier |
| Fonctions edge | CORS restreint, auth JWT obligatoire, rate limiting (send-push) |
| Secrets | `.env` dans `.gitignore`, clés sensibles uniquement côté serveur (Deno.env) |
| PWA cache | Uniquement `storage/v1/`, pas de cache sur `/rest/v1/` |

### Services avec sanitisation

- `profileService` : firstName, lastName, phone, adresse, handicap, CESU, IBAN, contacts
- `caregiverService` : relationship, adresse, relationshipDetails, emergencyPhone, availabilityHours
- `shiftService` : tasks, notes
- `liaisonService` : content (messages)
- `logbookService` : content
- `notificationService.core` : title, message
- `absenceService` : reason
- `pushService` : user_agent

### Note sur `invite-employee`

- `firstName` et `lastName` du payload ne sont pas sanités avant stockage. Risque atténué par l'échappement React à l'affichage. Recommandation : ajouter `sanitizeText` pour défense en profondeur.

---

## Vérifications complémentaires recommandées

- Tests d'autorisation automatisés pour les fonctions edge (cas autorisé/refusé).
- Revue des payloads de notification pour empêcher l'injection de contenu inattendu dans le client.
- Ajout d'alerting sécurité (volume anormal d'envois push, erreurs 401/403 répétées).

---

## Travail effectué

### Migrations de sécurité (013-021, 041)

| Migration | Description |
|-----------|-------------|
| **041** | **Correctifs pentest / IDOR / RPC / CSP & co.** — voir `docs/SECURITY_CHECK_2026-03-26.md` |
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

**Priorités restantes (P1/P2)** :
1. Traiter la vulnérabilité `serialize-javascript` dans la chaîne de build (`vite-plugin-pwa` / audits npm)
2. Sanitiser `file.name` dans `attachmentService` (path traversal)
3. Poursuivre le durcissement long terme (chiffrement au repos, rate limiting)

Le risque principal à moyen terme réside dans les données de santé (`handicap_type`, `specific_needs`) qui nécessitent une attention particulière en termes de conformité RGPD. Le chiffrement via `pgsodium` est recommandé pour une protection renforcée.
