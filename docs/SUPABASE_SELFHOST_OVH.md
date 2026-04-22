# Supabase self-hosted sur OVH — Guide de déploiement

Guide pratique pour déployer une instance Supabase self-hostée sur un VPS OVH, destinée à l'environnement de **test / dev** d'Unilien.

> ⚠️ **Prod + données de santé** : pour passer en production, il faut un hébergeur **certifié HDS** (OVH HDS, Scaleway HDS, ou rester sur Supabase Cloud). Ce guide couvre uniquement un serveur de test.

---

## 1. Commander le VPS OVH

**Reco : VPS-3** (4 vCPU / 8 GB RAM / 160 GB NVMe / ~13€ HT/mois)

- **OS** : Debian 13 (Trixie) — stable, kernel 6.x, support jusqu'en 2030. Debian 12 ou Ubuntu 22.04+ LTS fonctionnent aussi à l'identique.
- **Datacenter** : Gravelines (GRA) ou Roubaix (RBX) — proche, RGPD-ok
- **Option** : snapshot manuel (gratuit) — très utile avant chaque manip risquée

> 💡 User SSH par défaut : `debian` sur Debian, `ubuntu` sur Ubuntu. Les commandes ci-dessous utilisent `debian@`, adapte si besoin.

À la commande :
1. Créer/utiliser une **paire SSH** (OVH la déploie automatiquement)
2. Noter l'IPv4 publique
3. Attendre l'email d'activation (~5-10 min)

---

## 2. Préparer le serveur

```bash
# Connexion
ssh debian@<IP_VPS>

# Vérifier la version Debian (attendu : 13 / Trixie)
cat /etc/os-release

# Mise à jour + utilitaires
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw fail2ban rsync

# Créer un user dédié (optionnel mais propre)
sudo adduser supabase
sudo usermod -aG sudo supabase
sudo rsync --archive --chown=supabase:supabase ~/.ssh /home/supabase
```

