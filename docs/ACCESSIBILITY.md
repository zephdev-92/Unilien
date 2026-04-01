# Accessibilité (a11y) — Unilien

**Dernière mise à jour :** 1er avril 2026

Document de référence sur l’état de l’accessibilité de la PWA Unilien (React 19, Chakra UI v3). Complète les notes dans `CLAUDE.md` et l’analyse qualité (`docs/CODE_QUALITY_2026-03-26.md`). Référencé depuis la section *Documentation disponible dans `docs/`* de `CLAUDE.md`.

---

## Objectifs cibles

- **WCAG 2.2** : viser le niveau **AA** sur les parcours critiques (authentification, navigation, planning, messagerie, paramètres).
- **Usage** : clavier seul, lecteurs d’écran courants, préférences système (réduction des animations, contraste).

---

## Synthèse

| Domaine | État |
|--------|------|
| Document (`lang`, titre de page) | Bon — `lang="fr"`, titres mis à jour à la navigation |
| Annonces SPA | Bon — `RouteAnnouncer` + `document.title` |
| Préférences utilisateur | Bon — contraste élevé, mouvement réduit, mode lecteur d’écran, texte agrandi |
| Focus visible | Bon — règles globales dans `index.css` + renforts Chakra ponctuels |
| Garde-fous automatisés | ✅ Bon — `eslint-plugin-jsx-a11y` activé (PR #210) ; `@axe-core/react` branché en dev (PR #210) |
| Skip links | Partiel — formulaires d’auth uniquement ; pas sur le shell connecté |
| Couverture homogène | Variable — zones très documentées (`SettingsPage`, `DashboardLayout`, notifications) vs reste à valider manuellement ou par outils |

---

## Points forts (implémentés)

1. **`index.html`** : `lang="fr"` sur `<html>`.

2. **`AccessibilityApplier` (`App.tsx`)** : application sur `<html>` de `data-high-contrast`, `data-reduced-motion`, `data-screen-reader` et échelle de police selon le store d’accessibilité.

3. **`index.css`** :
   - `:focus-visible` avec contour visible (marque) ;
   - `@media (prefers-reduced-motion: reduce)` pour réduire animations / transitions ;
   - styles sous `[data-high-contrast]`, `[data-reduced-motion]`, `[data-screen-reader]` ;
   - classe `.skip-link` pour liens d’évitement.

4. **`RouteAnnouncer`** : mise à jour du titre (`WCAG 2.4.2`) et région `aria-live` pour annoncer les changements de route (`WCAG 4.1.3`).

5. **Composants** : usage répandu de `aria-label`, `aria-live`, `role="status"` / `dialog`, `aria-expanded` / `aria-controls`, `aria-current` sur la nav, icônes décoratives en `aria-hidden`.

6. **`DashboardLayout`** : `role="banner"`, navigation avec libellés accessibles, zone principale en `<main>`.

7. **`AccessibleButton`** : intention explicite (focus visible, `aria-busy`, annonce de chargement). Double annonce corrigée — `VisuallyHidden` redondant supprimé, `aria-label` seul utilisé (PR #210).

8. **Formulaires d’authentification** : skip links vers le contenu principal.

9. **`@axe-core/react`** : initialisé dans `main.tsx` en mode DEV uniquement — signale les violations axe dans la console du navigateur (PR #210).

10. **`eslint-plugin-jsx-a11y`** : preset recommandé activé dans `eslint.config.js` — détecte les problèmes d’accessibilité à la compilation (PR #210).

---

## Écarts et risques

### ✅ Corrigés (PR #210 — 1er avril 2026)

- ~~**ESLint** : absence de règles `jsx-a11y`~~ → `eslint-plugin-jsx-a11y` preset recommandé activé.
- ~~**`@axe-core/react`** : non initialisé~~ → branché dans `main.tsx` (`import.meta.env.DEV`).
- ~~**`AccessibleButton`** : double annonce `aria-label` + `VisuallyHidden`~~ → `VisuallyHidden` supprimé, `aria-label` seul suffit.
- ~~**`autoFocus`** dans `SettingsPage` (zone de danger)~~ → supprimé (erreur jsx-a11y).

### Priorité moyenne (restant)

- **Skip link** : absent du layout connecté — tabulation longue avant le contenu sur certaines pages.

- **`RouteAnnouncer`** : `aria-live="assertive"` interrompt les annonces en cours ; évaluer `polite` si les retours utilisateurs indiquent une expérience trop agressive.

### Priorité faible

- **Couverture inégale** : planning, tableaux denses, modales héritées — à passer au clavier et/ou avec axe manuellement.

- **Avatars** : `Avatar.Image` souvent sans `alt` ; acceptable si redondant avec le texte à côté, à vérifier cas par cas.

- **Tests** : pas de suite systématique axe / navigation clavier sur les flux critiques (optionnel : `vitest-axe` ou scénarios RTL ciblés).

---

## Plan d’action

| # | Action | Effort | Statut |
|---|--------|--------|--------|
| 1 | Ajouter `eslint-plugin-jsx-a11y` et traiter les erreurs bloquantes | Faible à moyen | ✅ PR #210 |
| 2 | Initialiser `@axe-core/react` en mode DEV | Très faible | ✅ PR #210 |
| 3 | Corriger le double nom accessible dans `AccessibleButton` | Faible | ✅ PR #210 |
| 4 | Ajouter un skip link dans `DashboardLayout` vers `#contenu-principal` | Faible | 🔲 À faire |
| 5 | Audit manuel parcours P1 (planning, messagerie, conformité) | Moyen | 🔲 À faire |
| 6 | Tests d’intégration avec règles axe sur 1–2 écrans représentatifs | Moyen | 🔲 À faire |

---

## Fichiers clés à consulter

| Fichier | Rôle |
|---------|------|
| `index.html` | Langue de la page |
| `src/main.tsx` | Bootstrap ; emplacement possible pour axe (dev) |
| `src/index.css` | Focus, skip link, modes `data-*` |
| `src/App.tsx` | `AccessibilityApplier`, routes |
| `src/components/accessibility/RouteAnnouncer.tsx` | Titres et annonces de navigation |
| `src/components/ui/AccessibleButton.tsx` | Bouton avec états accessibles |
| `src/components/dashboard/DashboardLayout.tsx` | Shell, nav, `<main>` |

---

## Commandes utiles

```bash
npm run lint      # Inclut eslint-plugin-jsx-a11y (preset recommandé)
npm run test:run  # À compléter par des tests ciblés a11y si ajoutés
# En dev : @axe-core/react signale les violations dans la console navigateur
```

---

## Références externes

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) (W3C)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [@axe-core/react](https://github.com/dequelabs/axe-core-npm)

---

## Voir aussi

- `CLAUDE.md` — contexte projet et préférences (UI en français, stack)
- `docs/CODE_QUALITY_2026-03-26.md` — mention ESLint / a11y
- `docs/DESIGN_REDESIGN.md` — redesign UI (à croiser avec critères a11y lors des changements visuels)
