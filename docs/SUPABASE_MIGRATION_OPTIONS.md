# Options de migration backend — Analyse Supabase

_Derniere mise a jour : 09 mars 2026_

---

## 1. Etat du couplage actuel avec Supabase

### Vue d'ensemble

| Couche | Fichiers concernes | Detail |
|--------|--------------------|--------|
| **Auth** | 4 fichiers | `authStore.ts`, `useAuth.ts`, `ResetPasswordForm.tsx`, `client.ts` — session, OAuth, email confirm, reset password |
| **Services (CRUD)** | 14 services | Tous utilisent `supabase.from().select().eq()` avec JOINs imbriques |
| **Storage** | 3 fichiers | avatars (`profileService`), justificatifs (`absenceJustificationService`), bulletins (`payslipStorageService`) — 3 buckets |
| **RLS (Row Level Security)** | 34 migrations SQL | Policies d'acces par role (employer, employee, caregiver, tutor/curator) |
| **Edge Functions** | 2 fonctions | push notifications, invitations email |
| **Triggers** | 2 triggers | `handle_new_user` (auto-create profile + role row), notifications |
| **Realtime** | 0 | Non utilise |
| **Total** | ~34 fichiers front + 34 migrations | Couplage fort |

### Ce qui rend la migration complexe

1. **Query builder specifique** — les requetes Supabase ne se traduisent pas 1:1 vers un autre ORM :
   ```ts
   // Supabase — JOINs imbriques via FK
   supabase.from('contracts').select(`
     *,
     employee_profile:employees!employee_id(
       profile:profiles!profile_id(first_name, last_name)
     )
   `).eq('employer_id', id)
   ```

2. **`auth.uid()` dans chaque policy RLS** — la logique d'acces est dans la base, pas dans le code applicatif

3. **Storage avec policies** — les buckets ont leurs propres regles d'acces basees sur `auth.uid()`

4. **Types generes** — `types/database.ts` est couple au schema Supabase

---

## 2. Options de migration

### Option A — Supabase self-hosted (recommandee)

**Principe** : deployer Supabase sur un hebergeur de notre choix (certifie HDS si besoin).

| Critere | Detail |
|---------|--------|
| **Effort** | Faible — changement de `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` |
| **Changements code** | Zero |
| **Changements DB** | Zero — memes migrations |
| **Delai** | 1-2 jours (setup infra) |
| **Cout** | Serveur dedie (~50-150 EUR/mois selon specs) |
| **HDS compatible** | Oui, si heberge chez un provider certifie |

**Hebergeurs HDS compatibles :**
- **OVH** — Public Cloud ou Bare Metal, certifie HDS
- **Scaleway** — Instances + Managed PostgreSQL, certifie HDS
- **Clever Cloud** — PaaS, certifie HDS
- **Outscale (3DS)** — Cloud souverain, certifie HDS

**Stack Supabase self-hosted :**
- Docker Compose (officiel) : PostgreSQL + GoTrue (auth) + PostgREST (API) + Storage API + Realtime + Studio
- ~6 conteneurs Docker
- Requires : PostgreSQL 15+, 4GB RAM minimum

**Avantages :**
- Aucun changement de code
- Controle total sur les donnees et l'infra
- Memes outils (Studio, CLI, migrations)
- Possibilite de chiffrement disque + colonnes

**Inconvenients :**
- Maintenance serveur a notre charge (mises a jour, backups, monitoring)
- Pas de CDN/edge integre (a configurer separement)
- Pas de support Supabase (communaute uniquement)

---

### Option B — Backend custom (Node.js + Prisma + PostgreSQL)

**Principe** : remplacer Supabase par une API REST/GraphQL custom.

| Critere | Detail |
|---------|--------|
| **Effort** | Tres lourd |
| **Changements code** | Reecriture de 14 services + auth + storage |
| **Changements DB** | Migration du schema vers Prisma (ou autre ORM) |
| **Delai** | 3-6 semaines |
| **Cout** | Serveur + temps de dev |
| **HDS compatible** | Oui, selon hebergeur |

**Stack proposee :**
- **Runtime** : Node.js 20+ ou Bun
- **Framework** : Express / Fastify / Hono
- **ORM** : Prisma (migration depuis SQL existant)
- **Auth** : Lucia / Auth.js / custom JWT
- **Storage** : S3-compatible (MinIO self-hosted ou OVH Object Storage)
- **Base** : PostgreSQL (meme schema, sans RLS)

**Travail requis :**

| Tache | Fichiers | Effort |
|-------|----------|--------|
| API REST (14 endpoints) | 14 services → 14 controllers | 2-3 semaines |
| Auth (signup, login, reset, session) | authStore + useAuth + middleware | 1 semaine |
| Storage (upload, download, signed URLs) | 3 services | 2-3 jours |
| Middleware d'autorisation (remplacer RLS) | Nouveau | 1 semaine |
| Migration schema (SQL → Prisma) | 34 migrations | 2-3 jours |
| Adapter le front (fetch/axios au lieu de supabase SDK) | 14 services + auth | 1 semaine |
| Tests | ~34 fichiers de tests a adapter | 1 semaine |

**Avantages :**
- Controle total sur chaque couche
- Pas de dependance a un SaaS
- Logique metier dans le code (pas dans les policies SQL)
- Plus facile a tester et debugger
- Choix libre d'hebergeur

**Inconvenients :**
- 3-6 semaines de travail
- Maintenance de l'auth (tokens, refresh, password reset)
- Maintenance du storage
- Plus de code a maintenir globalement
- Risque de regression