### Firewall UFW

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP (Let's Encrypt challenge)
sudo ufw allow 443/tcp      # HTTPS
sudo ufw enable
```

**Ne jamais exposer** directement Kong (`8000`), Postgres (`5432`) ou Studio (`3000`). Tout passe par le reverse proxy HTTPS.

### Durcir SSH

`/etc/ssh/sshd_config` :
```
PasswordAuthentication no
PermitRootLogin no
```
Puis : `sudo systemctl restart ssh`

---

## 3. Installer Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Vérifier
docker compose version
```

---

## 4. Cloner Supabase

Supabase fournit un `docker-compose.yml` officiel maintenu — pas besoin d'en écrire un.

```bash
cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase.git
sudo chown -R $USER:$USER supabase
cd supabase/docker
cp .env.example .env
```

---

## 5. Générer les secrets

### JWT secret + API keys

```bash
# JWT secret (40+ chars)
openssl rand -hex 40
```

Puis génère les clés `ANON_KEY` et `SERVICE_ROLE_KEY` via [le générateur JWT Supabase](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys) (copie le JWT secret dedans, il sort les deux tokens).

### Password Postgres + Dashboard

```bash
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 32   # DASHBOARD_PASSWORD
```

### `.env` minimal à modifier

```bash
POSTGRES_PASSWORD=<strong>
JWT_SECRET=<40+ chars hex>
ANON_KEY=<généré>
SERVICE_ROLE_KEY=<généré>

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong>

SITE_URL=https://test.unilien.fr       # ton front de test
API_EXTERNAL_URL=https://api-test.unilien.fr
SUPABASE_PUBLIC_URL=https://api-test.unilien.fr

# SMTP (optionnel, pour reset password etc.)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<resend_api_key>
SMTP_ADMIN_EMAIL=noreply@unilien.fr
SMTP_SENDER_NAME=Unilien
```

> ⚠️ Ne jamais committer ce `.env`. Ajoute-le au `.gitignore` local du VPS.

---

## 6. Lancer Supabase

```bash
cd /opt/supabase/docker
docker compose pull
docker compose up -d

# Vérifier
docker compose ps
docker compose logs -f kong     # gateway API
docker compose logs -f db       # Postgres
```

Attendre ~1-2 min que tout soit healthy.

**Ports internes** (pas exposés publiquement) :
- Kong (API gateway) : `8000`
- Studio (UI admin) : `3000`
- Postgres : `5432`

---

## 7. Reverse proxy avec Caddy (HTTPS auto)

**Caddy** fait le TLS Let's Encrypt automatiquement. Plus simple que Traefik pour démarrer.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

### DNS OVH

Crée deux enregistrements A pointant vers l'IP du VPS :
- `api-test.unilien.fr` → `<IP_VPS>`
- `studio-test.unilien.fr` → `<IP_VPS>`

### `/etc/caddy/Caddyfile`

```caddy
api-test.unilien.fr {
    reverse_proxy localhost:8000
    encode gzip
}

studio-test.unilien.fr {
    # Protection additionnelle basique (Studio n'a pas d'auth built-in robuste)
    basicauth {
        admin <hash_bcrypt>
    }
    reverse_proxy localhost:3000
}
```

Générer le hash bcrypt pour Studio :
```bash
caddy hash-password
```

Puis :
```bash
sudo systemctl reload caddy
```

Caddy récupère automatiquement les certificats Let's Encrypt au premier hit.

---

## 8. Connecter Unilien à ta Supabase self-hosted

Dans `.env.local` du front (pour un build de test) :
```bash
VITE_SUPABASE_URL=https://api-test.unilien.fr
VITE_SUPABASE_ANON_KEY=<ANON_KEY générée à l'étape 5>
```

Rebuild + deploy le front (Netlify branch preview ou équivalent) pointant sur cette URL.

---

## 9. Migrations DB

Tu as 50 migrations SQL dans `supabase/migrations/`. Script dédié fourni : `scripts/supabase-selfhost-init.sh`.

**Ce qu'il fait** :
- Active les extensions Postgres requises (`uuid-ossp`, `pgcrypto`, `pg_trgm`, `btree_gist`)
- Crée une table `_migrations` pour tracer les fichiers déjà appliqués (idempotent, rejouable)
- Applique chaque migration en **transaction** (échec → rollback automatique)
- Affiche un résumé final (appliquées / skippées / échouées)

### Usage

```bash
# 1. Ouvrir un tunnel SSH vers le Postgres du VPS (Postgres n'est jamais exposé publiquement)
ssh -L 5432:localhost:5432 debian@<IP_VPS>

# 2. Dans un autre terminal, depuis ta machine locale
cd /media/zephdev/Jeux/warp/unilien
export SUPABASE_DB_URL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"
./scripts/supabase-selfhost-init.sh
```

### Rejouer uniquement les nouvelles migrations

Le script est idempotent : il saute celles déjà présentes dans `_migrations`. Tu peux le relancer à chaque nouvelle migration ajoutée au projet.

### Alternative via CLI Supabase

```bash
npm install -g supabase
supabase link --db-url "$SUPABASE_DB_URL"
supabase db push
```

> L'avantage du script maison : pas de CLI Supabase à installer, traçabilité via `_migrations`, fonctionne même si le CLI n'est pas synchronisé avec ta version de self-host.

---

## 10. Sauvegardes

Minimum vital : dump Postgres quotidien.

```bash
# /opt/supabase/backup.sh
#!/usr/bin/env bash
set -e
DATE=$(date +%F)
DIR=/opt/supabase/backups
mkdir -p "$DIR"
docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db \
  pg_dump -U postgres postgres | gzip > "$DIR/db-$DATE.sql.gz"
# Garde 7 jours
find "$DIR" -name "db-*.sql.gz" -mtime +7 -delete
```

Cron :
```bash
crontab -e
# 0 3 * * * /opt/supabase/backup.sh
```

Pour du prod, complète avec un **snapshot OVH** (panel manager, gratuit, manuel) + un rsync offsite (Backblaze B2, ~0.005$/GB/mois).

---

## 11. Checklist avant mise en service

- [ ] Firewall UFW actif, seuls 22/80/443 ouverts
- [ ] SSH password disabled, clé obligatoire
- [ ] `fail2ban` actif
- [ ] `.env` Supabase hors git, secrets forts (32+ chars)
- [ ] HTTPS OK (Caddy + Let's Encrypt) sur `api-test` et `studio-test`
- [ ] Studio protégé par basic auth
- [ ] Postgres **jamais** exposé publiquement
- [ ] Dump quotidien cron actif
- [ ] RLS activé sur toutes les tables (migrations Unilien le font déjà)
- [ ] Disclaimer HDS mis à jour si ouverture à des testeurs externes

---

## Ressources

- [Docs officielles Supabase self-hosting](https://supabase.com/docs/guides/self-hosting/docker)
- [Générateur JWT Supabase](https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys)
- [Caddy docs](https://caddyserver.com/docs/)
- [Memoire projet](../../.claude/projects/-media-zephdev-Jeux-warp/memory/project-supabase-selfhost.md) — chiffrement colonnes (pgsodium) à implémenter après migration
