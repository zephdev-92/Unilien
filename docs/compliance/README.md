# Module Conformité - Bouclier Juridique

Guide des règles de conformité IDCC 3239 (Convention Collective des Particuliers Employeurs) implémentées dans Unilien.

## Vue d'ensemble

Le module de conformité vérifie automatiquement que chaque intervention respecte le droit du travail français. Il distingue :

- **Erreurs bloquantes** : L'intervention ne peut pas être créée
- **Avertissements** : L'intervention peut être créée après confirmation

---

## Règles de temps de travail

### 1. Repos quotidien minimum (11h)

**Article L3131-1 du Code du travail**

> Tout salarié bénéficie d'un repos quotidien d'une durée minimale de 11 heures consécutives.

| Statut | Condition |
|--------|-----------|
| ✅ Valide | ≥ 11h entre la fin d'une intervention et le début de la suivante |
| ❌ Bloquant | < 11h de repos |

**Exemple :**
- Intervention finit à 22h00
- Prochaine intervention peut commencer au plus tôt à 09h00 le lendemain

---

### 2. Repos hebdomadaire (35h consécutives)

**Article L3132-2 du Code du travail**

> Le repos hebdomadaire a une durée minimale de 24 heures consécutives auxquelles s'ajoutent les 11 heures de repos quotidien.

| Statut | Condition |
|--------|-----------|
| ✅ Valide | Au moins 35h de repos consécutives dans la semaine |
| ❌ Bloquant | Aucune période de 35h sans travail |

**Conseil :** Prévoir au minimum un jour et demi de repos consécutif par semaine.

---

### 3. Durée maximale quotidienne (10h)

**Article L3121-18 du Code du travail**

> La durée quotidienne de travail effectif par salarié ne peut excéder 10 heures.

| Statut | Condition |
|--------|-----------|
| ✅ Valide | ≤ 10h de travail effectif par jour |
| ❌ Bloquant | > 10h de travail effectif |

**Note :** Les pauses sont déduites du temps de travail effectif.

---

### 4. Durée maximale hebdomadaire (48h)

**Article L3121-20 du Code du travail**

> La durée hebdomadaire de travail ne peut dépasser 48 heures.

| Statut | Condition |
|--------|-----------|
| ✅ Valide | ≤ 44h par semaine |
| ⚠️ Avertissement | Entre 44h et 48h (approche du maximum) |
| ❌ Bloquant | > 48h par semaine |

**Semaine de référence :** Du lundi 00h00 au dimanche 23h59.

---

### 5. Pause obligatoire (20 min)

**Article L3121-16 du Code du travail**

> Dès que le temps de travail quotidien atteint 6 heures, le salarié bénéficie d'un temps de pause d'une durée minimale de 20 minutes.

| Statut | Condition |
|--------|-----------|
| ✅ Valide | Intervention ≤ 6h OU pause ≥ 20 min |
| ⚠️ Avertissement | Intervention > 6h sans pause suffisante |

**Pauses recommandées :**

| Durée intervention | Pause conseillée |
|-------------------|------------------|
| < 4h | Aucune obligatoire |
| 4h - 6h | 15 min (conseillé) |
| 6h - 8h | 20 min (obligatoire) |
| 8h - 10h | 30 min |
| > 10h | 45 min |

---

### 6. Chevauchement d'interventions

| Statut | Condition |
|--------|-----------|
| ✅ Valide | Pas de chevauchement horaire pour le même auxiliaire |
| ❌ Bloquant | Deux interventions se chevauchent |

**Note :** Les interventions "bout à bout" (fin à 12h00, début à 12h00) sont autorisées.

---

## Calcul de la rémunération

### Salaire de base

```
Salaire = Durée effective × Taux horaire
```

La durée effective = durée totale - pauses.

### Majorations

| Type | Taux | Condition |
|------|------|-----------|
| Dimanche | +30% | Travail le dimanche |
| Jour férié (habituel) | +60% | Jour férié prévu au contrat |
| Jour férié (exceptionnel) | +100% | Jour férié non prévu |
| Heures de nuit | +20% | Heures entre 21h et 6h |
| Heures sup (1-8h) | +25% | Au-delà des heures contractuelles |
| Heures sup (> 8h) | +50% | Au-delà de 8h supplémentaires |

### Jours fériés reconnus

- 1er janvier (Jour de l'an)
- Lundi de Pâques
- 1er mai (Fête du travail)
- 8 mai (Victoire 1945)
- Ascension
- Lundi de Pentecôte
- 14 juillet (Fête nationale)
- 15 août (Assomption)
- 1er novembre (Toussaint)
- 11 novembre (Armistice)
- 25 décembre (Noël)

### Exemple de calcul

**Intervention :**
- Dimanche 1er janvier
- 8h00 - 18h00 (10h)
- Pause : 30 min
- Taux horaire : 12€

**Calcul :**
```
Durée effective : 9h30 (10h - 30min)
Salaire base : 9.5 × 12€ = 114€
Majoration dimanche : 114€ × 30% = 34,20€
Majoration férié : 114€ × 100% = 114€
Total : 262,20€
```

---

## Interface utilisateur

### Indicateurs visuels

| Icône | Signification |
|-------|---------------|
| 🟢 Vert | Conforme - Aucun problème |
| 🟠 Orange | Attention - Avertissements à confirmer |
| 🔴 Rouge | Non conforme - Création impossible |

### Messages d'erreur courants

**"Repos quotidien insuffisant"**
> Solution : Décaler l'heure de début pour respecter 11h de repos après la précédente intervention.

**"Dépassement des 48h hebdomadaires"**
> Solution : Reporter l'intervention à la semaine suivante ou réduire sa durée.

**"Chevauchement avec une autre intervention"**
> Solution : Modifier les horaires pour éviter le chevauchement.

### Suggestions automatiques

Quand une erreur est détectée, le système propose des créneaux alternatifs :
- Après le chevauchement détecté
- Respectant le repos quotidien
- Dans les limites horaires

---

## Références légales

- [Code du travail - Durée du travail](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006177833/)
- [Convention Collective IDCC 3239](https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000044594539)
- [URSSAF - Particuliers employeurs](https://www.urssaf.fr/accueil/particulier-employeur.html)

---

## Support

En cas de doute sur une règle de conformité, consultez :
1. Votre conseiller URSSAF
2. Un avocat spécialisé en droit du travail
3. La documentation officielle de la convention collective

*Ce module est fourni à titre informatif et ne constitue pas un conseil juridique.*
