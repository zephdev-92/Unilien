## Synthèse sécurité Unilien

_Dernière mise à jour : 2026-03-26_

---

## 1. Niveau de sécurité global

Le projet présente des **fondamentaux solides** pour une PWA de gestion de soins :

- Gestion de session via Supabase : **JWT gérés par le SDK en mémoire** ; le store Zustand ne **persiste pas** les tokens (seulement le profil dans `localStorage`).
- RLS activé et audité sur les tables sensibles ; correctifs récents regroupés dans la migration **`041_security_fixes.sql`** (voir `docs/SECURITY_CHECK_2026-03-26.md`).
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

- **Validation & intégrité des données**
  - Schémas Zod côté front ; contraintes côté DB.
  - Table d’audit pour les uploads ; évolution documentée dans les rapports pentest.

- **Sécurité front & réseau**
  - **CSP bloquante** sur l’hébergement.
  - Cache PWA : pas de `NetworkFirst` sur `/rest/v1/*` — cache limité au **storage** Supabase (fichiers), pas aux réponses API REST sensibles.

---

## 3. Risques et sujets encore ouverts

- **Dépendances (build / transitif)**
  - Suivre `npm audit` (ex. chaîne `vite-plugin-pwa` / `serialize-javascript`) et appliquer les correctifs sans régression PWA.

- **Stockage client**
  - `localStorage` contient le profil utilisateur (sans tokens). En cas de XSS, ce profil reste exposé : limiter les champs persistés au strict nécessaire.

- **Chiffrement des données sensibles**
  - Données de santé protégées par RLS ; chiffrement au repos (`pgsodium`, etc.) reste un objectif moyen terme pour une défense en profondeur.

- **Rate limiting**
  - Pas encore de politique homogène sur tous les points sensibles (auth, upload, notifications) — à planifier selon l’hébergeur / Edge.

- **Pièces jointes / noms de fichiers**
  - Sanitisation du nom de fichier dans `attachmentService` (path traversal) — toujours pertinente.

---

## 4. Vulnérabilités critiques (P0) et statut

- **Ancien P0 : IDOR sur la fonction edge `send-push-notification`**
  - Corrigé : `notificationId`, anti-replay, CORS restreint, logs nettoyés.

- **Correctifs IDOR / RPC / RLS (2026-03)**
  - Traités dans la migration **041** ; détail dans `docs/SECURITY_IDOR_ANALYSIS.md` (constat historique + **Statut 26/03/2026**) et `docs/SECURITY_CHECK_2026-03-26.md`.

À date, aucune vulnérabilité critique (P0) **ouverte** identifiée dans la surface documentée.

---

## 5. Plan d’actions recommandé

- **Court terme**
  - Maintenir les dépendances à jour et rejouer les scénarios de non-régression décrits dans les rapports pentest après chaque migration RLS.

- **Moyen terme**
  - Chiffrement au repos pour données de santé ; rate limiting ciblé ; sanitisation stricte des noms de fichiers uploadés.

- **Continu**
  - Auditer les policies RLS à chaque évolution de schéma ; tests d’autorisation sur les fonctions edge et tables clés.

---

## 6. Conclusion

La posture de sécurité d’Unilien est **globalement bonne** : RLS renforcé (041), CSP en enforcement, cache API PWA corrigé, RPC notifications sécurisée côté base.

Les efforts suivants porteront surtout sur la **réduction de la dette dépendances**, le **durcissement des uploads**, le **chiffrement** et le **rate limiting** — en complément des exigences RGPD sur les données de santé.
