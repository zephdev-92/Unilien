# Intégration des Heures de Présence Responsable — Analyse & Idées

---

## 1. Rappel réglementaire (IDCC 3239)

### Présence responsable de jour (Art. 137.1)

- Le salarié reste vigilant mais peut vaquer à des occupations personnelles
- **Conversion : 1h de présence responsable = 2/3 h de travail effectif**
- Compte dans le calcul des heures hebdomadaires (après conversion)

### Présence responsable de nuit (Art. 148)

- Le salarié dort sur place dans une pièce séparée, intervient si besoin
- **Indemnité forfaitaire ≥ 1/4 du salaire contractuel horaire**
- Max **12h consécutives** de présence de nuit
- Max **5 nuits consécutives**
- **Requalification** : si ≥ 4 interventions par nuit → toute la plage est requalifiée en travail effectif (rémunéré 100%)

### Interventions pendant présence responsable

- Chaque intervention pendant une présence (jour ou nuit) est comptée en **travail effectif**
- Si présence de nuit + intervention → l'intervention bénéficie de la **majoration nuit de 20%** (acte de nuit)

---

## 2. État actuel de la modale (`NewShiftModal.tsx`)

| Élément | Présent | Commentaire |
|---|:---:|---|
| Sélection auxiliaire (contrat) | ✅ | — |
| Date / heure début / heure fin | ✅ | — |
| Durée de pause | ✅ | En minutes |
| Tâches (texte libre) | ✅ | Une par ligne |
| Notes | ✅ | — |
| Détection automatique nuit (21h-6h) | ✅ | — |
| Toggle "acte de nuit" | ✅ | Majoration 20% |
| **Type d'intervention** | ❌ | Pas de catégorisation |
| **Présence responsable** | ❌ | Pas de concept dédié |
| **Conversion 2/3** | ❌ | Pas de calcul |
| **Compteur d'interventions** | ❌ | Pas de suivi |

---

## 3. Idées d'intégration

### Idée A — Champ "Type d'intervention" (sélecteur)

Ajouter un **sélecteur de type** en haut du formulaire :

- **Travail effectif** (défaut) — comportement actuel inchangé
- **Présence responsable de jour** — active la conversion 2/3 et les champs associés
- **Présence responsable de nuit** — active l'indemnité forfaitaire, les limites, et le compteur d'interventions

> **Avantage** : Simple, clair, change dynamiquement les champs affichés selon le type.

### Idée B — Section "Présence responsable" conditionnelle

Au lieu d'un sélecteur global, ajouter un **toggle/switch** "Inclut une période de présence responsable" qui déplie une sous-section :

- Plage horaire de la présence responsable (peut être un sous-ensemble de l'intervention)
- Jour / Nuit (auto-détecté selon les heures, modifiable)
- Nombre d'interventions pendant la présence (pour le seuil de requalification nuit)

> **Avantage** : Permet de combiner travail effectif + présence responsable dans une même intervention (cas réel fréquent : 2h de soins le matin + 4h de présence responsable l'après-midi).

### Idée C — Calcul automatique affiché en temps réel

Quel que soit le choix (A ou B), afficher un **encart récapitulatif dynamique** :

```
┌─────────────────────────────────────────┐
│  Récapitulatif heures                   │
│  ─────────────────────────────────       │
│  Travail effectif :        2h00         │
│  Présence responsable :    3h00         │
│  → Équivalent travail :    2h00 (×2/3)  │
│  ─────────────────────────────────       │
│  Total travail effectif :  4h00         │
│  Majoration nuit :         +20% (1 acte)│
└─────────────────────────────────────────┘
```

> **Avantage** : Transparence totale pour l'employeur, conforme à l'obligation d'information.

### Idée D — Alerte de requalification (nuit)

Si le type est "présence responsable de nuit" et que le nombre d'interventions saisies ≥ 4 :

- **Alerte visuelle** (bannière orange/rouge) : *"Attention : ≥ 4 interventions — cette plage sera requalifiée en travail effectif selon l'article 148"*
- **Recalcul automatique** : bascule la conversion de 1/4 forfaitaire → 100% travail effectif
- Intégration avec le système de compliance existant (`useComplianceCheck`)

### Idée E — Validation des limites légales

Ajouter des validations dans `useComplianceCheck` :

- Présence de nuit **> 12h consécutives** → erreur bloquante
- Plus de **5 nuits consécutives** de présence → erreur bloquante
- Heures hebdomadaires (avec conversion 2/3) dépassant le plafond → alerte compliance

> Ces validations s'intégreraient naturellement dans le système existant qui bloque déjà la soumission en cas d'erreur compliance.

### Idée F — Impact sur le calcul de paie (`ComputedPay`)

Enrichir le modèle `ComputedPay` :

- Nouveau champ : `presenceResponsiblePay` (heures converties × taux horaire)
- Nouveau champ : `nightPresenceAllowance` (indemnité forfaitaire nuit)
- Le récapitulatif en bas de modale montrerait ces lignes supplémentaires

### Idée G — Champ "Interventions" pour la nuit (mini-journal)

Pour les présences de nuit, permettre de logger chaque intervention :

- Heure de début / fin de chaque intervention
- Nature (change, aide au lever, urgence…)
- Calcul automatique du nombre → seuil de requalification

> Rejoint le concept de cahier de liaison déjà existant dans l'app.

---

## 4. Proposition d'architecture UX recommandée

Combinaison recommandée : **A + C + D + E**

1. **Sélecteur de type** en haut (simple, 3 options) → Idée A
2. **Récapitulatif temps réel** des heures converties → Idée C
3. **Alerte requalification** si ≥ 4 interventions nuit → Idée D
4. **Validation compliance** des limites légales → Idée E

### Flux utilisateur envisagé

```
1. Sélection auxiliaire + date           → (comme aujourd'hui)
2. Type : [Travail effectif ▾] / [Présence resp. jour] / [Présence resp. nuit]
3. Heures début/fin                      → (comme aujourd'hui)
4. SI présence responsable jour :
   └─ Conversion 2/3 affichée automatiquement
5. SI présence responsable nuit :
   ├─ Champ "Nombre d'interventions" (0 par défaut)
   ├─ Si ≥ 4 → bannière requalification
   └─ Indemnité forfaitaire calculée
6. Récapitulatif heures + paie           → (enrichi)
7. Compliance check                      → (enrichi avec nouvelles règles)
8. Soumettre
```

---

## 5. Impact sur le modèle de données

Champs à ajouter au schéma `shifts` :

| Champ | Type | Description |
|---|---|---|
| `shift_type` | `enum('effective', 'presence_day', 'presence_night')` | Type d'intervention |
| `night_interventions_count` | `integer` (nullable) | Nombre d'interventions pendant présence nuit |
| `is_requalified` | `boolean` | Requalifié en travail effectif (auto-calculé) |
| `effective_hours` | `decimal` | Heures de travail effectif après conversion |

> Le champ existant `has_night_action` pourrait être conservé pour la rétro-compatibilité ou fusionné avec le nouveau modèle.

---

## 6. Points d'attention

- **Migration** : les interventions existantes (toutes de type "travail effectif" implicite) doivent être migrées avec `shift_type = 'effective'`
- **Rétro-compatibilité** : le calcul de paie actuel doit continuer à fonctionner pour les anciens shifts
- **Tests compliance** : les règles de compliance existantes (`src/lib/compliance/rules/`) devront être enrichies avec les nouvelles limites (12h consécutives nuit, 5 nuits max)
- **UX mobile** : la modale est utilisée en PWA sur mobile — le sélecteur de type doit rester simple et tactile
