# Revue de sécurité — mise à jour 9 avril 2026

Synthèse d'audit alignée sur l'état du dépôt. Couvre les migrations 041 à 049.

## Correctifs et protections en place

### Migration 041 — Correctifs sécurité (26 mars 2026)

| Sujet | État |
|--------|------|
| **Aidants** — `UPDATE` sans restriction sur colonnes sensibles | Policy `Caregivers can update own profile limited` : `legal_status`, `employer_id`, `permissions`, `permissions_locked` ne peuvent pas changer en self-service. |
| **Bucket `justifications`** — exposition publique | `UPDATE storage.buckets SET public = false WHERE id = 'justifications'`. |
| **Notifications `INSERT`** | Policy `notifications_insert_own` : `user_id = auth.uid()` uniquement. |
| **RPC `create_notification`** | Vérification de relation métier + validation `action_url` (chemins relatifs ; rejet `javascript:`, `data:`, URLs absolues, etc.). |
| **Énumération `profiles`** | Policies employeur / tuteur resserrées (lien contrat / aidant / profil courant). |
| **Conversations `INSERT`** | `employer_id` ne peut plus être choisi arbitrairement sans lien métier. |
| **PWA / cache API** | `vite.config.ts` : pas de cache sur `/rest/v1/*` ; cache `CacheFirst` limité au storage Supabase. |

### Migrations 042-044 — RGPD données de santé (30 mars 2026, PR #203)

| Sujet | État |
|--------|------|
| **Consentement explicite** | Table `user_consents` (migration 042) — grant/revoke avec horodatage, IP, user-agent. |
| **Isolation données santé** | Table `employer_health_data` (migration 043) — RLS owner-only, séparée de `employers`. |
| **Audit trail** | Table `audit_logs` (migration 044) — immuable (`INSERT` only), pas de `DELETE`/`UPDATE` policy. |
| **Accès non-propriétaires** | Employés/aidants ne peuvent plus lire `handicap_type`, `handicap_name`, `specific_needs`. |
| **Composants** | `HealthDataConsentModal` + `useHealthConsent` bloquent l'accès aux champs santé sans consentement. |

### Migration 045 — CESU declarations (31 mars 2026, PR #205)

| Sujet | État |
|--------|------|
| **Table `cesu_declarations`** | RLS `employer_id = auth.uid()` — chaque employeur ne voit que ses déclarations. |
| **Bucket `cesu-declarations`** | Privé, accès via URL signées uniquement. |

### Migration 046 — Justificatifs aidants (31 mars 2026, PR #206)

| Sujet | État |
|--------|------|
| **Policy storage** | Les aidants avec permission peuvent accéder aux justificatifs de leur employeur. |

### Migration 047 — Suppression compte/données (31 mars 2026, PR #207)

| Sujet | État |
|--------|------|
| **RPC `delete_own_data`** | `SECURITY DEFINER` — supprime toutes les données utilisateur, anonymise les `audit_logs` (RGPD art. 17). |
| **RPC `delete_own_account`** | `SECURITY DEFINER` — appelle `delete_own_data` puis `auth.users` delete. Vérifie `auth.uid() = profile_id`. |
| **Double confirmation UI** | Saisie manuelle "SUPPRIMER" / "SUPPRIMER MON COMPTE" avant exécution. |

### Migration 048 — Convention settings (1er avril 2026, PR #208)

| Sujet | État |
|--------|------|
| **Table `convention_settings`** | RLS `profile_id = auth.uid()` — paramètres convention par employeur. |

### Migration 049 — Correctif email profil (9 avril 2026, PR #240)

| Sujet | État |
|--------|------|
| **Email profil** | Correctif exposition email dans `profiles` pour l'envoi d'emails transactionnels. |

### 2FA TOTP (3 avril 2026, PR #220)

