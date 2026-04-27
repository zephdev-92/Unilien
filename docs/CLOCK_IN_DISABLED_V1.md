# Pointage désactivé en v1 — note de décision

> Statut : **Actif**
> Date : 27/04/2026
> Référence PR : #312
> Spec de remplacement : [`QR_CLOCKIN_IMPLEMENTATION.md`](./QR_CLOCKIN_IMPLEMENTATION.md) (PR #311)

---

## Contexte

Lors de la réunion du 16/04/2026, Marie a remonté que le pointage actuel n'est **pas fiable** : un auxi peut valider "j'ai commencé à 13h00" alors qu'elle n'est pas encore physiquement chez le bénéficiaire. Aucune vérification de présence.

L'équipe a décidé de **retirer le pointage de la v1** plutôt que de livrer une fonctionnalité que les utilisateurs ne pourront pas utiliser sereinement (paie injuste, pas de preuve en cas de litige, perte de confiance employeur).

Le pointage **réapparaîtra** quand le système de pointage par QR code (cf. `QR_CLOCKIN_IMPLEMENTATION.md`) sera livré.

---

## Ce qui est désactivé

L'UI uniquement, via le feature flag `FEATURES.clockIn` dans `src/lib/featureFlags.ts`.

8 points d'entrée :

| Surface | Fichier | Comportement quand `clockIn = false` |
|---------|---------|--------------------------------------|
| Route `/suivi-des-heures` | `src/App.tsx` | N'est plus déclarée (URL directe → 404 / fallback) |
| Item nav "Suivi des heures" / "Mes heures" | `src/components/dashboard/DashboardLayout.tsx` | Retiré du menu Gestion |
| `ClockInWidget` dashboard auxi | `src/components/dashboard/EmployeeDashboard.tsx` | Cellule de grille supprimée, Messages + Documents remontent d'une row pour combler le trou |
| `ClockInWidget` dashboard aidant | `src/components/dashboard/CaregiverDashboard.tsx` | Retiré (desktop + mobile) |
| Quick action "Pointer" | `src/components/dashboard/widgets/QuickActionsWidget.tsx` | Filtré du tableau d'actions employee (3 actions au lieu de 4) |
| CTA WelcomeCard | `src/components/dashboard/widgets/WelcomeCard.tsx` | Pointe systématiquement vers `/planning` au lieu de `/suivi-des-heures` |
| Bouton "Pointer" modal planning | `src/components/planning/ShiftDetailModal.tsx` | Caché sur les interventions `planned` du rôle employee |
| Section FAQ "Enregistrement des heures" | `src/pages/HelpPage.tsx` | Retirée du sommaire et du contenu |
| Entrée recherche globale | `src/services/searchService.ts` | Retirée de `NAV_PAGES` |

---

## Ce qui n'est PAS supprimé

Aucun composant, service, hook, type, table DB ou test n'a été supprimé. La réactivation est triviale et ne nécessite aucune migration.

- `src/components/clock-in/` → intact (`ClockInPage`, `EmployeeClockWidget`, `ClockInTodaySection`, `ManualEntryForm`, `MonthSummary`, `DateNavigator`, `RetroactiveEntryForm`, etc.)
- `src/components/dashboard/widgets/ClockInWidget.tsx` → intact, juste plus rendu
- `src/services/clockInService.ts` → intact
- Table `clock_in_entries` Supabase → **inchangée**, données utilisateur préservées
- Tests `src/components/clock-in/*.test.*` → **continuent de tourner en CI** (couvrent toujours les composants désactivés)

Les seuls tests qui ont été touchés sont ceux qui assertent la **présence** du pointage dans des composants partagés (dashboards, quick actions, route principale). Ils sont en `it.skip` avec un commentaire pointant vers le flag.

---

## Comment réactiver

### Étape 1 — Flip le flag

```ts
// src/lib/featureFlags.ts
export const FEATURES = {
- clockIn: false,
+ clockIn: true,
} as const
```

C'est suffisant pour rebrancher toutes les surfaces UI.

### Étape 2 — Réactiver les tests

Retirer les `it.skip` (4 specs) et restaurer les assertions :

| Fichier | Test |
|---------|------|
| `src/App.test.tsx` | `affiche /suivi-des-heures pour un employé` |
| `src/components/dashboard/EmployeeDashboard.test.tsx` | `affiche le ClockInWidget` |
| `src/components/dashboard/CaregiverDashboard.test.tsx` | `affiche le ClockInWidget avec variant warm` |
| `src/components/dashboard/widgets/QuickActionsWidget.test.tsx` | `le lien 'Pointer' pointe vers /suivi-des-heures` |

Le test `affiche les actions employee (sans Pointer tant que FEATURES.clockIn = false)` doit également être réécrit pour ré-asserter la présence de "Pointer" et le compteur de 4 actions.

### Étape 3 — Vérifier la grille employee dashboard

Le fix ad hoc dans `EmployeeDashboard.tsx` (lignes `gridRow={{ lg: FEATURES.clockIn ? '5' : '4' }}` etc.) **continue de marcher** dès que le flag passe à `true` — les rows aside reprennent leurs valeurs d'origine. Aucune modification supplémentaire nécessaire à ce niveau.

Si on souhaite simplifier à terme : retirer les conditions ternaires dans les `gridRow` aside et revenir aux valeurs littérales `'5'` et `'6'`.

---

## Si la réactivation est définitive

Une fois le QR code livré et le flag passé à `true` durablement :

1. Supprimer entièrement `src/lib/featureFlags.ts` (ou y ajouter d'autres flags, mais `clockIn` peut disparaître)
2. Retirer les imports `FEATURES` et les conditions de tous les fichiers listés ci-dessus
3. Restaurer les `gridRow` littérales dans `EmployeeDashboard.tsx`
4. Supprimer ce fichier de doc (`CLOCK_IN_DISABLED_V1.md`) — il n'a plus d'utilité

---

## Ne pas se planter

- **Ne jamais supprimer la table `clock_in_entries` côté DB** tant que le flag est en transition. Si des utilisateurs ont déjà pointé avant la désactivation, leurs données doivent être préservées.
- **Ne pas merger ce flag avec d'autres feature flags futurs sans review** — c'est volontairement minimaliste, ajouter de la logique (env vars, config dynamique) demande un cadrage produit.
- **Ne pas réactiver partiellement** (par ex. juste le menu sans la route) — soit tout, soit rien, sinon on crée des liens cassés.
