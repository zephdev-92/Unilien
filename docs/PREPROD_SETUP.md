# Préprod — Mise en place & runbook

> Environnement de préproduction pour faire tester des branches non mergées à
> des utilisateurs cibles (Marie, etc.) sans toucher à la prod.
>
> **Statut : décisions tranchées, code livré (branche `chore/preprod-staging-env`).**
> Reste à exécuter le runbook §5 (actions VPS / DNS / GitHub).

---

## 1. Objectif

`unilien.app` est le seul environnement déployé. Pour faire tester une feature
en cours (ex : le classifier vocal, branche `fix/voice-classifier-prior-normalization`)
à un utilisateur non-dev, il faut un environnement intermédiaire :

- accessible via une URL publique,
- déployable depuis une branche arbitraire (pas seulement `main`),
- isolé de la prod (déploiement, backend, monitoring),
- protégé et non indexé.

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
| Hébergement    | VPS unique OVH VPS-3 (8 vCores, 24 Go RAM, Debian 13)       |

---

## 3. Décisions (tranchées)

| # | Question                   | Choix                                                          |
|---|----------------------------|-----------------------------------------------------------------|
| 1 | Sous-domaine               | `staging.unilien.app`                                          |
| 2 | Où ça tourne               | Même VPS (nouveaux blocs Caddy)                                |
| 3 | Backend / données          | **Instance Supabase self-host dédiée** (stack Docker n°2, ports 8100+) |
| 4 | Déclencheur de déploiement | `workflow_dispatch` manuel (workflow `deploy-staging.yml`)      |
| 5 | Accès                      | Basic auth Caddy (un couple identifiant / mot de passe partagé) |

### Données du backend staging — copie de la prod

Tant qu'il n'y a **aucun client réel**, la base prod ne contient que des
données de test internes — donc **pas de donnée de santé de tiers**, RGPD
art. 9 sans objet. La base staging est donc **initialisée par une copie de la
prod** (`pg_dump` → `psql`, cf. §5 étape 3), pas par un seed fictif.

> ⚠️ **À revoir dès l'arrivée de vrais clients.** Copier la prod exposerait
> alors des données de santé réelles à un environnement moins surveillé. Il
> faudra basculer sur un **seed de données fictives** (à partir du baseline
> `000_baseline_schema.sql`) et ne plus jamais copier la prod.

---

## 4. Architecture cible

```
staging.unilien.app      → Caddy (basic auth) → /var/www/unilien-staging
api-staging.unilien.app  → Caddy              → localhost:8100  (Supabase staging)
```

- **Même VPS**, blocs Caddy ajoutés à `infra/caddy/Caddyfile` (déjà fait).
- Build préprod = `npm run build` avec `VITE_*` pointant vers `api-staging`.
- Basic auth Caddy sur `staging.unilien.app`, header `X-Robots-Tag: noindex`.
- CSP du bloc staging = copie de la prod, `api.unilien.app` → `api-staging.unilien.app`.

---

## 5. Runbook de mise en place (à exécuter une fois)

Ordre impératif : DNS d'abord (propagation), puis backend, puis Caddy, puis
GitHub, puis premier déploiement.

### Étape 1 — DNS OVH

Dans la zone DNS OVH de `unilien.app`, ajouter deux enregistrements `A`
pointant vers l'IP du VPS :

| Sous-domaine  | Type | Cible        |
|---------------|------|--------------|
| `staging`     | A    | `<IP du VPS>` |
| `api-staging` | A    | `<IP du VPS>` |

