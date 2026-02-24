# 🐛 Issue: Valeurs Hardcodées dans DeclarationService

**Date de découverte**: 5 février 2026  
**Sévérité**: 🔴 **CRITIQUE**  
**Impact**: Exports CESU incorrects, risques légaux et financiers  
**Statut**: 🔴 **OUVERT**

---

## 📋 Résumé Exécutif

Le fichier `src/lib/export/declarationService.ts` contient des **valeurs hardcodées** pour les majorations salariales et n'implémente **pas le calcul des heures supplémentaires**. Cela entraîne des exports CESU **faux et non conformes** à la réglementation.

### Impact Financier

- ❌ **Heures supplémentaires ignorées** → Sous-paiement des employés
- ❌ **Majorations fixes** → Pas de mise à jour selon la Convention Collective
- ❌ **Déclarations URSSAF incorrectes** → Risques de redressement

### Impact Légal

- ⚖️ Non-conformité Code du travail (heures sup obligatoires)
- ⚖️ Non-conformité Convention Collective IDCC 3239
- ⚖️ Risques prud'homaux (sous-paiement employés)

---

## 🔍 Analyse Détaillée du Problème

### 1. Majorations Hardcodées

**Fichier**: `src/lib/export/declarationService.ts`

#### Problème Identifié

```typescript
// ❌ LIGNE 245 - Majoration dimanche hardcodée
if (isSundayShift) {
  shiftSundayMaj = shiftBasePay * 0.30  // ⚠️ HARDCODÉ : 30%
  shiftTotal += shiftSundayMaj
  sundayHours += effectiveHours
}

// ❌ LIGNE 251 - Majoration jour férié hardcodée
if (isHolidayShift) {
  shiftHolidayMaj = shiftBasePay * 0.60  // ⚠️ HARDCODÉ : 60%
  shiftTotal += shiftHolidayMaj
  holidayHours += effectiveHours
}

// ❌ LIGNE 257 - Majoration nuit hardcodée
if (shiftNightHours > 0) {
  shiftNightMaj = shiftNightHours * hourlyRate * 0.20  // ⚠️ HARDCODÉ : 20%
  shiftTotal += shiftNightMaj
  nightHours += shiftNightHours
}
```

#### Code Correct (déjà existant)

**Fichier**: `src/lib/compliance/calculatePay.ts` (lignes 12-19)

```typescript
// ✅ Taux centralisés et documentés
const MAJORATION_RATES = {
  SUNDAY: 0.30,                        // +30% pour le dimanche
  PUBLIC_HOLIDAY_WORKED: 0.60,         // +60% jour férié travaillé habituellement
  PUBLIC_HOLIDAY_EXCEPTIONAL: 1.00,    // +100% jour férié travaillé exceptionnellement
  NIGHT: 0.20,                         // +20% pour les heures de nuit (21h-6h)
  OVERTIME_FIRST_8H: 0.25,             // +25% pour les 8 premières heures supplémentaires
  OVERTIME_BEYOND_8H: 0.50,            // +50% au-delà de 8h supplémentaires
}
```

