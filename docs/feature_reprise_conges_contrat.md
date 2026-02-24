# Feature : Reprise du solde de congés à la création d'un contrat antérieur

> **Date** : 13/02/2026
> **Statut** : Analyse / Proposition
> **Impact** : `NewContractModal`, `contractService`, `leaveBalanceService`, `leave_balances` (Supabase)

---

## 1. Contexte et problème identifié

### Situation actuelle

Lorsqu'un employeur crée un contrat pour une auxiliaire de vie dans Unilien, le formulaire (`NewContractModal.tsx`) demande :

| Champ             | Type     | Description                         |
|-------------------|----------|-------------------------------------|
| `contractType`    | CDI/CDD  | Type de contrat                     |
| `startDate`       | date     | Date de début du contrat            |
| `endDate`         | date     | Date de fin (CDD uniquement)        |
| `weeklyHours`     | number   | Heures hebdomadaires contractuelles |
| `hourlyRate`      | number   | Taux horaire brut (€)              |

Le système de congés (`leaveBalanceService.ts`) initialise le solde **de manière paresseuse** (lazy), c'est-à-dire **uniquement lors de la première demande d'absence** de type congé payé. L'initialisation se fait via `initializeLeaveBalance()` qui appelle `calculateAcquiredDays()`.

### Le calcul automatique actuel

```
calculateAcquiredDays(contract, leaveYearStart, today)
```

Ce calcul :
1. Prend le **max(date début contrat, début de l'année de congés)** comme point de départ
2. Compte les **jours ouvrables** (lundi-samedi, hors dimanches et jours fériés) jusqu'à aujourd'hui
3. Divise par 24 (24 jours ouvrables = 1 mois de travail effectif, Art. L3141-4)
4. Multiplie par 2,5 jours/mois (Art. L3141-3)
5. Plafonne à 30 jours/an et arrondit à l'entier supérieur (Art. L3141-7)

### Le problème

Quand un employeur crée un contrat avec une **date de début antérieure à aujourd'hui** (ex: l'auxiliaire travaille depuis 6 mois mais l'employeur vient de s'inscrire sur Unilien), **deux informations sont perdues** :

| Information manquante | Impact |
|---|---|
| **Jours réellement travaillés** | Le calcul automatique suppose que l'auxiliaire a travaillé chaque jour ouvrable depuis la date de début, ce qui est faux si elle a eu des interruptions, ou si elle ne travaillait pas tous les jours. |
| **Congés déjà pris** | `taken_days` est toujours initialisé à **0**, ce qui gonfle artificiellement le solde restant si l'auxiliaire a déjà pris des congés avant son inscription sur Unilien. |

**Conséquence** : Le solde de congés affiché est faux. L'auxiliaire pourrait apparaître avec plus de jours acquis qu'en réalité, et aucun congé déjà pris n'est comptabilisé.

---

## 2. Solution proposée

### 2.1 Principe

Lorsque la **date de début du contrat est antérieure à aujourd'hui**, afficher une section optionnelle « Reprise de l'historique congés » dans le formulaire de création de contrat, avec :

1. **Nombre de mois effectivement travaillés** → pour calculer les jours acquis
2. **Nombre de jours de congés déjà pris** → pour initialiser `taken_days`
3. **Solde cumulé** (lecture seule, calculé automatiquement) → `acquis - pris`

### 2.2 Schéma du flux

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Création de contrat                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Étape 1 : Recherche auxiliaire (existant)                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Étape 2 : Détails du contrat (existant)                    │   │
│  │  • Type CDI/CDD                                              │   │
│  │  • Date de début ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │   │
│  │  • Date de fin (CDD)               │ Si date < aujourd'hui  │   │
│  │  • Heures/semaine                  ▼                         │   │
│  │  • Taux horaire         ┌────────────────────────┐          │   │
│  │                         │ Section NOUVELLE        │          │   │
│  │                         │ « Reprise historique »  │          │   │
│  │                         │                         │          │   │
│  │                         │ • Mois travaillés  [__] │          │   │
│  │                         │ • CP déjà acquis   [__] │ auto     │   │
│  │                         │ • CP déjà pris     [__] │          │   │
│  │                         │ • Solde cumulé     [__] │ auto     │   │
│  │                         └────────────────────────┘          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Création contrat + Initialisation solde congés              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Détail des champs proposés

