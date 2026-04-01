# Analytics & Cookies de performance — Plan d'implémentation

> Statut : **En attente** — les toggles sont présents dans Paramètres > Données (badge "Bientôt")

---

## Contexte

Unilien n'a actuellement aucun système d'analytics ni de cookies de performance.
Les toggles de confidentialité dans la page Paramètres sont désactivés en attendant l'implémentation.

Quand un outil sera choisi, les préférences utilisateur seront persistées en DB (table `privacy_settings`) et les toggles seront activés.

---

## Options analytics recommandées

| Outil | Cookies | RGPD | Hébergement | Prix |
|-------|---------|------|-------------|------|
| **Plausible** | Aucun (cookieless) | Conforme sans bandeau | Cloud ou self-hosted | 9€/mois (cloud) ou gratuit (self-hosted) |
| **PostHog** | Optionnels | Configurable | Cloud ou self-hosted | Gratuit < 1M events/mois |
| **Umami** | Aucun (cookieless) | Conforme sans bandeau | Self-hosted uniquement | Gratuit |

### Recommandation : Plausible (self-hosted)

- **Cookieless** → pas besoin du toggle cookies, pas de bandeau CNIL supplémentaire
- **Léger** → script < 1 KB, aucun impact sur les performances
- **RGPD natif** → pas de données personnelles collectées, pas de tracking cross-site
- **Self-hosted** → gratuit, données sous ton contrôle (Docker)
- Dashboard simple et lisible (pages vues, sources, pays, devices)

---

## Implémentation technique

### 1. Installer Plausible (self-hosted)

```bash
# Docker Compose (serveur séparé ou même VPS que Supabase)
git clone https://github.com/plausible/community-edition plausible-ce
cd plausible-ce
# Configurer plausible-conf.env (BASE_URL, SECRET_KEY_BASE)
docker compose up -d
```

### 2. Ajouter le script conditionnel dans Unilien

```tsx
// src/components/Analytics.tsx
import { usePrivacySettings } from '@/hooks/usePrivacySettings'

export function Analytics() {
  const { analytics } = usePrivacySettings()

  if (!analytics) return null

  return (
    <script
      defer
      data-domain="app.unilien.fr"
      src="https://plausible.ton-domaine.fr/js/script.js"
    />
  )
}
```

```tsx
// src/App.tsx — ajouter dans le layout
<Analytics />
```

### 3. Activer les toggles confidentialité

Quand Plausible est opérationnel :

1. Créer la migration `privacy_settings` (table + RLS)
2. Créer service + store + hook (pattern identique à `conventionSettings`)
3. Retirer le badge "Bientôt" et `disabled` sur les toggles
4. Le composant `<Analytics />` lit la préférence et charge/ne charge pas le script

> Le toggle "Cookies de performance" peut être supprimé si Plausible est utilisé (cookieless).
> Le garder uniquement si un autre outil nécessitant des cookies est ajouté plus tard.

### 4. Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/049_privacy_settings.sql` | Créer table |
| `src/types/database.ts` | Ajouter `PrivacySettingsDbRow` |
| `src/services/privacySettingsService.ts` | Créer (get/upsert) |
| `src/stores/privacySettingsStore.ts` | Créer (Zustand double persistance) |
| `src/hooks/usePrivacySettings.ts` | Créer (wrapper réactif) |
| `src/components/Analytics.tsx` | Créer (chargement conditionnel) |
| `src/pages/SettingsPage.tsx` | Activer toggles |
| `src/App.tsx` | Ajouter `<Analytics />` |

---

## Cookies de performance

Unilien n'utilise actuellement aucun cookie de performance :
- **Vite** : aucun cookie en production
- **Supabase Auth** : cookie de session (`sb-*-auth-token`) — déjà documenté dans LegalPage
- **PWA Service Worker** : cache runtime, pas de cookies

Le toggle "Cookies de performance" n'a de sens que si un outil futur en pose (ex: CDN analytics, A/B testing).

---

## Conformité RGPD

### Avec Plausible (cookieless)
- Pas de consentement requis (exemption CNIL pour les outils de mesure d'audience sans cookies)
- Le toggle analytics reste une bonne pratique (opt-out volontaire)
- Pas de transfert hors UE si self-hosted

### Avec PostHog (si cookies activés)
- Consentement requis avant chargement du script
- Bandeau cookies à implémenter
- Toggle obligatoire et bloquant

---

## Estimation

| Tâche | Effort |
|-------|--------|
| Setup Plausible self-hosted (Docker) | ~1h |
| Composant `<Analytics />` + hook | ~30min |
| Migration DB + service + store | ~30min (code déjà préparé) |
| Activation toggles Settings | ~15min |
| **Total** | **~2h** |

---

## Prérequis

- Un serveur/VPS pour héberger Plausible (ou utiliser le cloud à 9€/mois)
- Un domaine/sous-domaine pour le dashboard (ex: `plausible.unilien.fr`)
