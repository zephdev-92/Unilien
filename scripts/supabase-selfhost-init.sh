#!/usr/bin/env bash
# Initialise une base Supabase self-hosted en rejouant toutes les migrations du projet.
#
# Usage :
#   SUPABASE_DB_URL=postgresql://postgres:<pwd>@<host>:5432/postgres \
#     ./scripts/supabase-selfhost-init.sh
#
# Ou via tunnel SSH local :
#   ssh -L 5432:localhost:5432 ubuntu@<VPS_IP>
#   SUPABASE_DB_URL=postgresql://postgres:<pwd>@localhost:5432/postgres \
#     ./scripts/supabase-selfhost-init.sh
#
# Prérequis :
#   - psql installé (apt install postgresql-client)
#   - SUPABASE_DB_URL exportée

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../supabase/migrations"

# --- Couleurs ---
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'

log()   { echo -e "${B}▸${N} $*"; }
ok()    { echo -e "${G}✓${N} $*"; }
warn()  { echo -e "${Y}⚠${N} $*"; }
fail()  { echo -e "${R}✗${N} $*" >&2; exit 1; }

# --- Vérifs préalables ---
[[ -z "${SUPABASE_DB_URL:-}" ]] && fail "SUPABASE_DB_URL non définie. Exemple :
  export SUPABASE_DB_URL=postgresql://postgres:<pwd>@localhost:5432/postgres"

command -v psql >/dev/null 2>&1 || fail "psql introuvable. Installe postgresql-client."

[[ -d "$MIGRATIONS_DIR" ]] || fail "Dossier migrations introuvable : $MIGRATIONS_DIR"

# --- Test connexion ---
log "Test connexion base..."
if ! psql "$SUPABASE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
  fail "Impossible de se connecter à la base. Vérifie SUPABASE_DB_URL."
fi
ok "Connexion OK"

# --- Liste des migrations ---
mapfile -t MIGRATIONS < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" -type f | sort)
[[ ${#MIGRATIONS[@]} -eq 0 ]] && fail "Aucune migration trouvée dans $MIGRATIONS_DIR"
log "${#MIGRATIONS[@]} migrations trouvées"

# --- Table de suivi (évite de rejouer) ---
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE TABLE IF NOT EXISTS public._migrations (
  filename  TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum  TEXT
);
SQL

# --- Extensions requises (toutes idempotentes) ---
log "Activation des extensions Postgres..."
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
-- pgsodium : prévu pour le chiffrement des colonnes sensibles (à activer quand dispo)
-- CREATE EXTENSION IF NOT EXISTS pgsodium;
SQL
ok "Extensions prêtes"

# --- Rejeu des migrations ---
APPLIED=0
SKIPPED=0
FAILED=0

for f in "${MIGRATIONS[@]}"; do
  name="$(basename "$f")"

  already_applied=$(psql "$SUPABASE_DB_URL" -t -A -c \
    "SELECT 1 FROM public._migrations WHERE filename='$name' LIMIT 1;" 2>/dev/null || true)

  if [[ "$already_applied" == "1" ]]; then
    warn "Skip  $name (déjà appliquée)"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  log "Apply $name"
  checksum=$(sha256sum "$f" | awk '{print $1}')

  if psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
       -f "$f" >/dev/null 2>/tmp/migration_err; then
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO public._migrations (filename, checksum) VALUES ('$name', '$checksum');" >/dev/null
    ok    "      $name"
    APPLIED=$((APPLIED+1))
  else
    echo -e "${R}✗${N} Échec $name. Détail :"
    cat /tmp/migration_err >&2
    FAILED=$((FAILED+1))
    break
  fi
done

# --- Résumé ---
echo
echo "────────────────────────────────────────"
ok    "Appliquées : $APPLIED"
[[ $SKIPPED -gt 0 ]] && warn "Skippées   : $SKIPPED"
[[ $FAILED  -gt 0 ]] && fail "Échouées   : $FAILED (arrêt)"
ok    "Migrations terminées"
echo "────────────────────────────────────────"
