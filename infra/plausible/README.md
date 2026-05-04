# Plausible Analytics — installation VPS

Plausible CE v3 (Community Edition) self-hosted, derrière Caddy, sur le VPS OVH partagé avec Supabase.

- **URL publique** : `https://plausible.unilien.app`
- **Port loopback** : `127.0.0.1:8001` (override pour éviter conflit avec Kong/Supabase sur 8000)
- **Path d'install** : `/opt/plausible-ce/`

## Prérequis

- DNS : record A `plausible.unilien.app` → IP du VPS
- Docker + Docker Compose installés (déjà présents pour Supabase)
- Caddy installé (déjà présent)

## Installation initiale

### 1. Cloner Plausible CE

```bash
ssh unilien-test

sudo mkdir -p /opt/plausible-ce
sudo chown $USER:$USER /opt/plausible-ce
git clone https://github.com/plausible/community-edition /opt/plausible-ce
cd /opt/plausible-ce
```

### 2. Générer les clés et créer le `.env`

Plausible CE v3 attend un fichier `.env` à la racine (pas `plausible-conf.env`). Pour éviter les soucis d'indentation lors du copier-coller heredoc, utiliser `nano` :

```bash
# Génère les 2 clés à coller dans le fichier
echo "SECRET=$(openssl rand -base64 48)"
echo "TOTP=$(openssl rand -base64 32)"

nano /opt/plausible-ce/.env
```

Coller le contenu de [`env.example`](./env.example) (à la racine de ce dossier) en remplaçant les valeurs `changeme-...` par les clés générées au-dessus.

```bash
chmod 600 /opt/plausible-ce/.env
```

### 3. Override Docker Compose

Plausible CE v3 utilise `compose.yml` (et donc `compose.override.yml`, pas `docker-compose.override.yml`). Coller le contenu de [`compose.override.yml`](./compose.override.yml) dans `/opt/plausible-ce/compose.override.yml` (via `nano` pour éviter les soucis YAML).

Vérifier la config mergée :

```bash
sudo docker compose config | grep -A 5 plausible:
```

### 4. Démarrer

```bash
cd /opt/plausible-ce
sudo docker compose pull
sudo docker compose up -d
sleep 45
sudo docker compose ps
curl -fsS http://127.0.0.1:8001/api/health
```

Réponse attendue : `{"sessions":"ok","postgres":"ok","clickhouse":"ok","sites_cache":"ok"}`

## Caddy — bloc à ajouter

Dans `/etc/caddy/Caddyfile` (versionné dans `infra/caddy/Caddyfile`) :

```caddy
plausible.unilien.app {
    encode zstd gzip
    reverse_proxy localhost:8001
}
```

Puis recharger :

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## CSP — script-src + connect-src

Dans le bloc `unilien.app` du Caddyfile, ajouter `https://plausible.unilien.app` à :

- `script-src` (chargement du script tracker)
- `connect-src` (envoi des events)

Déjà fait dans le Caddyfile versionné — vérifier après `git pull` que la prod a bien la dernière version.

## Premier admin

Plausible CE v3 active la vérification email par défaut, mais on n'a pas configuré de SMTP. Astuce :

```bash
# 1. Désactiver temporairement la vérif email
nano /opt/plausible-ce/.env
# Ajouter : ENABLE_EMAIL_VERIFICATION=false
sudo docker compose restart plausible
```

1. Aller sur `https://plausible.unilien.app/register`
2. S'inscrire avec ton email + mot de passe
3. Tu arrives directement sur le dashboard

```bash
# 2. Re-sécuriser après création du 1er admin
nano /opt/plausible-ce/.env
# - Supprimer la ligne ENABLE_EMAIL_VERIFICATION=false
# - Changer DISABLE_REGISTRATION=false → true
sudo docker compose restart plausible
```

## Ajouter le site Unilien

Dans le dashboard Plausible : **Add a website** → `unilien.app` (timezone Europe/Paris).

## Maintenance

```bash
# Mise à jour Plausible (suivre les release notes pour les breaking changes)
cd /opt/plausible-ce
git pull
sudo docker compose pull
sudo docker compose up -d

# Logs
sudo docker compose logs -f plausible

# Backup Postgres
sudo docker compose exec plausible_db pg_dump -U postgres plausible_db \
    > /opt/backups/plausible-pg-$(date +%F).sql

# Backup ClickHouse — voir docs Plausible (snapshots)
```

## Côté front Unilien

Le composant `src/components/Analytics.tsx` lit 2 env vars Vite (exposées au build) :

```
VITE_PLAUSIBLE_DOMAIN=unilien.app
VITE_PLAUSIBLE_SRC=https://plausible.unilien.app/js/script.js
```

Configurer ces deux variables dans **GitHub → Settings → Environments → `env_unilien`** (en *Variables*, pas en *Secrets* — elles ne sont pas sensibles). Le workflow `.github/workflows/deploy.yml` les passe automatiquement au step `Build application`.

Si les env vars sont absentes au build, le composant `<Analytics />` est silencieux (no-op). Aucun risque en dev/staging.
