# Accessibilité (a11y) — Unilien

**Dernière mise à jour :** 26 mars 2026

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
| Garde-fous automatisés | **À renforcer** — pas de `eslint-plugin-jsx-a11y` ; `@axe-core/react` présent mais non branché en dev |
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

7. **`AccessibleButton`** : intention explicite (focus visible, `aria-busy`, annonce de chargement).

8. **Formulaires d’authentification** : skip links vers le contenu principal.

---

## Écarts et risques

### Priorité moyenne

- **ESLint** : absence de règles `jsx-a11y` — risque de régressions (boutons sans nom, mauvais `tabIndex`, champs non étiquetés).

- **`@axe-core/react`** : dépendance dev non initialisée dans `main.tsx` — pas de signalement automatique des problèmes axe en développement.

- **`AccessibleButton`** : si `accessibleLabel` est défini, combinaison `aria-label` + `<VisuallyHidden>` avec le même texte peut entraîner une **double annonce** selon lecteur d’écran / navigateur. Préférer un seul mécanisme pour le nom accessible.

- **Skip link** : absent du layout connecté — tabulation longue avant le contenu sur certaines pages.

- **`RouteAnnouncer`** : `aria-live="assertive"` interrompt les annonces en cours ; évaluer `polite` si les retours utilisateurs indiquent une expérience trop agressive.

### Priorité faible

- **Couverture inégale** : planning, tableaux denses, modales héritées — à passer au clavier et/ou avec axe manuellement.

- **Avatars** : `Avatar.Image` souvent sans `alt` ; acceptable si redondant avec le texte à côté, à vérifier cas par cas.

- **Tests** : pas de suite systématique axe / navigation clavier sur les flux critiques (optionnel : `vitest-axe` ou scénarios RTL ciblés).

---

## Plan d’action recommandé

| # | Action | Effort |
|---|--------|--------|
| 1 | Ajouter `eslint-plugin-jsx-a11y` (preset recommandé) et traiter les erreurs bloquantes | Faible à moyen |
| 2 | Initialiser `@axe-core/react` uniquement si `import.meta.env.DEV` | Très faible |
| 3 | Corriger le double nom accessible dans `AccessibleButton` | Faible |
| 4 | Ajouter un skip link dans `DashboardLayout` vers `#contenu-principal` (ou équivalent) sur `<main>` | Faible |
| 5 | Audit manuel ou externe des parcours P1 (planning, messagerie, conformité) | Moyen |
| 6 | Optionnel : tests d’intégration avec règles axe sur 1–2 écrans représentatifs | Moyen |

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
npm run lint      # Aujourd’hui sans règles a11y dédiées
npm run test:run  # À compléter par des tests ciblés a11y si ajoutés
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
