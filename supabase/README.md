# Migrations Supabase

## Structure

```
supabase/
├── README.md                     ← ce fichier
├── migrations/
│   └── 000_baseline_schema.sql   ← schéma de référence (source unique pour un reset)
└── migrations_archive/           ← 64 migrations historiques (001 → 065), référence seule
```

## Pourquoi un baseline

L'historique d'origine (`001` → `065`) était **partiel** : la migration `001`
référençait déjà `public.profiles`, `public.contracts`, `public.caregivers`…
sans qu'aucune migration ne crée ces tables (elles avaient été créées hors
versioning, via le dashboard Supabase aux débuts du projet).

Conséquence : `supabase db reset` / `supabase test db` échouaient dès la
migration `001` (table inexistante) — d'où l'absence de tout harness de tests
côté base.

Le **squash** du 2026-05-15 résout ça :

- `000_baseline_schema.sql` = `pg_dump --schema-only --schema=public` de la
  base de production, qui reproduit l'intégralité du schéma applicatif.
- Les 64 migrations historiques sont déplacées dans `migrations_archive/`
  (conservées pour l'historique git et la traçabilité, **hors** du chemin de
  reset).

`supabase db reset` rejoue désormais une chaîne complète et cohérente.

## Workflow

### Reset / tests en local

```bash
npx supabase start          # démarre le stack local (Docker)
npx supabase db reset       # recrée la base à partir de 000_baseline_schema.sql
```

### Nouvelle migration

Les évolutions futures s'ajoutent **après** le baseline, en numérotation
classique (`001_...`, `002_...`, format `NNN_description.sql`) :

```bash
# créer le fichier à la main dans supabase/migrations/
# puis l'appliquer en prod (workflow self-host manuel habituel)
```

### Régénérer le baseline

Si le schéma prod diverge significativement, régénérer le snapshot :

```bash
ssh unilien-test "docker exec supabase-db pg_dump -U postgres -d postgres \
  --schema-only --schema=public --no-publications --no-subscriptions"
```

Puis : retirer les lignes `\restrict` / `\unrestrict`, rendre `CREATE SCHEMA
public` idempotent (`IF NOT EXISTS`), conserver l'en-tête `CREATE EXTENSION`.

## Limites connues

Le baseline ne couvre **que le schéma `public`**. Ne sont pas inclus (non
requis pour les tests RLS locaux) :

- le trigger sur `auth.users` de la migration `060` (force `role='authenticated'`)
- les buckets / policies de `storage`
- la configuration runtime de `pgsodium` (clé serveur)

De plus, les objets possédés par `supabase_admin` en production (helpers
pgsodium, vue santé, quelques tables) sont ramenés à `OWNER postgres` dans le
baseline : le rôle qui applique les migrations en local n'est pas membre de
`supabase_admin`. Conséquence : le **déchiffrement des données de santé**
(`decrypt_health_field`, etc.) ne fonctionne pas sur la base locale — sans
impact pour les tests RLS, qui ne portent que sur la visibilité des lignes.

Lors d'une régénération du baseline, refaire ce remplacement
`supabase_admin` → `postgres`.
