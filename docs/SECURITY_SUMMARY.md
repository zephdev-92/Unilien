## Synthèse sécurité Unilien

_Dernière mise à jour : 2026-04-01_

---

## 1. Niveau de sécurité global

Le projet présente des **fondamentaux solides** pour une PWA de gestion de soins :

- Gestion de session via Supabase : **JWT gérés par le SDK en mémoire** ; le store Zustand ne **persiste pas** les tokens (seulement le profil dans `localStorage`).
- RLS activé et audité sur les tables sensibles ; **8 migrations sécurité** (041 à 048) couvrant IDOR, RGPD santé, CESU, suppression compte, convention settings.
- **Conformité RGPD article 9** : consentement explicite, isolation données de santé, audit trail immuable (migrations 042-044, PR #203).
- **Droit à l’effacement** : RPC `delete_own_data` + `delete_own_account` avec double confirmation UI (migration 047, PR #207).
- Validation côté client (Zod) et côté serveur (contraintes PostgreSQL).
- Logger centralisé avec masquage des données sensibles.
- Headers de sécurité sur Netlify, dont une **CSP en enforcement** (`Content-Security-Policy` dans `netlify.toml`).
- Pas d’usage dangereux de HTML utilisateur dans le rendu React (hors cas documentés).

Conclusion : la base de sécurité est saine et nettement au-dessus de la moyenne pour une app front + Supabase.

---

## 2. Points positifs majeurs

- **Authentification & session**
  - Tokens JWT en mémoire via le client Supabase ; pas de duplication des secrets JWT dans le store persisté.
  - Vérification HaveIBeenPwned activée pour les mots de passe.
  - Erreur explicite si la configuration Supabase est invalide en production.

- **Contrôle d’accès & RLS**
  - Policies alignées sur le métier ; migration **041** resserre les cas IDOR (notifications, RPC, aidants, conversations, profils, audit fichiers, bucket justifications).
  - **Isolation données de santé** : table `employer_health_data` séparée de `employers`, RLS owner-only (migration 043).
  - Employés et aidants ne peuvent plus lire `handicap_type`, `handicap_name`, `specific_needs`.

- **RGPD & données de santé**
  - Table `user_consents` : consentement explicite avec horodatage, IP, user-agent (migration 042).
  - Table `audit_logs` : journal d’accès immuable (`INSERT` only, pas de `DELETE`/`UPDATE`) (migration 044).
  - `HealthDataConsentModal` + `useHealthConsent` : bloquent l’accès aux champs santé sans consentement.
  - RPC `delete_own_data` : suppression RGPD art. 17 + anonymisation audit logs (migration 047).
  - RPC `delete_own_account` : suppression complète compte + données (migration 047).

- **Validation & intégrité des données**
  - Schémas Zod côté front ; contraintes côté DB.
  - Table d’audit pour les uploads ; évolution documentée dans les rapports pentest.
  - `sanitizeText()` (DOMPurify) appliqué avant chaque écriture DB de texte utilisateur.

- **Sécurité front & réseau**
  - **CSP bloquante** sur l’hébergement.
  - Cache PWA : pas de `NetworkFirst` sur `/rest/v1/*` — cache limité au **storage** Supabase (fichiers), pas aux réponses API REST sensibles.

---

## 3. Risques et sujets encore ouverts

- **Dépendances (build / transitif)**
  - Suivre `npm audit` (ex. chaîne `vite-plugin-pwa` / `serialize-javascript`) et appliquer les correctifs sans régression PWA.

- **Stockage client**
  - `localStorage` ne contient plus que `id` et `role` du profil (PR #262). Les données personnelles (nom, email, téléphone) ne sont plus exposées en cas de XSS.

- **Chiffrement des données sensibles**
  - Données de santé isolées dans `employer_health_data` et protégées par RLS owner-only ; chiffrement au repos (`pgsodium`) reste un objectif après migration Supabase self-hosted.

- **Rate limiting**
  - Politique homogène sur toutes les Edge Functions : `send-email` (10/min), `send-push` (30/min), `invite-caregiver` (5/min), `invite-employee` (5/min). Module partagé `_shared/rateLimit.ts` (PR #264). Auth rate-limité nativement par Supabase.

- **Pièces jointes / noms de fichiers**
  - Sanitisation du nom de fichier dans `attachmentService` (path traversal) — toujours pertinente.

---

## 4. Vulnérabilités critiques (P0) et statut

- **Ancien P0 : IDOR sur la fonction edge `send-push-notification`**
  - Corrigé : `notificationId`, anti-replay, CORS restreint, logs nettoyés.

- **Correctifs IDOR / RPC / RLS (2026-03)**
  - Traités dans la migration **041** ; détail dans `docs/SECURITY_IDOR_ANALYSIS.md` et `docs/SECURITY_CHECK_2026-03-26.md`.

- **Migrations sécurité 042-048 (mars-avril 2026)**
  - 042 : `user_consents` (consentement RGPD)
  - 043 : `employer_health_data` (isolation données santé)
  - 044 : `audit_logs` (journal d'accès immuable)
  - 045 : `cesu_declarations` (RLS employer-only, bucket privé)
  - 046 : storage policy justificatifs aidants
  - 047 : RPC suppression données/compte (`SECURITY DEFINER`)
  - 048 : `convention_settings` (RLS owner-only)

À date, aucune vulnérabilité critique (P0) **ouverte** identifiée dans la surface documentée.

---

## 5. Plan d’actions recommandé

- **Court terme**
  - Maintenir les dépendances à jour et rejouer les scénarios de non-régression décrits dans les rapports pentest après chaque migration RLS.

- **Moyen terme**
  - Chiffrement au repos pour données de santé ; ~~rate limiting ciblé~~ ✅ ; ~~sanitisation stricte des noms de fichiers uploadés~~ ✅ (PR #263).

- **Continu**
  - Auditer les policies RLS à chaque évolution de schéma ; tests d’autorisation sur les fonctions edge et tables clés.

---

## 6. Conclusion

La posture de sécurité d’Unilien est **globalement bonne** : RLS renforcé (041-048), CSP en enforcement, cache API PWA corrigé, conformité RGPD article 9 (consentement + isolation + audit trail + droit à l’effacement), suppression de compte fonctionnelle.

Les efforts suivants porteront sur le **chiffrement au repos** (pgsodium, après migration self-hosted), le **2FA** (TOTP via Supabase MFA), le **rate limiting**, et la **maintenance des dépendances**.
