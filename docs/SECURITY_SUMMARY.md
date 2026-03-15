## Synthèse sécurité Unilien

_Dernière mise à jour : 2026-03-11_

---

## 1. Niveau de sécurité global

Le projet présente des **fondamentaux solides** pour une PWA de gestion de soins :

- Gestion de session robuste via Supabase (tokens non persistés côté client).
- RLS activé et audité sur toutes les tables.
- Validation côté client (Zod) et côté serveur (contraintes PostgreSQL).
- Logger centralisé avec masquage des données sensibles.
- Headers de sécurité de base déjà configurés.
- Pas d'utilisation de `dangerouslySetInnerHTML`, protection XSS native via React.

Conclusion : la base de sécurité est saine et nettement au‑dessus de la moyenne pour une app front + Supabase.

---

## 2. Points positifs majeurs

- **Authentification & session**
  - Tokens JWT uniquement en mémoire (Supabase SDK), non persistés en `localStorage`.
  - Vérification HaveIBeenPwned activée pour les mots de passe.
  - Erreur explicite si la configuration Supabase est invalide en production.

- **Contrôle d’accès & RLS**
  - RLS activé sur toutes les tables sensibles, avec des policies alignées sur la logique métier (employeurs, employés, aidants, tuteurs).
  - Accès finement segmenté (`own`, `team`, `tuteurs`, `aidants`, etc.).

- **Validation & intégrité des données**
  - Schémas Zod côté front (mots de passe, emails, téléphones FR).
  - Contraintes côté DB pour garantir la cohérence même en cas de client malveillant.
  - Table d’audit pour les uploads de fichiers.

- **Sécurité front**
  - Pas de HTML brut, pas de templating manuel dangereux.
  - Content-Security-Policy déjà déployée en mode `Report-Only` pour évaluer les impacts avant enforcement.

---

## 3. Risques et faiblesses identifiés

- **CSP uniquement en Report-Only (P1)**
  - La politique CSP existe mais n’est pas encore bloquante.
  - En cas de découverte d’une XSS ailleurs, la CSP actuelle ne l’empêcherait pas, elle ne fait que la reporter.

- **Cache PWA trop large (P2)**
  - Stratégie `NetworkFirst` sur `https://*.supabase.co/rest/v1/*`.
  - Risque de mise en cache local de réponses contenant des données sensibles (planning, logbook, données handicap…).
  - Ce n’est pas une faille directe mais augmente l’impact en cas de compromission du device ou d’usage partagé.

- **Stockage client**
  - `localStorage` ne contient que le profil utilisateur (sans tokens), donc risque limité.
  - En cas de XSS, ce profil reste néanmoins accessible : vérifier qu’aucun champ très sensible n’y est exposé.

- **Chiffrement des données sensibles**
  - Les données de santé sont protégées par RLS mais pas chiffrées au repos.
  - Pour un projet lié au handicap, le chiffrement (ex. `pgsodium`) est fortement recommandé à moyen terme.

- **Rate limiting**
  - Pas encore de politique explicite de limitation de débit sur les endpoints sensibles (auth, upload, notifications).
  - Risque de brute-force ou d’abus automatisé si des endpoints sont exposés publiquement.

---

## 4. Vulnérabilités critiques (P0) et statut

- **Ancien P0 : IDOR sur la fonction edge `send-push-notification`**
  - Désormais corrigé :
    - Passage à un `notificationId` résolu côté DB au lieu d’un `userId` fourni par le client.
    - Anti‑replay (notifications récentes uniquement).
    - CORS restreint aux domaines applicatifs connus.
    - Suppression des logs sensibles.

À date, aucune vulnérabilité critique (P0) connue n’est active.

---

## 5. Plan d’actions recommandé

- **Court terme (P1)**
  - Basculer la CSP de `Content-Security-Policy-Report-Only` à `Content-Security-Policy` après validation en production (absence de violations bloquantes).
  - Vérifier que tous les accès Supabase passent bien par les services centralisés et la logique de permissions existante.

- **Court / moyen terme (P2)**
  - Affiner la stratégie de cache PWA :
    - Remplacer le pattern global `/rest/v1/*` par une allowlist de routes non sensibles.
    - Désactiver le cache pour les endpoints contenant des données personnelles.
  - Introduire le chiffrement des données de santé dans la base (par exemple avec `pgsodium`).
  - Mettre en place un rate limiting sur les endpoints sensibles (auth, upload, notifications, fonctions edge).

- **Continu**
  - Auditer systématiquement les policies RLS à chaque migration de schéma.
  - Ajouter des tests automatisés d’autorisation pour les fonctions edge et les principales tables métiers.

---

## 6. Conclusion

La posture de sécurité d’Unilien est **globalement bonne** : fondations techniques robustes (RLS complet, logger, HIBP, validations client+serveur, CSP en préparation).  
Les priorités à court et moyen terme sont :

1. Faire passer l
3. Préparer le chiffrement des données de santé au repos et un rate limiting adapté.

Ces actions renforceront significativement la résilience de l’application, en particulier vis‑à‑vis des risques RGPD liés aux données de santé.

a CSP en mode enforcement après validation.
2. Réduire la surface du cache PWA sur les endpoints Supabase.