Attendre la propagation (`dig staging.unilien.app +short` renvoie l'IP).

### Étape 2 — Stack Supabase staging

Sur le VPS, créer une 2ᵉ stack Docker isolée de la prod :

```bash
# Copier l'arborescence Supabase self-host existante
sudo cp -r /opt/supabase /opt/supabase-staging
cd /opt/supabase-staging/docker
```

Éditer le `.env` de la stack staging (`nano .env`) :

- **Isolation Docker** : `COMPOSE_PROJECT_NAME=supabase-staging`
  (sinon les conteneurs entrent en collision avec la prod).
- **Ports** : décaler tout ce qui est exposé sur l'hôte — au minimum
  `KONG_HTTP_PORT=8100` (Studio/API). Les autres services communiquent par le
  réseau Docker interne, pas besoin de port hôte.
- **Secrets neufs** (ne JAMAIS réutiliser ceux de la prod) :
  `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`
  (les deux clés se dérivent du `JWT_SECRET` — générateur dans la doc Supabase
  self-host), `SECRET_KEY_BASE`, `VAULT_ENC_KEY`, identifiants dashboard.
- **URLs** :
  `API_EXTERNAL_URL=https://api-staging.unilien.app`,
  `SUPABASE_PUBLIC_URL=https://api-staging.unilien.app`,
  `SITE_URL=https://staging.unilien.app`,
  `ADDITIONAL_REDIRECT_URLS=https://staging.unilien.app`.

Démarrer :

```bash
sudo docker compose up -d
```

### Étape 3 — Copier la base prod dans le staging

```bash
# Dump de la base prod (schéma + données)
sudo docker exec supabase-db \
  pg_dump -U postgres -d postgres --clean --if-exists \
  > /tmp/prod-dump.sql

# Restauration dans la base staging
cat /tmp/prod-dump.sql | sudo docker exec -i supabase-staging-db \
  psql -U postgres -d postgres

rm /tmp/prod-dump.sql
```

> ⚠️ **pgsodium / données de santé chiffrées** : `employer_health_data` est
> chiffré avec la clé pgsodium de la prod. Le staging ayant une `VAULT_ENC_KEY`
> différente, le déchiffrement de ces lignes échouera. Sans client réel ce
> n'est pas bloquant (aucune donnée santé exploitable). Si besoin de les lire
> en préprod : copier aussi la clé racine pgsodium — à éviter.

### Étape 4 — Basic auth Caddy

Sur le VPS, générer le hash du mot de passe partagé :

```bash
caddy hash-password --plaintext 'LE_MOT_DE_PASSE_CHOISI'
```

Coller le hash bcrypt obtenu dans `infra/caddy/Caddyfile`, bloc
`staging.unilien.app`, en remplacement de `REMPLACER_PAR_LE_HASH_BCRYPT`.
Identifiant par défaut : `staging` (modifiable dans le même bloc).

### Étape 5 — Déployer le Caddyfile

Workflow manuel habituel (cf. déploiements CSP précédents) :

```bash
scp infra/caddy/Caddyfile <user>@<vps>:/tmp/Caddyfile
ssh <user>@<vps> 'sudo caddy validate --config /tmp/Caddyfile --adapter caddyfile \
  && sudo cp /tmp/Caddyfile /etc/caddy/Caddyfile \
  && sudo systemctl reload caddy'
```

### Étape 6 — Environnement GitHub `env_unilien_staging`

Dans **Settings > Environments**, créer l'environnement `env_unilien_staging`
et y définir :

| Nom                       | Type   | Valeur                             |
|---------------------------|--------|------------------------------------|
| `VITE_SUPABASE_URL`       | secret | `https://api-staging.unilien.app`  |
| `VITE_SUPABASE_ANON_KEY`  | secret | clé `ANON_KEY` de la stack staging |

Le workflow réutilise aussi `VPS_SSH_PRIVATE_KEY`, `VPS_HOST`, `VPS_USER`.
S'ils sont définis au niveau **repo**, ils sont déjà visibles. S'ils sont
scopés à l'environnement `env_unilien`, les **dupliquer** dans
`env_unilien_staging`.

### Étape 7 — Premier déploiement

GitHub > **Actions** > **Deploy to Staging** > **Run workflow** > choisir la
branche (ex : `fix/voice-classifier-prior-normalization`).

Vérifier ensuite `https://staging.unilien.app` (le navigateur demande les
identifiants basic auth).

---

## 6. Procédure récurrente — déployer une branche en préprod

GitHub > **Actions** > **Deploy to Staging** > **Run workflow**, saisir le nom
de la branche. Le workflow `deploy-staging.yml` build (sans tests — la préprod
sert à tester des branches en cours) et rsync vers `/var/www/unilien-staging`,
puis pousse les Edge Functions vers la stack staging.

**Re-synchroniser la base staging avec la prod** : ré-exécuter l'étape 3
(écrase les données staging).

---

## 7. Point spécifique — classifier vocal sur préprod

Le bloc `[DEBUG TEMP]` de `useVoiceNavigation.ts`, qui force le classifier
acoustique à chaque essai, est gardé par `import.meta.env.DEV`. **Un build
préprod est un build de production → `DEV` vaut `false`** : le bloc ne
s'exécute pas, et le classifier ne se déclenche qu'en vrai secours (quand la
transcription Whisper échoue).

Un testeur à voix typique (Marie) verra donc sa transcription réussir souvent
et **n'exercera quasiment jamais le classifier**. Pour qu'il soit réellement
testé, il faut un déclencheur non-DEV — **non encore implémenté** (décision
reportée) :

- **Toggle UI (recommandé)** : case « Forcer le classifier acoustique » dans la
  carte Diagnostic vocal (Paramètres > Accessibilité).
- **Flag build** : variable `VITE_VOICE_DEBUG` activée sur le build préprod.

> En l'état, déployer la branche vocale en préprod permet de tester la
> **navigation vocale globale**, pas spécifiquement le classifier de secours.

---

## 8. Risques & garde-fous

- **RGPD** : valable tant qu'il n'y a aucun client réel (cf. §3). Dès les
  premiers clients → seed fictif obligatoire, ne plus copier la prod.
- **SEO** : `staging.unilien.app` renvoie `X-Robots-Tag: noindex` (bloc Caddy).
- **Confusion testeur** : `VITE_APP_NAME` vaut `Unilien (préprod)` sur le build
  staging. Une bannière visuelle « PRÉPROD » reste un TODO (réutiliser le
  pattern de la demo banner du gap checklist).
- **RAM VPS** : une 2ᵉ stack Supabase Docker est lourde, mais le VPS-3 dispose
  de 24 Go — marge confortable. Surveiller tout de même `docker stats`.
