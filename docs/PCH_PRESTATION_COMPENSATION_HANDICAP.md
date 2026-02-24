# PCH — Prestation de Compensation du Handicap

## Vue d'ensemble

La **PCH (Prestation de Compensation du Handicap)** est une aide financière versée par le **Conseil Départemental** aux personnes handicapées pour couvrir leurs besoins de compensation, dont l'aide humaine à domicile.

Dans Unilien, la grande majorité des employeurs sont **bénéficiaires de la PCH** : c'est cette allocation qui finance tout ou partie du coût de leur(s) auxiliaire(s) de vie. Comprendre la PCH est donc essentiel pour le calcul du **reste à charge employeur**.

---

## Tarifs applicables au 1er janvier 2026

> Source : Arrêté du 28 décembre 2005 · Décret n° 2025-1228 du 17 décembre 2025 (revalorisation SMIC) · Avenant n°9 du 25 novembre 2024 (IDCC 3239)

### Élément 1 — Aide humaine (tableau de référence)

| Mode d'emploi | Tarif PCH 2026 | Base de calcul |
|---------------|---------------|----------------|
| **Emploi direct — général** | **19,34 €/h** | 150% × salaire horaire brut AV-C (IDCC 3239) |
| **Emploi direct — soins/aspirations endo-trachéales** | **20,10 €/h** | 150% × salaire horaire brut AV-D (IDCC 3239) |
| Service mandataire — général | 21,27 €/h | 110% × tarif emploi direct |
| Service mandataire — soins | 22,11 €/h | 110% × tarif emploi direct |
| Service prestataire | 25,00 €/h | 0,01941 × MTP |
| Aidant familial dédommagé | 4,78 €/h | 50% du SMIC horaire net emplois familiaux |
| Aidant familial (cesse activité pro.) | 7,16 €/h | 75% du SMIC horaire net emplois familiaux |

> **Unilien cible le mode emploi direct** (19,34 €/h). C'est le tarif de référence pour le calcul de l'enveloppe PCH.

### Dédommagements aidants familiaux

| Disposition | Montant mensuel |
|-------------|----------------|
| Montant mensuel maximum | **1 231,15 €** |
| Avec majoration (20%) | **1 477,38 €** |

### Forfaits cécité / surdité (Art. D. 245-9 CASF)

| Forfait | Montant mensuel | Base |
|---------|----------------|------|
| Forfait cécité | **813,15 €** | 50 h × 130% × salaire horaire brut AV-A |
| Forfait surdité | **487,89 €** | 30 h × même base |

### Forfaits surdité-cécité (grille combinée)

Montants de **487,89 €**, **813,15 €** ou **1 301,04 €/mois** selon la combinaison perte auditive / vision.

### PCH Parentalité — aide humaine (versement mensuel)

| Âge de l'enfant | Sans monoparentalité | Avec monoparentalité |
|-----------------|---------------------|---------------------|
| Moins de 3 ans | 900 €/mois | 1 350 €/mois |
| 3 à 7 ans | 450 €/mois | 675 €/mois |

### PCH Parentalité — aides techniques (versement ponctuel)

| Date | Montant |
|------|---------|
| Naissance | 1 400 € |
| 3e anniversaire | 1 200 € |
| 6e anniversaire | 1 000 € |

### Hébergement en établissement (Élément 1)

| | Mensuel | Journalier |
|-|---------|-----------|
| Minimum | 57,10 € (4,75 × SMIC horaire brut) | 1,92 € |
| Maximum | 114,19 € (9,5 × SMIC horaire brut) | 3,85 € |

### Autres éléments PCH (Tableau 8)

| Élément | Montant max | Durée |
|---------|------------|-------|
| Aides techniques (2e élément) | 13 200 € | 10 ans |
| Aménagement logement (3e élément) | 10 000 € | 10 ans |
| Charges spécifiques (4e élément) | 100 €/mois | 10 ans |
| Charges exceptionnelles (4e élément) | 6 000 € | 10 ans |
| Aide animalière (5e élément) | 6 000 € | 10 ans |

---

## Lien avec IDCC 3239

Les tarifs PCH sont **directement indexés sur la convention collective IDCC 3239** :

```
Tarif emploi direct 2026 = 150% × salaire horaire brut AV-C (IDCC 3239)
                         = 150% × 12,89 €  (AV-C au 01/01/2026)
                         ≈ 19,34 €/h
```

Cela signifie que toute revalorisation de la CCN entraîne automatiquement une revalorisation du tarif PCH.

### Grille de qualification IDCC 3239 utilisée

| Qualification | Acronyme | Usage PCH |
|--------------|----------|-----------|
| Assistant(e) de vie A (niveau III) | AV-A | Base forfaits cécité/surdité (130%) |
| Assistant(e) de vie C | AV-C | Base tarif emploi direct général (150%) |
| Assistant(e) de vie D | AV-D | Base tarif emploi direct soins (150%) |