**Conséquences**:
- 🔴 **Violation du principe DRY** (Don't Repeat Yourself)
- 🔴 **Duplication de logique métier** (2 sources de vérité)
- 🔴 **Risque d'incohérence** si les taux changent dans `calculatePay.ts`
- 🔴 **Maintenance difficile** (changement à 2 endroits)

---

### 2. Heures Supplémentaires Ignorées

**Fichier**: `src/lib/export/declarationService.ts`

#### Problème Critique

```typescript
// ❌ LIGNE 217 - Heures supplémentaires TOUJOURS à 0
const overtimeHours = 0  // ⚠️ JAMAIS CALCULÉ !

// ❌ LIGNE 223 - Majoration heures sup TOUJOURS à 0
const overtimeMajoration = 0  // ⚠️ JAMAIS CALCULÉ !

// ❌ LIGNES 300, 305 - Valeurs exportées toujours nulles
overtimeHours: Math.round(overtimeHours * 100) / 100,  // Toujours 0.00
overtimeMajoration: Math.round(overtimeMajoration * 100) / 100,  // Toujours 0.00
```

#### Fonction Existante Non Utilisée

**Fichier**: `src/lib/compliance/calculatePay.ts` (lignes 98-139)

```typescript
// ✅ Fonction de calcul des heures sup EXISTE déjà
function calculateOvertimeHours(
  newShift: ShiftForValidation,
  existingShifts: ShiftForValidation[],
  contractualWeeklyHours: number
): number {
  const weekStart = getWeekStart(newShift.date)
  
  // Filtrer les interventions de la même semaine
  const weekShifts = existingShifts.filter((shift) => {
    if (newShift.id && shift.id === newShift.id) return false
    if (shift.employeeId !== newShift.employeeId) return false
    const shiftWeekStart = getWeekStart(shift.date)
    return shiftWeekStart.getTime() === weekStart.getTime()
  })
  
  // Calcul des heures sup
  const previousHours = calculateTotalHours(weekShifts)
  const thisShiftHours = calculateShiftDuration(...) / 60
  const totalHours = previousHours + thisShiftHours
  
  if (totalHours > contractualWeeklyHours) {
    // Retourner les heures sup de CETTE intervention uniquement
    return totalOvertime - previousOvertime
  }
  
  return 0
}
```

**Conséquences**:
- 🔴 **Employés sous-payés** (heures sup non rémunérées)
- 🔴 **Non-conformité légale** (Code du travail Art. L3121-22)
- 🔴 **Déclarations URSSAF fausses** (montants incorrects)
- 🔴 **Risques prud'homaux** (rappel de salaire possible)

---

### 3. Architecture Problématique

```
┌─────────────────────────────────────────────────────────┐
│                 SITUATION ACTUELLE                       │
└─────────────────────────────────────────────────────────┘

src/lib/compliance/calculatePay.ts
├── ✅ MAJORATION_RATES (source de vérité)
├── ✅ calculateShiftPay() (calcul complet)
└── ✅ calculateOvertimeHours() (calcul heures sup)
                 ↓
                 ↓ ❌ NON UTILISÉ
                 ↓
src/lib/export/declarationService.ts
├── ❌ Taux hardcodés (0.30, 0.60, 0.20)
├── ❌ overtimeHours = 0 (valeur fixe)
└── ❌ Pas d'appel à calculateOvertimeHours()

RÉSULTAT: 
- Deux sources de vérité différentes
- Logique de calcul dupliquée et incomplète
- Exports incorrects
```

---

## 💥 Impact & Risques

### Impact Financier Estimé

**Scénario type** (1 employeur, 2 employés, 40h/mois):

```
Employé A: 
- Heures normales: 35h @ 15€/h = 525€
- Heures sup ignorées: 5h @ 18.75€/h (+25%) = 93.75€
- Manque à gagner: 93.75€/mois

Employé B:
- Heures normales: 38h @ 15€/h = 570€  
- Heures sup ignorées: 2h @ 18.75€/h (+25%) = 37.50€
- Manque à gagner: 37.50€/mois

TOTAL par mois: 131.25€ de sous-paiement
TOTAL par an: 1,575€ de sous-paiement
```

**Avec 50 employeurs actifs**: ~78,750€/an de sous-paiement total

### Risques Légaux

| Risque | Probabilité | Impact | Gravité |
|--------|-------------|--------|---------|
| **Redressement URSSAF** | Élevée | 78k€ + pénalités | 🔴 Critique |
| **Action prud'homale** | Moyenne | Rappel salaire + dommages | 🔴 Élevé |
| **Inspection du travail** | Faible | Mise en demeure | 🟡 Moyen |
| **Non-conformité CESU** | Élevée | Perte agrément | 🔴 Critique |

### Risques Réputationnels

- ❌ Perte de confiance des employeurs
- ❌ Bouche-à-oreille négatif
- ❌ Churn des utilisateurs
- ❌ Difficultés levée de fonds

---

## ✅ Solutions Proposées

### Solution 1: Réutiliser calculatePay.ts (RECOMMANDÉE)

**Avantages**:
- ✅ Code déjà testé (8 tests unitaires)
- ✅ Conforme à la Convention Collective
- ✅ Gère tous les cas (heures sup, majorations, etc.)
- ✅ Source de vérité unique
- ✅ Effort minimal (1-2h)

**Implémentation**:

```typescript
// src/lib/export/declarationService.ts

import { calculateShiftPay } from '@/lib/compliance/calculatePay'
import { MAJORATION_RATES } from '@/lib/compliance/calculatePay'  // Exporter les constantes

function calculateEmployeeDeclaration(
  contract: ContractForDeclarationDb,
  shifts: ShiftDbRow[]
): EmployeeDeclarationData {
  const hourlyRate = contract.hourly_rate
  const contractualWeeklyHours = contract.weekly_hours || 35  // Ajouter au contrat
  const shiftsDetails: ShiftDeclarationDetail[] = []

  let totalHours = 0
  let normalHours = 0
  let sundayHours = 0
  let holidayHours = 0
  let nightHours = 0
  let overtimeHours = 0  // ✅ Variable maintenant

  let basePay = 0
  let sundayMajoration = 0
  let holidayMajoration = 0
  let nightMajoration = 0
  let overtimeMajoration = 0  // ✅ Variable maintenant

  // Transformer les shifts en format attendu
  const shiftsForCalculation = shifts.map(shift => ({
    id: shift.id,
    date: new Date(shift.date),
    startTime: shift.start_time,
    endTime: shift.end_time,
    breakDuration: shift.break_duration || 0,
    employeeId: contract.employee_id,
    contractId: contract.id,
    status: shift.status
  }))

  for (let i = 0; i < shifts.length; i++) {
    const shift = shifts[i]
    const shiftDate = new Date(shift.date)
    
    // ✅ Utiliser la fonction centralisée
    const pay = calculateShiftPay(
      shiftsForCalculation[i],
      {
        id: contract.id,
        hourlyRate: contract.hourly_rate,
        weeklyHours: contractualWeeklyHours
      },
      shiftsForCalculation.slice(0, i),  // Shifts précédents pour calcul heures sup
      false  // isHabitualWorkOnHolidays (à stocker dans le contrat)
    )

    const effectiveHours = calculateShiftDuration(...) / 60
    const shiftNightHours = calculateNightHours(...)
    
    // Accumuler les heures par type
    if (isSunday(shiftDate)) sundayHours += effectiveHours
    if (isPublicHoliday(shiftDate)) holidayHours += effectiveHours
    nightHours += shiftNightHours
    
    // ✅ Calculer les heures sup pour cette intervention
    const shiftOvertimeHours = calculateOvertimeHours(
      shiftsForCalculation[i],
      shiftsForCalculation.slice(0, i),
      contractualWeeklyHours
    )
    overtimeHours += shiftOvertimeHours

    // Accumuler les totaux
    totalHours += effectiveHours
    basePay += pay.basePay
    sundayMajoration += pay.sundayMajoration
    holidayMajoration += pay.holidayMajoration
    nightMajoration += pay.nightMajoration
    overtimeMajoration += pay.overtimeMajoration  // ✅ Maintenant calculé

    shiftsDetails.push({
      date: shiftDate,
      startTime: shift.start_time,
      endTime: shift.end_time,
      breakDuration: shift.break_duration || 0,
      effectiveHours,
      isSunday: isSunday(shiftDate),
      isHoliday: isPublicHoliday(shiftDate),
      nightHours: shiftNightHours,
      pay: pay.totalPay
    })
  }

  // Heures normales = total - spéciales - supplémentaires
  normalHours = totalHours - sundayHours - holidayHours - overtimeHours

  const totalGrossPay = basePay + sundayMajoration + holidayMajoration + nightMajoration + overtimeMajoration

  return {
    // ... (reste identique)
    overtimeHours: Math.round(overtimeHours * 100) / 100,  // ✅ Valeur réelle
    overtimeMajoration: Math.round(overtimeMajoration * 100) / 100,  // ✅ Valeur réelle
    // ...
  }
}
```

**Effort estimé**: 2-3 heures  
**Complexité**: Faible  
**Risque**: Faible (code existant testé)

---

### Solution 2: Externaliser les Constantes (COMPLÉMENTAIRE)

**Créer un fichier de configuration**:

```typescript
// src/lib/compliance/constants.ts

/**
 * Taux de majoration selon Convention Collective IDCC 3239
 * Source: https://www.legifrance.gouv.fr/...
 * Dernière mise à jour: 2024-01-01
 */
export const MAJORATION_RATES = {
  SUNDAY: 0.30,                        // Art. X.XX - Dimanche
  PUBLIC_HOLIDAY_WORKED: 0.60,         // Art. X.XX - Jour férié habituel
  PUBLIC_HOLIDAY_EXCEPTIONAL: 1.00,    // Art. X.XX - Jour férié exceptionnel
  NIGHT: 0.20,                         // Art. X.XX - Heures de nuit (21h-6h)
  OVERTIME_FIRST_8H: 0.25,             // Art. X.XX - 8 premières heures sup
  OVERTIME_BEYOND_8H: 0.50,            // Art. X.XX - Au-delà de 8h sup
} as const

/**
 * Seuils horaires selon Code du travail
 */
export const HOURS_THRESHOLDS = {
  WEEKLY_NORMAL: 35,                   // Durée hebdomadaire légale
  DAILY_MAX: 10,                       // Durée quotidienne max
  WEEKLY_MAX: 48,                      // Durée hebdomadaire max
  WEEKLY_AVG_MAX: 44,                  // Durée hebdomadaire moyenne max (12 semaines)
  NIGHT_START: '21:00',                // Début heures de nuit
  NIGHT_END: '06:00',                  // Fin heures de nuit
} as const

/**
 * Permet de mettre à jour les taux depuis la base de données
 * pour gérer les évolutions réglementaires
 */
export async function getActiveMajorationRates() {
  // TODO: Récupérer depuis Supabase si besoin de gestion dynamique
  return MAJORATION_RATES
}
```

**Avantages**:
- ✅ Source de vérité unique
- ✅ Documentation centralisée
- ✅ Évolutif (peut venir de la DB plus tard)
- ✅ Type-safe (TypeScript const assertion)

---

### Solution 3: Ajouter Tests Déclaration (OBLIGATOIRE)

**Créer**: `src/lib/export/declarationService.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { calculateEmployeeDeclaration } from './declarationService'

describe('declarationService', () => {
  describe('calculateEmployeeDeclaration', () => {
    it('should calculate overtime hours correctly', () => {
      const contract = createMockContract({ weeklyHours: 35 })
      const shifts = [
        createMockShift({ hours: 20, week: 1 }),  // Semaine 1
        createMockShift({ hours: 20, week: 1 }),  // 40h total → 5h sup
      ]

      const result = calculateEmployeeDeclaration(contract, shifts)

      expect(result.totalHours).toBe(40)
      expect(result.normalHours).toBe(35)
      expect(result.overtimeHours).toBe(5)  // ✅ Doit être 5, pas 0
      expect(result.overtimeMajoration).toBeGreaterThan(0)  // ✅ Doit être > 0
    })

    it('should use correct majoration rates', () => {
      const contract = createMockContract()
      const shifts = [
        createMockShift({ date: '2024-12-25' }),  // Jour férié
      ]

      const result = calculateEmployeeDeclaration(contract, shifts)

      // ✅ Vérifier que le taux est bien 60% ou 100%
      const expectedMajoration = shifts[0].hours * contract.hourlyRate * 0.60
      expect(result.holidayMajoration).toBeCloseTo(expectedMajoration, 2)
    })

    it('should match calculatePay results', () => {
      // ✅ Test d'intégration : résultats identiques
      const contract = createMockContract()
      const shift = createMockShift()

      const declarationResult = calculateEmployeeDeclaration(contract, [shift])
      const payResult = calculateShiftPay(shift, contract)

      expect(declarationResult.basePay).toBeCloseTo(payResult.basePay)
      expect(declarationResult.sundayMajoration).toBeCloseTo(payResult.sundayMajoration)
      // ... tous les champs
    })
  })
})
```

**Couverture cible**: 80% minimum

---

## 📋 Plan d'Action

### Phase 1: Correction Urgente (Priorité P0) 🔴

**Deadline**: Cette semaine

1. **Exporter MAJORATION_RATES** (30 min)
   ```typescript
   // src/lib/compliance/calculatePay.ts
   export const MAJORATION_RATES = { ... }
   export { calculateOvertimeHours }  // Rendre public
   ```

2. **Refactoriser declarationService** (2-3h)
   - Utiliser `calculateShiftPay()` pour chaque shift
   - Calculer réellement `overtimeHours`
   - Supprimer les valeurs hardcodées

3. **Tester manuellement** (1h)
   - Générer déclaration avec heures sup
   - Vérifier les montants
   - Comparer avec calculs manuels

4. **Tests unitaires** (2h)
   - Créer `declarationService.test.ts`
   - Couvrir les cas critiques
   - CI/CD doit passer

**Effort total**: 1 jour  
**Responsable**: Dev Backend + QA

---

### Phase 2: Validation & Documentation (Priorité P1) 🟡

**Deadline**: Semaine prochaine

5. **Tests d'intégration** (1 jour)
   - Export CESU bout-en-bout
   - Vérifier cohérence avec compliance
   - Tester plusieurs scénarios réels

6. **Documentation** (2h)
   - Documenter les taux utilisés
   - Ajouter sources légales (Légifrance)
   - Guide de maintenance

7. **Review code** (2h)
   - Peer review obligatoire
   - Validation expert paie si possible
   - Sign-off technique

**Effort total**: 2 jours

---

### Phase 3: Amélioration Continue (Priorité P2) 🟢

**Deadline**: Mois prochain

8. **Externalisation configuration** (1 jour)
   - Créer `constants.ts`
   - Préparer gestion dynamique (DB)
   - Migration progressive

9. **Monitoring & Alertes** (1 jour)
   - Alertes si montants anormaux
   - Logs des exports générés
   - Audit trail déclarations

10. **Formation équipe** (1/2 jour)
    - Expliquer le système de majorations
    - Process de mise à jour des taux
    - Gestion des évolutions légales

**Effort total**: 3 jours

---

## 🧪 Tests de Régression

### Scénarios à Tester

| Scénario | Avant (Bug) | Après (Fix) | Validation |
|----------|-------------|-------------|------------|
| **40h/semaine (35h contrat)** | 0h sup | 5h sup | ✅ Correct |
| **Dimanche 8h @ 15€/h** | +36€ (30%) | +36€ (30%) | ✅ Identique |
| **Jour férié 8h @ 15€/h** | +72€ (60%) | +72€ (60%) | ✅ Identique |
| **Nuit 4h @ 15€/h** | +12€ (20%) | +12€ (20%) | ✅ Identique |
| **Export multi-employés** | Heures sup=0 | Heures sup calculées | ✅ Corrigé |

### Commandes de Test

```bash
# Tests unitaires
npm run test src/lib/export/declarationService.test.ts

# Tests d'intégration
npm run test:integration export-cesu

# Coverage
npm run test:coverage -- src/lib/export/
```

---

## 📊 Métriques de Succès

### Avant Correction

- ❌ Heures sup: **0h** (toujours)
- ❌ Majorations: Hardcodées
- ❌ Tests: **0**
- ❌ Coverage: **0%**
- ❌ Conformité: **NON**

### Après Correction (Cible)

- ✅ Heures sup: **Calculées correctement**
- ✅ Majorations: **Source unique (calculatePay.ts)**
- ✅ Tests: **≥10 tests** (unitaires + intégration)
- ✅ Coverage: **≥80%**
- ✅ Conformité: **OUI** (Code du travail + CC IDCC 3239)

---

## 🔗 Références

### Légales

- [Code du travail - Art. L3121-22](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033020517) (Heures supplémentaires)
- [Convention Collective IDCC 3239](https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000046124899) (Particuliers employeurs)
- [Décret heures de nuit](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000532505) (21h-6h)

### Techniques

- `src/lib/compliance/calculatePay.ts` - Fonction de référence
- `src/lib/compliance/calculatePay.test.ts` - Tests existants (8 tests)
- `docs/compliance/` - Documentation métier

---

## ✅ Checklist de Validation

Avant de clore cette issue:

- [ ] Code modifié et testé
- [ ] Tests unitaires ≥80% coverage
- [ ] Tests d'intégration passent
- [ ] Documentation mise à jour
- [ ] Review code approuvée
- [ ] QA validation OK
- [ ] Déploiement en staging
- [ ] Test bout-en-bout en staging
- [ ] Déploiement en production
- [ ] Monitoring 48h post-déploiement
- [ ] Pas de régression signalée

---

## 👥 Responsabilités

| Rôle | Tâches | Deadline |
|------|--------|----------|
| **Dev Backend** | Refactoring + Tests | Sem. 6 |
| **QA** | Tests intégration | Sem. 6 |
| **Expert Paie** | Validation montants | Sem. 6 |
| **Tech Lead** | Code review | Sem. 6 |
| **Product** | Acceptance | Sem. 6 |

---

## 📝 Notes & Commentaires

### Historique

- **2026-02-05**: Issue créée suite à découverte du bug
- **2026-02-05**: Analyse d'impact effectuée
- **2026-02-05**: Solutions proposées

### Prochaines Actions

1. ⏳ Estimer l'effort de correction
2. ⏳ Prioriser dans le sprint
3. ⏳ Assigner un développeur
4. ⏳ Créer les tests en premier (TDD)
5. ⏳ Implémenter la solution
6. ⏳ Valider avec QA + Expert métier

---

**Issue créée par**: Équipe Développement  
**Dernière mise à jour**: 5 février 2026  
**Prochaine revue**: 6 février 2026
