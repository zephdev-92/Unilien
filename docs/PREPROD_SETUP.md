# Préprod — Plan de mise en place

> **Statut : à valider.** Document de cadrage, rien n'est encore implémenté.
> Objectif : un environnement de préproduction pour faire tester des branches
> non mergées à des utilisateurs cibles (Marie, etc.) sans toucher à la prod.

---

## 1. Objectif

Aujourd'hui le seul environnement déployé est la **prod** (`unilien.app`).
Pour faire tester une feature en cours (ex : le classifier vocal de la branche
`feat/voice-acoustic-classifier`) à un utilisateur non-dev, il faut un
environnement intermédiaire :

- accessible via une URL publique,
- déployable depuis une branche (pas seulement `main`),
- isolé de la prod (données, déploiement, monitoring),
- sans données de santé réelles (RGPD art. 9).

---

## 2. Infra actuelle (rappel)

| Élément        | Prod                                                        |
|----------------|-------------------------------------------------------------|
| Frontend       | Build statique dans `/var/www/unilien`, servi par Caddy     |
| Reverse proxy  | Caddy — `infra/caddy/Caddyfile` (versionné, déployé manuel) |
| Backend        | Supabase self-hosted, `api.unilien.app` → `localhost:8000`  |
| Studio         | `studio.unilien.app` → `localhost:8000`                     |
| Analytics      | Plausible self-hosted, `plausible.unilien.app:8001`         |
| Déploiement    | GitHub Actions `deploy.yml`, sur push `main` → rsync VPS    |
| Hébergement    | VPS unique OVH (Debian 13)                                  |

---

## 3. Décisions à trancher

| # | Question                       | Options                                                                 | Reco |
|---|--------------------------------|--------------------------------------------------------------------------|------|
| 1 | Sous-domaine                   | `staging.unilien.app` / `preprod.unilien.app`                            | `staging.unilien.app` |
| 2 | Où ça tourne                   | Même VPS (nouveau site Caddy) / VPS dédié                                | Même VPS (coût, simplicité) |
| 3 | Backend / données              | Même Supabase prod / **Instance Supabase préprod dédiée** / schéma séparé | Instance dédiée |
| 4 | Déclencheur de déploiement     | `workflow_dispatch` manuel / push sur branche `staging`                  | `workflow_dispatch` |
| 5 | Accès                          | Public / protégé (basic auth Caddy)                                      | Basic auth Caddy |

### Pourquoi une instance Supabase dédiée (décision 3)

Réutiliser la base prod exposerait des **données de santé réelles** à un
environnement de test moins surveillé — incompatible RGPD art. 9. Une instance
préprod dédiée part du `000_baseline_schema.sql` + un seed de données fictives.
Plus lourd à mettre en place, mais c'est la seule option propre.

> Alternative légère si l'instance dédiée est trop coûteuse à court terme :
> garder la préprod **front-only**, branchée sur une base Supabase Cloud
> gratuite (tier free) avec données fictives — pas de self-host à dupliquer.

---

## 4. Architecture cible recommandée

```
staging.unilien.app   → Caddy → /var/www/unilien-staging   (build de la branche)
api-staging.unilien.app → Caddy → localhost:8100            (Supabase préprod)
```

- **Même VPS**, nouveaux blocs Caddy ajoutés à `infra/caddy/Caddyfile`.
- Build préprod = `npm run build` avec `VITE_*` pointant vers `api-staging`.
- Basic auth Caddy sur `staging.unilien.app` (un seul couple identifiant /
  mot de passe partagé avec les testeurs).
- CSP du bloc staging = copie du bloc prod, en remplaçant `api.unilien.app`
  par `api-staging.unilien.app`.

---

## 5. Étapes d'implémentation (checklist)

- [ ] **DNS OVH** : enregistrements `A` pour `staging` et `api-staging`
- [ ] **Supabase préprod** : nouvelle stack Docker (`/opt/supabase-staging/`),
      ports décalés (`8100`…), `db reset` sur le baseline + seed fictif
- [ ] **Caddyfile** : ajouter les blocs `staging` (+ basic auth) et
      `api-staging`, déployer (workflow scp + validate + reload habituel)
- [ ] **GitHub** : environnement `env_unilien_staging` + secrets/variables
      `VITE_*` pointant vers `api-staging`
- [ ] **Workflow** : `deploy-staging.yml` — `workflow_dispatch` avec input
      `branch`, build, rsync vers `/var/www/unilien-staging`
- [ ] **Seed** : script de données fictives (comptes employer/employee/
      caregiver de démo, aucune donnée de santé réelle)
- [ ] **Doc** : procédure « déployer une branche en préprod » dans ce fichier

---

## 6. Point spécifique — classifier vocal sur préprod

Le bloc `[DEBUG TEMP]` de `useVoiceNavigation.ts` qui force le classifier à
tourner à chaque essai est gardé par `import.meta.env.DEV`. **Un build préprod
est un build de production → `import.meta.env.DEV` vaut `false`** : le bloc ne
s'exécutera pas, et le classifier ne se déclenchera qu'en vrai secours (quand
la transcription échoue).

Pour qu'un testeur à voix typique (Marie) exerce réellement le classifier, il
faut un déclencheur **non-DEV**. Au choix :

- **Toggle UI (recommandé)** : case « Forcer le classifier acoustique » dans la
  carte Diagnostic vocal (Paramètres > Accessibilité). Le testeur l'active
  lui-même, le classement s'affiche à chaque essai.
- **Flag build** : variable `VITE_VOICE_DEBUG` activée uniquement sur le build
  préprod. Zéro UI, mais le testeur ne peut pas le couper.

À trancher avant le premier déploiement préprod de la branche vocale.

---

## 7. Risques & garde-fous

- **RGPD** : aucune donnée de santé réelle en préprod — instance + seed dédiés.
- **SEO / indexation** : `staging.unilien.app` doit renvoyer
  `X-Robots-Tag: noindex` (header Caddy) pour ne pas être indexé.
- **Confusion testeur** : bannière visuelle « PRÉPROD » sur l'environnement
  (réutiliser le pattern de la demo banner du gap checklist).
- **Coût VPS** : surveiller la RAM — une 2ᵉ stack Supabase Docker est lourde.
  Si le VPS sature, basculer sur l'alternative front-only (§3).