| Champ | Nom technique | Type | Requis | Description |
|---|---|---|---|---|
| **Mois travaillés** | `monthsWorked` | `number` (0-12) | Optionnel (défaut: calcul auto) | Nombre de mois complets effectivement travaillés depuis la date de début du contrat. Si non renseigné, le système calcule automatiquement à partir des jours ouvrables. |
| **CP déjà acquis** | `initialAcquiredDays` | `number` (lecture seule) | Auto-calculé | `= min(monthsWorked × 2.5, 30)`, arrondi supérieur. |
| **CP déjà pris** | `initialTakenDays` | `number` (0-30) | Optionnel (défaut: 0) | Nombre de jours de congés payés déjà pris par l'auxiliaire avant l'inscription sur Unilien. |
| **Solde cumulé** | `leaveBalance` | `number` (lecture seule) | Auto-calculé | `= acquis - pris`. Affiché en temps réel. |

### 2.4 Règles métier

#### Détection de la date antérieure

```typescript
const startDate = contractForm.watch('startDate')
const isRetroactive = startDate && new Date(startDate) < new Date()
```

La section « Reprise historique » n'apparaît **que si** `isRetroactive === true`.

#### Calcul automatique des mois travaillés (valeur par défaut)

Si l'employeur ne renseigne pas `monthsWorked`, on calcule automatiquement :

```typescript
function calculateDefaultMonthsWorked(startDate: Date): number {
  const today = new Date()
  const workingDays = countWorkingDays(startDate, today)
  return Math.floor(workingDays / 24) // 24 jours ouvrables = 1 mois
}
```

L'employeur peut **ajuster** cette valeur (ex : si l'auxiliaire n'a pas travaillé certains mois, si elle a été en maladie, etc.).

#### Calcul des jours acquis

```typescript
function calculateAcquiredFromMonths(months: number): number {
  return Math.ceil(Math.min(months * 2.5, 30))
}
```

Conforme à :
- **Art. L3141-3** : 2,5 jours ouvrables / mois de travail effectif
- **Art. L3141-7** : Arrondi à l'entier supérieur
- **Art. L3141-4** : 24 jours ouvrables = 1 mois effectif

#### Validation

```typescript
const retroSchema = z.object({
  monthsWorked: z.coerce.number()
    .min(0, 'Minimum 0 mois')
    .max(12, 'Maximum 12 mois par année de congés'),
  initialTakenDays: z.coerce.number()
    .min(0, 'Minimum 0 jours')
    .max(30, 'Maximum 30 jours'),
}).refine(
  (data) => {
    const acquired = Math.ceil(Math.min(data.monthsWorked * 2.5, 30))
    return data.initialTakenDays <= acquired
  },
  {
    message: 'Les jours pris ne peuvent pas dépasser les jours acquis',
    path: ['initialTakenDays'],
  }
)
```

---

## 3. Impact technique

### 3.1 Fichiers à modifier

| Fichier | Modification |
|---|---|
| `src/components/team/NewContractModal.tsx` | Ajouter la section « Reprise historique » conditionnelle + champs + calcul auto |
| `src/services/contractService.ts` | Étendre `ContractCreateData` avec `initialMonthsWorked?`, `initialTakenDays?` |
| `src/services/auxiliaryService.ts` | Passer les données de reprise à `createContract` |
| `src/services/leaveBalanceService.ts` | Modifier `initializeLeaveBalance` pour accepter un override des valeurs `acquiredDays` et `takenDays` |
| `src/types/index.ts` | (optionnel) Ajouter les champs dans le type si persistés côté contrat |

### 3.2 Modifications détaillées

