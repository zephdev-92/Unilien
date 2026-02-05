# Analyse de sécurité

## Objectif
Cette note synthétise les points de sécurité observés dans le code front-end et propose des recommandations concrètes.

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

### Row Level Security (RLS)
- **Toutes les tables protégées** : RLS activé sur toutes les tables sensibles avec policies basées sur les relations utilisateurs.【F:supabase/migrations/021_fix_rls_policy_conflicts.sql】
- **Logique métier respectée** : employés voient les données handicap de leur employeur (nécessaire pour les soins), aidants ont accès selon leurs permissions.
- **Tuteurs/Curateurs** : accès complet aux données de leur protégé (autorité légale).

---

## Points de vigilance

### Logging
- **Logs d'erreurs potentiellement sensibles** : plusieurs `console.error` subsistent dans les flux auth/profil. En production, ces logs peuvent exposer des informations dans les DevTools.【F:src/hooks/useAuth.ts†L65-L67】【F:src/hooks/useAuth.ts†L105-L112】

### Stockage client
- **localStorage vulnérable au XSS** : le store Zustand persiste dans `localStorage`, accessible en cas de faille XSS. Risque atténué par le fait que seul le profil (pas les tokens) est persisté.

### Validation
- **Double validation requise** : les schémas Zod valident côté client, les contraintes PostgreSQL valident côté serveur. Les deux sont nécessaires.

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

## Recommandations prioritaires

### ~~P0 - Critique~~ ✅ FAIT
~~1. **Audit et durcissement RLS Supabase**~~
   - ~~Valider que toutes les tables sensibles ont des policies RLS strictes~~
   - ~~Vérifier que les notifications ne sont accessibles qu'à leurs destinataires~~
   - ~~Tester les policies avec différents rôles~~

### P1 - Important
2. **Centraliser et filtrer les logs en production**
   - Remplacer les `console.error` par un logger applicatif avec niveaux et redaction
   - Filtrer les payloads sensibles (emails, tokens partiels)

### P2 - Recommandé
3. **Chiffrement des données sensibles**
   - Envisager le chiffrement côté client pour les données médicales (`handicap_type`, `specific_needs`)
   - Utiliser `pgsodium` de Supabase pour le chiffrement au repos

4. **Rate limiting**
   - Configurer des limites de requêtes sur les endpoints sensibles (auth, upload)
   - Utiliser les fonctionnalités de rate limiting de Supabase

5. **Headers de sécurité**
   - Vérifier la configuration Vite/hosting pour les headers :
     - `Content-Security-Policy`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: DENY`

---

## Travail effectué

### Migrations de sécurité (013-020)

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

Le projet présente maintenant de solides fondamentaux de sécurité :
- ✅ Gestion de session robuste
- ✅ Validation côté client ET serveur
- ✅ Segmentation par rôle
- ✅ Protection des uploads
- ✅ Protection XSS native via React
- ✅ Protection mots de passe compromis (HIBP)
- ✅ **RLS complet sur toutes les tables**
- ✅ **Logique métier respectée (employés, aidants, tuteurs)**

Reste à faire :
1. **Le logging maîtrisé** (P1 - à améliorer)
2. **Le chiffrement des données sensibles** (P2 - à envisager)
3. **Rate limiting** (P2)
4. **Headers de sécurité** (P2)

Le risque principal réside dans les données de santé (`handicap_type`, `specific_needs`) qui nécessitent une attention particulière en termes de conformité RGPD. Le chiffrement via `pgsodium` est recommandé pour une protection renforcée.