| Sujet | État |
|--------|------|
| **Supabase MFA natif** | Enrôlement TOTP via QR code (`MfaEnrollment`), challenge au login (`MfaChallenge`), hook `useMfa`. |
| **Nettoyage facteurs non vérifiés** | Les facteurs partiellement enrôlés sont supprimés automatiquement. |
| **AAL check** | `LoginForm` détecte AAL1 → redirige vers challenge MFA avant accès app. |
| **UI Settings** | Card 2FA fonctionnelle dans Paramètres > Sécurité (activer/désactiver). |

### OAuth social login (8 avril 2026, PR #238)

| Sujet | État |
|--------|------|
| **Google + Microsoft** | Providers configurés dans Supabase Auth, redirect URI validée. |
| **Onboarding rôle** | `OnboardingRolePage` force la sélection de rôle pour les nouveaux comptes OAuth (évite les comptes sans rôle). |

## Contrôles applicatifs

- `NotificationsPanel` : navigation uniquement si `actionUrl.startsWith('/')`.
- `pushService` : clic sur notification locale limité same-origin et chemin commençant par `/`.
- `NavIcon` : `dangerouslySetInnerHTML` sur SVG statiques (pas d'entrée utilisateur).
- `sanitizeText()` (DOMPurify) appliqué avant chaque écriture DB de texte utilisateur.
- `logger.ts` : redaction des données personnelles — jamais de `console.log` en production.
- URL signées pour tous les fichiers privés (justificatifs, CESU PDFs).

## CSP et headers (production — Netlify)

```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## Points à surveiller

### Dépendances (`npm audit`)

- **jspdf** : avis signalant des problèmes sur les versions concernées. Surveiller les montées de version correctives.
- **picomatch** (transitif, workbox / vite) : avis ReDoS — impact chaîne de build uniquement, pas le runtime navigateur.
- **yaml** (cosmiconfig / emotion) : avis sur YAML très profond — scénario peu réaliste au build.

### Champs aidant

La policy « limited » ne fige pas toutes les colonnes (ex. `can_replace_employer`). Si le métier impose que seul l'employeur les modifie, prévoir un affinement RLS.

### Cache service worker (storage)

Cache longue durée sur les réponses storage : risque de confidentialité locale sur appareil partagé ; pas un contournement des politiques serveur.

### RPC SECURITY DEFINER

Les deux RPC de suppression (`delete_own_data`, `delete_own_account`) s'exécutent avec les privilèges du propriétaire de la fonction. La vérification `auth.uid()` est faite en début de fonction — ne pas modifier sans revue de sécurité.

### Chiffrement colonnes (à venir)

Les données de santé (`employer_health_data`) sont protégées par RLS mais pas chiffrées au repos. Le chiffrement colonne via `pgsodium` est prévu après migration Supabase self-hosted.

## TODO sécurité

| Action | Priorité | Statut |
|--------|----------|--------|
| Chiffrement colonnes santé (pgsodium) | Haute | En attente migration self-hosted |
| ~~2FA TOTP (Supabase MFA)~~ | ~~Moyenne~~ | ✅ Terminé — PR #220 (03/04/2026) |
| ~~Path traversal `attachmentService`~~ | ~~Moyenne~~ | ✅ Corrigé — sanitisation whitelist (09/04/2026) |
| ~~Vulnérabilité `serialize-javascript` / dépendances~~ | ~~Moyenne~~ | ✅ Corrigé — `npm audit fix` (09/04/2026) |
| Durée de conservation + politique de purge données | Moyenne | À définir |
| Registre des traitements CNIL | Moyenne | À créer |
| Affiner RLS aidants (`can_replace_employer`) | Basse | À évaluer |
| `npm audit` régulier avant mise en prod | Continue | En place |

## Références

- `docs/SECURITY_PENTEST_REPORT.md`
- `docs/OFFENSIVE_SECURITY_REVIEW.md`
- `docs/OFFENSIVE_SECURITY_VERIFICATION.md`
- `docs/SECURITY_IDOR_ANALYSIS.md`
- `docs/MEDICAL_DATA_COMPLIANCE.md`
- `docs/2FA_IMPLEMENTATION.md`
- Migrations : `supabase/migrations/041_security_fixes.sql` à `049_fix_profile_email.sql`
