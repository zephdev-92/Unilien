# KPIs produit — Unilien

> Référentiel des indicateurs produit suivis pour Unilien.
> Sources : **Plausible** (analytics cookieless, `https://plausible.unilien.app`) et **Supabase** (requêtes SQL).
> Voir aussi : `docs/ANALYTICS_IMPLEMENTATION.md` (intégration Plausible côté app).

## Scope actuel

> **On suit pour l'instant les étages 1 (Acquisition) et 2 (Activation) uniquement.**
> Les étages 3 (Rétention) et 4 (Santé produit) sont documentés en bas en « Plus tard » — à activer une fois le volume d'utilisateurs suffisant.

## Principes

- **Phase actuelle : early-access** → priorité absolue à l'**Activation**. Avec peu d'utilisateurs, c'est le seul étage qui dit si le produit « prend ». La rétention devient lisible une fois le volume atteint.
- **RGPD / santé (art. 9)** : Plausible est cookieless et sans PII. **Ne jamais** envoyer en propriété d'event une donnée identifiante ou de santé (`handicap_type`, `pch_*`, email, nom, téléphone). Seules des props non sensibles comme `role` sont autorisées. Cf. `.claude/rules/security.md`.
- Convention de nommage des events : verbe au passé ou nom d'action, en anglais — ex. `Signup`, `Onboarding Completed`.

---

## 1. Acquisition

| KPI | Définition | Source | Cible indicative |
|---|---|---|---|
| Visiteurs uniques / sem | Trafic landing | Plausible (natif) | tendance ↗ |
| Top sources de trafic | Origine des visiteurs | Plausible (natif) | — |
| Taux de clic CTA signup | clics CTA « S'inscrire » / visiteurs uniques | event `CTA Signup Click` | > 5 % |

---

## 2. Activation ⭐ (priorité early-access)

| KPI | Définition | Source | Cible indicative |
|---|---|---|---|
| Taux de signup | comptes créés / visiteurs uniques | event `Signup` + DB | > 3 % |
| Onboarding complété | % de signups qui finissent l'onboarding | event `Onboarding Completed` (prop `role`) | > 70 % |
| Time-to-first-value | délai médian signup → 1ère intervention créée | DB Supabase | < 48 h |
| Taux d'activation | % comptes avec ≥ 1 intervention dans les 7 j | DB Supabase | > 40 % |

---

## Events Plausible à instrumenter (étages 1 & 2)

À ajouter dans le code app via `window.plausible(...)` (le script n'est injecté que si le toggle Analytics user est activé — cf. `Analytics.tsx`).

| Event | Déclencheur | Propriétés (non sensibles) |
|---|---|---|
| `CTA Signup Click` | clic sur un CTA d'inscription (landing) | `location` (hero / footer / …) |
| `Signup` | compte créé | `role` (employer / employee / caregiver) |
| `Onboarding Completed` | onboarding terminé (RPC `complete_onboarding`) | `role` |
| `Shift Created` | 1ère intervention planifiée (marqueur d'activation) | — |

Côté Plausible, créer un **Goal** par event (Settings > Goals > Custom event) pour les voir dans le dashboard et construire le funnel d'activation.

```ts
// Helper suggéré — src/lib/analytics/track.ts
type PlausibleProps = Record<string, string | number | boolean>

export function track(event: string, props?: PlausibleProps) {
  // Ne JAMAIS passer de PII / donnée de santé dans props
  window.plausible?.(event, props ? { props } : undefined)
}

// Usage
track('Signup', { role: 'employer' })
```

---

## Requêtes Supabase (KPIs côté DB)

> À exécuter en read-only. Adapter les noms de tables si besoin.

### Time-to-first-value (médiane signup → 1ère intervention)

```sql
select
  percentile_cont(0.5) within group (
    order by extract(epoch from (first_shift.created_at - u.created_at)) / 3600
  ) as median_hours
from auth.users u
join lateral (
  select min(s.created_at) as created_at
  from shifts s
  where s.created_by = u.id
) first_shift on true
where first_shift.created_at is not null;
```

### Taux d'activation J7 (cohorte des comptes créés)

```sql
select
  count(*) filter (where activated) ::float / nullif(count(*), 0) as activation_rate_7d
from (
  select
    u.id,
    exists (
      select 1 from shifts s
      where s.created_by = u.id
        and s.created_at <= u.created_at + interval '7 days'
    ) as activated
  from auth.users u
) t;
```

> Note : `created_by` / noms de colonnes à vérifier contre le schéma réel (`supabase/migrations/000_baseline_schema.sql`).

---

## Plus tard (étages 3 & 4 — hors scope actuel)

À activer quand le volume d'utilisateurs sera suffisant pour que ces métriques soient lisibles.

### 3. Rétention / Engagement

| KPI | Définition | Source |
|---|---|---|
| WAU / MAU | utilisateurs actifs hebdo / mensuel | DB (`auth.users.last_sign_in_at`) |
| Stickiness | WAU / MAU | calculé |
| Interventions créées / sem | volume planning | DB |
| Rétention J30 | % comptes encore actifs à 30 j (cohortes) | DB |
| Adoption fonctionnalités | % users ayant utilisé une feature clé (nav vocale, upload bulletin…) | events custom (`Voice Nav Used`, `Payslip Uploaded`…) |

### 4. Santé produit / qualité

| KPI | Définition | Source |
|---|---|---|
| Reloads chunk auto | erreurs de chunk Vite récupérées | `src/lib/chunkErrorHandler.ts` (à instrumenter) |
| Échecs nav vocale | commandes vocales non reconnues | event `Voice Nav Failed` |