---

### Option C — Firebase

**Principe** : migrer vers l'ecosysteme Google (Firestore + Firebase Auth + Cloud Storage).

| Critere | Detail |
|---------|--------|
| **Effort** | Lourd |
| **Changements code** | Reecriture de tous les services + auth |
| **Changements DB** | Restructuration complete (SQL → NoSQL) |
| **Delai** | 4-6 semaines |
| **Cout** | Pay-as-you-go (potentiellement plus cher a grande echelle) |
| **HDS compatible** | Non — pas de certification HDS |

**Pourquoi c'est plus complique que les autres options :**
- Firestore est NoSQL — le schema relationnel (contracts → employees → profiles avec JOINs) ne se traduit pas naturellement
- Les requetes imbriquees Supabase deviendraient des lectures multiples
- Security Rules (equivalent RLS) a reecrire dans un format completement different
- Pas de SQL, donc les calculs complexes (compliance, stats) seraient plus difficiles

**Avantages :**
- Ecosysteme mature (auth, storage, hosting, functions)
- Scaling automatique
- Bonne documentation

**Inconvenients :**
- Modele NoSQL inadapte au domaine (relations fortes entre entites)
- Pas certifie HDS
- Vendor lock-in Google
- Cout difficile a prevoir
- Reecriture quasi totale

> **Verdict** : non recommande pour Unilien

---

### Option D — Appwrite (self-hosted)

**Principe** : remplacer Supabase par Appwrite, un BaaS open-source similaire.

| Critere | Detail |
|---------|--------|
| **Effort** | Lourd |
| **Changements code** | Reecriture de tous les services (API differente) |
| **Changements DB** | Migration schema (Appwrite utilise MariaDB en interne) |
| **Delai** | 3-5 semaines |
| **Cout** | Serveur (self-hosted) |
| **HDS compatible** | Oui, si self-hosted chez un provider HDS |

**Avantages :**
- Open source, self-hosted
- Auth + Storage + Functions integres
- SDK similaire a Supabase (query builder)

**Inconvenients :**
- MariaDB en interne (pas PostgreSQL) — migration du schema
- Moins mature que Supabase (communaute plus petite)
- Pas de RLS natif (permissions via collections)
- API et SDK differents — reecriture necessaire
- Relations entre collections moins naturelles

> **Verdict** : effort comparable au backend custom, avec moins de flexibilite

---

### Option E — Couche d'abstraction (Repository pattern)

**Principe** : ne pas migrer maintenant, mais preparer la migration en ajoutant une couche d'abstraction.

| Critere | Detail |
|---------|--------|
| **Effort** | Moyen |
| **Changements code** | Refactoring des 14 services |
| **Changements DB** | Aucun |
| **Delai** | 2-3 jours |
| **Cout** | Aucun |
| **HDS compatible** | N/A (preparation) |

**Principe :**

```ts
// Avant — couplage direct
export async function getShifts(contractId: string) {
  const { data } = await supabase.from('shifts').select('*').eq('contract_id', contractId)
  return data.map(mapShift)
}

// Apres — interface abstraite
interface ShiftRepository {
  getByContract(contractId: string): Promise<Shift[]>
}

// Implementation Supabase (actuelle)
class SupabaseShiftRepository implements ShiftRepository { ... }

// Implementation future (Prisma, API custom, etc.)
class PrismaShiftRepository implements ShiftRepository { ... }
```

**Avantages :**
- Faible effort maintenant
- Permet de changer de backend plus tard sans toucher aux composants
- Meilleure testabilite (injection de dependances)

**Inconvenients :**
- Ne resout pas le probleme HDS immediatement
- Ajoute une couche d'indirection
- L'auth et le storage restent couples

---

## 3. Matrice de comparaison

| Critere | A. Self-hosted | B. Custom | C. Firebase | D. Appwrite | E. Abstraction |
|---------|:-:|:-:|:-:|:-:|:-:|
| Effort migration | **Tres faible** | Tres lourd | Tres lourd | Lourd | Moyen |
| Changements front | 0 | ~50 fichiers | ~50 fichiers | ~50 fichiers | ~14 fichiers |
| Delai | 1-2 jours | 3-6 semaines | 4-6 semaines | 3-5 semaines | 2-3 jours |
| Controle infra | Total | Total | Aucun | Total | Inchange |
| HDS possible | Oui | Oui | Non | Oui | N/A |
| Maintenance | Moyenne | Elevee | Faible | Moyenne | Inchangee |
| Risque regression | Nul | Eleve | Eleve | Eleve | Faible |
| Vendor lock-in | Faible (OSS) | Aucun | Fort | Faible (OSS) | Inchange |

---

## 4. Recommandation

### Court terme (si besoin HDS)

**Option A — Supabase self-hosted** chez OVH ou Scaleway. Zero changement de code, 1-2 jours de setup.

### Moyen terme (reduire le couplage)

**Option E — Couche d'abstraction** pour preparer une migration future. 2-3 jours de refactoring, compatible avec toutes les autres options.

### Long terme (si on veut sortir de Supabase)

**Option B — Backend custom** avec Prisma + PostgreSQL. Le plus flexible mais le plus couteux. A envisager uniquement si les limites de Supabase deviennent bloquantes (performances, fonctionnalites specifiques, equipe backend disponible).

### A eviter

**Option C (Firebase)** — modele NoSQL inadapte au domaine relationnel d'Unilien + pas de certification HDS.
