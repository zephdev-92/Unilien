# Revue de sécurité — 26 mars 2026

Synthèse d’audit alignée sur l’état du dépôt à cette date. Référence migrations : `supabase/migrations/041_security_fixes.sql`.

## Correctifs déjà présents (migration 041)

| Sujet | État |
|--------|------|
| **Aidants** — `UPDATE` sans restriction sur colonnes sensibles | Policy `Caregivers can update own profile limited` : `legal_status`, `employer_id`, `permissions`, `permissions_locked` ne peuvent pas changer en self-service. |
| **Bucket `justifications`** — exposition publique | `UPDATE storage.buckets SET public = false WHERE id = 'justifications'`. |
| **Notifications `INSERT`** | Policy `notifications_insert_own` : `user_id = auth.uid()` uniquement. |
| **RPC `create_notification`** | Vérification de relation métier + validation `action_url` (chemins relatifs ; rejet `javascript:`, `data:`, URLs absolues, etc.). |
| **Énumération `profiles`** | Policies employeur / tuteur resserrées (lien contrat / aidant / profil courant). |
| **Conversations `INSERT`** | `employer_id` ne peut plus être choisi arbitrairement sans lien métier. |
| **PWA / cache API** | `vite.config.ts` : pas de cache sur `/rest/v1/*` ; cache `CacheFirst` limité au storage Supabase. |

Côté application, les justificatifs utilisent des URL signées (`src/services/absenceJustificationService.ts`), cohérent avec un bucket privé.

## Points à surveiller

### Dépendances (`npm audit`)

- **jspdf** : avis signalant des problèmes sur les versions concernées. Usage actuel : génération PDF côté client. Surveiller les montées de version correctives et retester les exports.
- **picomatch** (transitif, workbox / vite) : avis ReDoS — impact principalement chaîne de build, pas le runtime navigateur de la PWA.
- **yaml** (cosmiconfig / emotion) : avis sur YAML très profond — scénario peu réaliste au build.

### Champs aidant

La policy « limited » ne fige pas toutes les colonnes (ex. `can_replace_employer`, autres champs de profil). Si le métier impose que seul l’employeur les modifie, prévoir un affinement RLS ou des règles applicatives.

### Cache service worker (storage)

Cache longue durée sur les réponses storage : risque de **confidentialité locale** sur appareil partagé ; pas un contournement des politiques serveur.

### Déploiement

Les correctifs RLS/storage ne sont effectifs qu’après **application de la migration 041** sur chaque instance Supabase (prod / staging).

## Contrôles applicatifs notés

- `NotificationsPanel` : navigation uniquement si `actionUrl.startsWith('/')`.
- `pushService` : clic sur notification locale limité same-origin et chemin commençant par `/`.
- `NavIcon` : `dangerouslySetInnerHTML` sur SVG statiques (pas d’entrée utilisateur).

## Références

- `docs/SECURITY_PENTEST_REPORT.md`
- `docs/OFFENSIVE_SECURITY_REVIEW.md`
- `docs/OFFENSIVE_SECURITY_VERIFICATION.md`
- Migration : `supabase/migrations/041_security_fixes.sql`