---

## Connexion avec les fonctionnalités Unilien

### 1. Profil employeur (existant)

Le profil employer stocke déjà :
```ts
pchBeneficiary: boolean        // l'employeur bénéficie de la PCH
pchMonthlyAmount?: number      // montant PCH mensuel notifié (saisi manuellement)
```

**À enrichir** (voir roadmap) :
```ts
pchType?: 'emploiDirect' | 'mandataire' | 'prestataire' | 'aidantFamilial'
pchMonthlyHours?: number       // heures d'aide allouées par le plan
pchElement1Rate?: number       // tarif horaire PCH applicable (auto-calculé via pchType)
```

### 2. Exonération cotisations patronales SS (lien direct)

Les employeurs PCH sont presque systématiquement éligibles à l'**exonération de cotisations patronales de Sécurité sociale** (Art. L241-10 CSS) :

> *Titulaires d'une carte d'invalidité ≥80%, employeurs ≥60 ans obligés de recourir à une tierce personne, bénéficiaires MTP ou PCTP.*

→ Si `pchBeneficiary === true`, **suggérer automatiquement** l'exonération dans le générateur de bulletins de paie.

Cotisations qui restent dues malgré l'exonération : AGIRC-ARRCO, chômage, FNAL, CSA, AT/MP (cf. note de bas de page du document officiel).

### 3. Calcul du reste à charge (à implémenter)

```
Coût employeur mensuel  = salaire brut + cotisations patronales
Enveloppe PCH mensuelle = pchMonthlyHours × pchElement1Rate
Reste à charge          = max(0, coût employeur - enveloppe PCH)
```

**Exemple concret** (emploi direct, taux 2026) :
```
Employé : 50h/mois × 14,50 €/h brut = 725,00 € brut
Charges patronales (~15% après exo) : ~108,75 €
Coût total employeur                 : ~833,75 €

Enveloppe PCH : 50h × 19,34 €       = 967,00 €

Reste à charge : 0 € (PCH couvre tout)
```

**Sans exonération patronale** :
```
Charges patronales (~35%)            : ~253,75 €
Coût total employeur                 : ~978,75 €
Reste à charge                       : ~11,75 €/mois
```
→ L'exonération peut faire basculer le reste à charge de plusieurs centaines d'euros par mois.

---

## Plan d'implémentation (par niveaux)

### Niveau 1 — Données (sprint court)

- [ ] Enrichir `Employer` : `pchType`, `pchMonthlyHours`, `pchElement1Rate`
- [ ] Migration DB : `pch_type`, `pch_monthly_hours`, `pch_element1_rate`
- [ ] Mettre à jour `EmployerSection.tsx` avec les nouveaux champs
- [ ] Constantes PCH 2026 dans `src/lib/pch/pchTariffs.ts` :
  ```ts
  export const PCH_TARIFFS_2026 = {
    emploiDirectGeneral: 19.34,
    emploiDirectSoins: 20.10,
    mandataireGeneral: 21.27,
    mandataireSoins: 22.11,
    prestataire: 25.00,
    aidantFamilial: 4.78,
    aidantFamilialCessation: 7.16,
  } as const
  ```

### Niveau 2 — Widget Dashboard (sprint moyen)

- [ ] Composant `PchEnvelopeWidget` dans le dashboard employeur
- [ ] Barre de progression mensuelle : consommé / alloué
- [ ] Affichage du reste à charge
- [ ] Alerte si dépassement prévu

### Niveau 3 — Intégration bulletin de paie (sprint moyen)

- [ ] Section "Récapitulatif PCH" dans le bulletin PDF
- [ ] Auto-suggestion exonération SS si `pchBeneficiary === true`
- [ ] Export "Attestation employeur PCH" pour le Conseil Départemental

### Niveau 4 — Module PCH complet (sprint long)

- [ ] Suivi du plan de compensation (dates, renouvellements)
- [ ] Alertes échéance plan PCH
- [ ] Multi-éléments PCH (aides techniques, aménagement logement)
- [ ] Historique des décisions du Conseil Départemental

---

## Références officielles

| Document | Référence |
|----------|-----------|
| Tarifs PCH 2026 | Arrêté du 28/12/2005 + revalorisation SMIC décret 2025-1228 |
| Exonération patronale SS | Art. L241-10 du Code de la Sécurité Sociale |
| Convention Collective | IDCC 3239 — Avenant n°9 du 25/11/2024 (ext. 25/02/2025) |
| Calcul tarifs | Art. D.245-9 CASF (forfaits cécité/surdité/surdicécité) |
| PCH parentalité | Décret n°2022-570 du 19/04/2022 |

---

*Document créé le 19/02/2026 — Tarifs valables du 01/01/2026 jusqu'à revalorisation suivante.*
*Prochain point de vérification : publication de la revalorisation du SMIC (généralement janvier N+1).*
