# Redesign UI/UX — Unilien

> Document de cadrage pour la refonte visuelle et ergonomique.
> Les fonctionnalités existantes sont conservées à l'identique — seule la présentation change.

---

## Contexte & objectifs

Unilien s'adresse à des **personnes en situation de handicap** (employeurs) et à leurs **auxiliaires de vie**. Le design doit refléter cette mission : sobre, accessible, rassurant, professionnel.

**Objectifs du redesign** :
- Améliorer la lisibilité et la hiérarchie visuelle
- Unifier le langage visuel (espacements, typographie, couleurs)
- Améliorer l'ergonomie mobile (PWA)
- Renforcer l'accessibilité visuelle (contrastes, zones de clic, états focus)

---

## Ce qui ne change pas

| Domaine | Fichiers | Statut |
|---------|----------|--------|
| Logique métier | `src/services/`, `src/lib/` | ✅ Intouchable |
| Stores Zustand | `src/stores/` | ✅ Intouchable |
| Hooks | `src/hooks/` | ✅ Intouchable |
| Tests | `**/*.test.ts(x)` | ✅ Intouchable |
| Base de données | `supabase/migrations/` | ✅ Intouchable |
| Routing | `src/App.tsx` (structure) | ✅ Intouchable |

---

## Périmètre du redesign

### 1. Design System (point de départ)

**`src/styles/theme.ts`** — redéfinir les tokens :
- Palette de couleurs (brand, neutrals, sémantiques)
- Typographie (taille de base, échelle, poids)
- Espacements, border-radius, ombres
- Tokens dark mode si souhaité

**`src/index.css`** — styles globaux cohérents avec le nouveau thème

### 2. Composants UI de base

**`src/components/ui/`** — 6 composants à revoir :
- `AccessibleInput.tsx` — champ de saisie
- `AccessibleButton.tsx` — bouton principal
- `AccessibleSelect.tsx` — liste déroulante
- `PasswordToggleButton.tsx` — bouton mot de passe
- `DevelopmentBanner.tsx` — bannière dev

### 3. Navigation & Layout

**`src/components/dashboard/DashboardLayout.tsx`** — structure principale :
- Sidebar (desktop) : hiérarchie, icônes, état actif
- Menu mobile (overlay) : gestes, bottom nav éventuelle
- Header : breadcrumb, notifications, avatar

### 4. Pages & sections (64 composants)

Par ordre de priorité d'impact utilisateur :

| Priorité | Page / Section | Fichiers |
|----------|----------------|----------|
| 🔴 P1 | Auth (Login, Signup, ForgotPwd) | `src/components/auth/` |
| 🔴 P1 | Dashboard (3 rôles + widgets) | `src/components/dashboard/` |
| 🔴 P1 | Planning + modals | `src/components/planning/` |
| 🟡 P2 | Pointage (ClockIn) | `src/components/clock-in/` |
| 🟡 P2 | Équipe & Contrats | `src/components/team/` |
| 🟡 P2 | Profil & Settings | `src/components/profile/` |
| 🟢 P3 | Journal de bord | `src/components/logbook/` |
| 🟢 P3 | Cahier de liaison | `src/components/liaison/` |
| 🟢 P3 | Conformité | `src/components/compliance/` |
| 🟢 P3 | Documents & Bulletins | `src/components/documents/` |
| 🟢 P3 | Notifications | `src/components/notifications/` |

---

## Pistes de direction visuelle

À affiner selon les préférences — 3 directions possibles :

### Direction A — "Sobre & Professionnel"
- Palette : bleu marine (#1E2D40) + blanc cassé (#F8F9FA) + accent vert (#4CAF7D)
- Typographie : Inter (actuelle) avec échelle plus affirmée
- Cards avec ombres légères, coins légèrement arrondis (8px)
- Dense mais aéré : pas de superflu

### Direction B — "Chaleureux & Accessible"
- Palette : bleu doux (#4E6478, actuel) + beige (#F5F0E8) + vert olive (#9BB23B, actuel)
- Typographie : Plus grande base (18px), hauteur de ligne généreuse
- Cards arrondies (16px), grandes zones de clic
- Adapté aux utilisateurs avec déficiences motrices

### Direction C — "Moderne & Épuré"
- Palette : gris charcoal (#2D3748) + blanc pur + accent bleu électrique (#3B82F6)
- Typographie : poids léger pour les corps de texte, bold affirmé pour les titres
- Peu de cards, plus de listes et tableaux
- Interface "pro" type SaaS

---

## Approche recommandée

### Phase 1 — Design System (sprint 1)
1. Choisir la direction visuelle
2. Définir la palette complète dans `theme.ts`
3. Refaire les 5 composants UI de base
4. Valider visuellement sur Login + Dashboard

### Phase 2 — Navigation (sprint 1)
5. Revoir `DashboardLayout.tsx` (sidebar + header)
6. Tester sur mobile (PWA)

### Phase 3 — Pages P1 (sprint 2)
7. Auth (Login, Signup)
8. Dashboard (3 rôles + 6 widgets)
9. Planning

### Phase 4 — Pages P2/P3 (sprint 3-4)
10. ClockIn, Équipe, Profil, Logbook, Liaison, Compliance, Documents

---

## Contraintes techniques

- **Chakra UI v3** — rester dans le système de composants existant (pas de migration vers une autre lib)
- **Accessibilité** — maintenir les `aria-*` et `role` déjà en place, contrastes WCAG AA minimum
- **Tests** — les tests de composants existants ne doivent pas casser (structure HTML peut changer, comportement non)
- **PWA** — mobile-first, zones de clic ≥ 44×44px

---

## Questions ouvertes (à trancher avant de démarrer)

1. **Direction visuelle** : A, B ou C ? Ou autre idée ?
2. **Dark mode** : dans le scope ou pas ?
3. **Logo / identité** : refonte ou conservation ?
4. **Mockups** : Figma en amont ou directement en code ?

---

*Document créé le 19/02/2026 — À compléter lors du démarrage du sprint redesign.*
