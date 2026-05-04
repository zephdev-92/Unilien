# Plausible Analytics — installation VPS

Plausible CE (Community Edition) self-hosted, derrière Caddy, sur le VPS OVH partagé avec Supabase.

- **URL publique** : `https://plausible.unilien.app`
- **Port loopback** : `127.0.0.1:8001` (override pour éviter conflit avec Kong/Supabase sur 8000)
- **Path d'install** : `/opt/plausible-ce/`

## Prérequis

- DNS : record A `plausible.unilien.app` → IP du VPS (51.178.81.109)
- Docker + Docker Compose installés (déjà présents pour Supabase)
- Caddy installé (déjà présent)

## Installation initiale

```bash
ssh unilien-test

# 1. Cloner le repo Plausible CE
sudo mkdir -p /opt/plausible-ce
sudo chown $USER:$USER /opt/plausible-ce
git clone https://github.com/plausible/community-edition /opt/plausible-ce
cd /opt/plausible-ce

# 2. Générer les clés et créer plausible-conf.env
SECRET_KEY=$(openssl rand -base64 64 | tr -d '\n')
TOTP_KEY=$(openssl rand -base64 32 | tr -d '\n')
cat > plausible-conf.env <<EOF
BASE_URL=https://plausible.unilien.app
SECRET_KEY_BASE=$SECRET_KEY
TOTP_VAULT_KEY=$TOTP_KEY
DISABLE_REGISTRATION=false
EOF
chmod 600 plausible-conf.env

# 3. Copier l'override docker-compose (depuis le repo Unilien)
# Si /opt/plausible-ce n'a pas accès au repo, copier le contenu de
# infra/plausible/docker-compose.override.yml manuellement.
sudo cp /chemin/vers/unilien/infra/plausible/docker-compose.override.yml \
        /opt/plausible-ce/docker-compose.override.yml

# 4. Démarrer
sudo docker compose pull
sudo docker compose up -d

# 5. Vérifier
sudo docker compose ps
curl -fsS http://127.0.0.1:8001/api/health
```

## Caddy — bloc à ajouter

Dans `/etc/caddy/Caddyfile` (ou `infra/caddy/Caddyfile` du repo) :

```caddy
plausible.unilien.app {
    encode zstd gzip
    reverse_proxy localhost:8001
}
```

Puis recharger Caddy :

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## CSP — script-src + connect-src

Dans le bloc `unilien.app` du Caddyfile, ajouter `https://plausible.unilien.app` à :

- `script-src` (le script tracker)
- `connect-src` (l'envoi des events)

## Premier admin

1. Aller sur `https://plausible.unilien.app/register`
2. S'inscrire avec un email et un mot de passe
3. (Plausible CE peut demander une confirmation par email — si pas de SMTP configuré, suivre les logs : `sudo docker compose logs -f plausible | grep -i confirm`)
4. Une fois connecté, fermer la registration :
   ```bash
   sed -i 's/DISABLE_REGISTRATION=false/DISABLE_REGISTRATION=true/' \
       /opt/plausible-ce/plausible-conf.env
   sudo docker compose -f /opt/plausible-ce/docker-compose.yml restart plausible
   ```

## Ajouter le site Unilien

Dans le dashboard Plausible : **Add a website** → `unilien.app` (timezone Europe/Paris).

## Maintenance

```bash
# Mise à jour
cd /opt/plausible-ce
git pull
sudo docker compose pull
sudo docker compose up -d

# Logs
sudo docker compose logs -f plausible

# Backup (Postgres + ClickHouse)
sudo docker compose exec plausible_db pg_dump -U postgres plausible_db > backup-$(date +%F).sql
# Pour ClickHouse, voir docs Plausible (snapshots)
```

## Côté front Unilien

Le composant `src/components/Analytics.tsx` lit 2 env vars (Vite, exposées au build) :

```
VITE_PLAUSIBLE_DOMAIN=unilien.app
VITE_PLAUSIBLE_SRC=https://plausible.unilien.app/js/script.js
```

Configurer ces deux variables dans GitHub Actions → Settings → Environments → `env_unilien` (et les passer au step `Build application` dans `.github/workflows/deploy.yml`).