#### A. `ContractCreateData` (contractService.ts)

```typescript
interface ContractCreateData {
  contractType: 'CDI' | 'CDD'
  startDate: Date
  endDate?: Date
  weeklyHours: number
  hourlyRate: number
  // NOUVEAU : reprise historique congés
  initialMonthsWorked?: number   // Mois effectivement travaillés
  initialTakenDays?: number      // Jours de CP déjà pris
}
```

#### B. `createContract` (contractService.ts)

Après la création du contrat, si `initialMonthsWorked` est fourni, initialiser immédiatement le solde de congés :

```typescript
// Après la création réussie du contrat...
if (contractData.initialMonthsWorked !== undefined) {
  const leaveYear = getLeaveYear(contractData.startDate)
  const acquiredDays = Math.ceil(
    Math.min(contractData.initialMonthsWorked * 2.5, 30)
  )
  
  await initializeLeaveBalanceWithOverride(
    data.id,       // contractId
    employeeId,
    employerId,
    leaveYear,
    acquiredDays,
    contractData.initialTakenDays || 0
  )
}
```

#### C. `initializeLeaveBalanceWithOverride` (leaveBalanceService.ts)

Nouvelle fonction (ou paramètre optionnel dans l'existante) :

```typescript
export async function initializeLeaveBalanceWithOverride(
  contractId: string,
  employeeId: string,
  employerId: string,
  leaveYear: string,
  acquiredDays: number,
  takenDays: number
): Promise<LeaveBalance | null> {
  const { data, error } = await supabase
    .from('leave_balances')
    .upsert({
      contract_id: contractId,
      employee_id: employeeId,
      employer_id: employerId,
      leave_year: leaveYear,
      acquired_days: acquiredDays,
      taken_days: takenDays,
      adjustment_days: 0,
    }, { onConflict: 'contract_id,leave_year' })
    .select()
    .single()

  if (error) {
    logger.error('Erreur initialisation solde congés (override):', error)
    return null
  }

  return mapLeaveBalanceFromDb(data)
}
```

#### D. `NewContractModal.tsx` — Section conditionnelle

Pseudo-code UI :

```tsx
{isRetroactive && (
  <Box p={4} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
    <Text fontWeight="semibold" mb={3} color="blue.700">
      📋 Reprise de l'historique congés
    </Text>
    <Text fontSize="sm" color="gray.600" mb={4}>
      La date de début est antérieure à aujourd'hui. Renseignez l'historique
      pour un solde de congés correct.
    </Text>
    
    <Flex gap={4}>
      <AccessibleInput
        label="Mois effectivement travaillés"
        type="number"
        min={0}
        max={12}
        helperText={`Suggestion: ${suggestedMonths} mois (calcul auto)`}
        {...contractForm.register('monthsWorked')}
      />
      <AccessibleInput
        label="CP déjà pris (jours)"
        type="number"
        min={0}
        max={30}
        helperText="Jours de congés déjà utilisés"
        {...contractForm.register('initialTakenDays')}
      />
    </Flex>

    {/* Récapitulatif congés */}
    <Box mt={3} p={3} bg="white" borderRadius="md">
      <Text fontSize="sm" fontWeight="medium">Solde de congés calculé :</Text>
      <Flex justify="space-between" mt={1}>
        <Text fontSize="sm" color="gray.600">
          Jours acquis : <strong>{acquiredDays}</strong>
        </Text>
        <Text fontSize="sm" color="gray.600">
          Jours pris : <strong>{takenDays}</strong>
        </Text>
        <Text fontSize="sm" fontWeight="bold" color={balance >= 0 ? 'green.600' : 'red.600'}>
          Solde : {balance} jours
        </Text>
      </Flex>
    </Box>
  </Box>
)}
```

### 3.3 Base de données

**Aucune migration requise.** La table `leave_balances` existe déjà avec les colonnes `acquired_days`, `taken_days` et `adjustment_days`. L'initialisation se fera via la même structure.

Optionnellement, on peut ajouter une colonne `is_manual_init` (boolean, défaut `false`) dans `leave_balances` pour tracer les soldes initialisés manuellement lors de la reprise :

```sql
ALTER TABLE leave_balances 
ADD COLUMN is_manual_init BOOLEAN DEFAULT FALSE;
```

Cela permettrait :
- De différencier les soldes calculés automatiquement vs renseignés manuellement
- D'auditer/revalider les reprises manuelles plus tard

---

## 4. Scénarios d'utilisation

### Scénario 1 — Contrat récent, pas de reprise

| Action | Résultat |
|---|---|
| Employeur crée un contrat avec `startDate = aujourd'hui` | Section « Reprise historique » **masquée** |
| Auxiliaire demande des congés plus tard | `initializeLeaveBalance` calcule automatiquement |

**Aucun changement par rapport au comportement actuel.**

### Scénario 2 — Contrat antérieur, reprise complète

| Action | Résultat |
|---|---|
| Employeur crée un contrat avec `startDate = 01/09/2025` | Section « Reprise historique » **affichée** |
| Il saisit `monthsWorked = 5` | Calcul auto : `5 × 2.5 = 12.5 → 13 jours acquis` |
| Il saisit `initialTakenDays = 3` | Solde affiché : `13 - 3 = 10 jours` |
| Validation et création | Contrat créé + `leave_balances` initialisé avec `acquired=13, taken=3` |

### Scénario 3 — Contrat antérieur, reprise partielle (mois travaillés uniquement)

| Action | Résultat |
|---|---|
| Employeur crée un contrat avec `startDate = 01/06/2025` | Section affichée, suggestion : ~8 mois |
| Il saisit `monthsWorked = 6` (elle a eu 2 mois d'interruption) | `6 × 2.5 = 15 jours acquis` |
| Il laisse `initialTakenDays = 0` | Solde : `15 jours` |
| Création | `leave_balances` initialisé avec `acquired=15, taken=0` |

### Scénario 4 — Contrat antérieur, pas de reprise (employeur skip)

| Action | Résultat |
|---|---|
| Employeur crée un contrat avec `startDate = 01/01/2026` | Section affichée mais non remplie |
| Il ne saisit rien et valide | Contrat créé sans initialisation du solde |
| Auxiliaire demande des congés plus tard | `initializeLeaveBalance` calcule automatiquement (comportement actuel) |

**Fallback : le comportement actuel est préservé.**

---

## 5. UX / Design

### Principes

1. **Non-bloquant** : La section est informative et optionnelle. L'employeur peut ignorer et créer le contrat quand même.
2. **Guidé** : Une suggestion (calcul automatique) est proposée par défaut pour les mois travaillés.
3. **Transparence** : Le solde calculé est affiché en temps réel pour que l'employeur vérifie avant de valider.
4. **Cohérence** : Le design suit le même style que le récapitulatif mensuel existant (fond gris, texte structuré).

### Wireframe simplifié

```
┌─────────────────────────────────────────────────────────┐
│  📋 Reprise de l'historique congés                      │
│  ─────────────────────────────────────────────────────  │
│  La date de début est antérieure à aujourd'hui.         │
│  Renseignez l'historique pour un solde de congés        │
│  correct.                                               │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ Mois travaillés  │  │ CP déjà pris     │            │
│  │ [    5         ] │  │ [    3         ] │            │
│  │ Suggestion: 5    │  │ Jours utilisés   │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Acquis: 13 j  │  Pris: 3 j  │  Solde: 10 j   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Considérations légales (IDCC 3239)

| Règle | Référence | Application |
|---|---|---|
| 2,5 jours ouvrables / mois travaillé | Art. L3141-3 | Base du calcul d'acquisition |
| 24 jours ouvrables = 1 mois | Art. L3141-4 | Conversion jours → mois |
| Maximum 30 jours/an | Art. L3141-3 | Plafond du champ `monthsWorked × 2.5` |
| Arrondi à l'entier supérieur | Art. L3141-7 | `Math.ceil()` appliqué |
| Année de congés : 1er juin → 31 mai | Convention | Période de référence utilisée |

### Note importante

La reprise manuelle ne remplace pas l'obligation de l'employeur de tenir un registre des congés. Unilien facilite la gestion mais l'employeur reste responsable de l'exactitude des données saisies. Un avertissement pourrait être affiché :

> *« Les informations saisies engagent votre responsabilité en tant qu'employeur. En cas de doute, référez-vous aux bulletins de salaire précédents. »*

---

## 7. Tests à prévoir

### Tests unitaires

| Test | Fichier | Description |
|---|---|---|
| `calculateAcquiredFromMonths(0)` → 0 | `balanceCalculator.test.ts` | Aucun mois travaillé |
| `calculateAcquiredFromMonths(1)` → 3 | `balanceCalculator.test.ts` | 1 mois → `ceil(2.5)` = 3 |
| `calculateAcquiredFromMonths(12)` → 30 | `balanceCalculator.test.ts` | 12 mois → 30 (plafond) |
| `calculateAcquiredFromMonths(13)` → 30 | `balanceCalculator.test.ts` | >12 mois → plafond respecté |
| Validation: `takenDays <= acquiredDays` | `NewContractModal.test.tsx` | Refus si pris > acquis |
| Création avec reprise → `leave_balances` initialisé | `contractService.test.ts` | Vérifie l'init immédiate |
| Création sans reprise → pas d'init | `contractService.test.ts` | Comportement actuel préservé |

### Tests d'intégration

| Test | Description |
|---|---|
| Créer contrat antérieur avec reprise | Vérifier que le solde correct apparaît dans le planning |
| Créer contrat antérieur sans reprise | Vérifier le fallback (calcul auto à la 1ère demande) |
| Demander des congés après reprise | Vérifier que le solde tient compte de la reprise |

---

## 8. Estimation effort

| Tâche | Complexité | Estimation |
|---|---|---|
| Modifier `NewContractModal.tsx` (UI + logique) | Moyenne | ~2h |
| Modifier `contractService.ts` + `auxiliaryService.ts` | Faible | ~1h |
| Ajouter `initializeLeaveBalanceWithOverride` | Faible | ~30min |
| Tests unitaires (calcul + validation) | Moyenne | ~1h30 |
| Tests composant (modal) | Moyenne | ~1h |
| Migration DB optionnelle (`is_manual_init`) | Faible | ~15min |
| **Total** | | **~6h15** |

---

## 9. Résumé des recommandations

1. **Implémenter la section conditionnelle** dans `NewContractModal.tsx` qui apparaît uniquement quand `startDate < today`.

2. **Deux champs saisie** : `monthsWorked` (avec suggestion auto) et `initialTakenDays` (défaut 0).

3. **Affichage temps réel** du solde calculé (`acquis - pris`).

4. **Initialisation immédiate** du `leave_balances` à la création du contrat (au lieu d'attendre la première demande d'absence).

5. **Fallback préservé** : si l'employeur ne remplit pas la section, le comportement actuel (calcul lazy) reste inchangé.

6. **Migration optionnelle** : colonne `is_manual_init` pour traçabilité d'audit.

7. **Avertissement légal** : rappeler à l'employeur sa responsabilité sur l'exactitude des données.

---

## 10. Questions ouvertes

| # | Question | Impact |
|---|---|---|
| 1 | Faut-il permettre la **modification du solde après création** ? (page détail contrat) | UX, service |
| 2 | Si un contrat chevauche 2 années de congés (ex: début sept 2024), faut-il gérer les 2 périodes ? | Complexité calcul |
| 3 | Faut-il un champ `adjustment_days` accessible à l'employeur (pour correctifs ponctuels) ? | Déjà présent en DB, pas exposé en UI |
| 4 | Tracer l'historique des modifications de solde (audit log) ? | Nouvelle table ou colonne |
