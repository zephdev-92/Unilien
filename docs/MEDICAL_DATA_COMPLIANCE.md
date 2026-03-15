# Conformite donnees medicales et sensibles

_Derniere mise a jour : 09 mars 2026_

---

## Contexte

Unilien collecte des donnees relatives au handicap et a la situation medicale des employeurs (personnes en situation de handicap). Ces donnees sont qualifiees de **donnees sensibles** au sens du RGPD (Article 9) et necessitent des mesures de protection renforcees.

---

## 1. Inventaire des donnees sensibles

### Table `employers`

| Colonne | Type | Sensibilite | Description |
|---------|------|-------------|-------------|
| `handicap_type` | text | **Sante** | Type de handicap (moteur, visuel, auditif, cognitif, psychique, polyhandicap, maladie_invalidante, autre) |
| `handicap_name` | text | **Sante** | Precision du handicap (ex: Paraplegie, DMLA, Autisme) |
| `specific_needs` | text | **Sante** | Besoins specifiques lies au handicap |
| `pch_beneficiary` | boolean | Medico-admin | Statut beneficiaire PCH |
| `pch_type` | text | Medico-admin | Type de dispositif PCH |
| `pch_monthly_amount` | numeric | Medico-admin | Montant PCH mensuel |
| `pch_monthly_hours` | numeric | Medico-admin | Heures PCH allouees |
| `emergency_contacts` | jsonb[] | Personnel | Contacts d'urgence (nom, telephone, relation) |
| `address` | jsonb | Personnel | Adresse du domicile |

### Composants front-end concernes

- `EmployerSection.tsx` — formulaire de saisie (handicap, PCH, CESU, contacts urgence)
- `ProfilePage.tsx` — affichage mode lecture (EmployerSituationView, EmergencyContactsView)
- `profileService.ts` — `upsertEmployer()` et `getEmployer()`

### Services back-end concernes

- `profileService.ts` — CRUD Supabase avec `sanitizeText()` sur les champs texte
- Migration `031_add_pch_fields.sql` — colonnes PCH
- Migration `024_auto_create_role_row_on_signup.sql` — creation automatique ligne employers

---

## 2. Cadre reglementaire

### RGPD — Article 9 (Donnees de sante)

Le traitement de donnees de sante est **interdit par defaut** sauf exceptions. Les bases legales applicables a Unilien :

- **Article 9.2(a) — Consentement explicite** : l'utilisateur consent de maniere specifique et eclairee au traitement de ses donnees de sante
- **Article 9.2(h) — Medecine du travail / gestion des soins** : potentiellement applicable dans le cadre de la relation employeur/employe pour l'aide a domicile

> **Recommandation** : s'appuyer sur le consentement explicite (9.2a) car plus simple a mettre en oeuvre et plus protecteur.

### Principes RGPD a respecter

| Principe | Application dans Unilien |
|----------|------------------------|
| **Minimisation** (art. 5.1c) | Tous les champs medicaux sont optionnels — OK |
| **Limitation de la finalite** (art. 5.1b) | Les donnees servent uniquement a adapter l'accompagnement et calculer les droits PCH |
| **Limitation de conservation** (art. 5.1e) | A definir : supprimer les donnees X mois apres la fin de tous les contrats |
| **Integrite et confidentialite** (art. 5.1f) | Chiffrement + RLS + controle d'acces |
| **Responsabilite** (art. 5.2) | Registre des traitements + mentions legales |

### HDS (Hebergement de Donnees de Sante)

La certification HDS (articles L.1111-8 et R.1111-8-8 du Code de la sante publique) est obligatoire pour l'hebergement de donnees de sante **pour le compte de tiers**.

**Analyse pour Unilien :**

- Les donnees sont saisies **par l'utilisateur lui-meme** (pas par un professionnel de sante)
- Unilien n'est **pas un etablissement de sante** ni un professionnel de sante
- L'utilisateur gere ses propres donnees dans le cadre de la gestion de ses employes a domicile

> **Conclusion** : l'obligation HDS ne s'applique probablement pas dans ce contexte (auto-saisie par l'utilisateur pour sa propre gestion). Cependant, par precaution, il est recommande de chiffrer les colonnes sensibles et de documenter cette analyse pour la CNIL.

> **Attention** : si Unilien evolue vers un modele ou un professionnel de sante ou un tiers saisit les donnees, la certification HDS deviendra obligatoire.

---

## 3. Etat actuel des protections

### Ce qui est en place

| Mesure | Statut | Detail |
|--------|--------|--------|
| RLS (Row Level Security) | OK | `employers` protege : seul le proprietaire (`auth.uid() = profile_id`) peut lire/modifier ses donnees |
| Acces employes | OK | Les employes avec contrat actif peuvent lire le profil employeur (pour adapter l'accompagnement) |
| Acces aidants | OK | Les aidants lies peuvent lire ; seuls tuteurs/curateurs peuvent modifier |
| Sanitisation | OK | `sanitizeText()` applique sur les champs texte avant ecriture |
| Champs optionnels | OK | Tous les champs medicaux sont optionnels |

### Ce qui manque

| Mesure | Priorite | Description |
|--------|----------|-------------|
| **Consentement explicite** | P1 | Checkbox + texte d'information avant la premiere saisie de donnees de sante |
| **Chiffrement colonnes** | P1 | Chiffrer `handicap_type`, `handicap_name`, `specific_needs` avec `pgsodium` |
| **Mentions legales** | P1 | Informer l'utilisateur : finalite, duree de conservation, droits (acces, rectification, effacement) |
| **Droit a l'effacement** | P2 | Bouton "Supprimer mes donnees medicales" (distincts du compte) |
| **Duree de conservation** | P2 | Politique de suppression automatique apres fin des contrats |
| **Journal d'acces** | P3 | Logger qui accede aux donnees sensibles (audit trail) |
| **Registre des traitements** | P3 | Document formel pour la CNIL |

---

## 4. Plan d'action

### Phase 1 — Consentement et information (prioritaire)

**4.1 Ecran de consentement**

Avant la premiere saisie de la section "Ma Situation", afficher un ecran de consentement :

```
┌─────────────────────────────────────────────────┐
│  Donnees relatives a votre situation             │
│                                                  │
│  Les informations suivantes concernent votre     │
│  situation de handicap et vos droits PCH.        │
│                                                  │
│  Elles sont utilisees uniquement pour :          │
│  • Adapter l'accompagnement de vos auxiliaires   │
│  • Calculer vos droits et enveloppes PCH         │
│                                                  │
│  Ces donnees sont :                              │
│  • Facultatives                                  │
│  • Chiffrees et protegees                        │
│  • Accessibles uniquement par vous et vos        │
│    aidants autorises                             │
│  • Supprimables a tout moment                    │
│                                                  │
│  ☐ J'accepte la collecte de ces informations    │
│                                                  │
│  [Continuer]              [En savoir plus]       │
└─────────────────────────────────────────────────┘
```

**Implementation** :
- Ajouter une colonne `medical_data_consent` (boolean) + `medical_data_consent_date` (timestamp) dans `employers`
- Stocker la date du consentement pour preuve
- Afficher le formulaire "Ma Situation" uniquement si consentement donne
- Permettre le retrait du consentement (supprime les donnees medicales)

**4.2 Mentions legales dans le formulaire**

Ajouter un texte d'information au-dessus de la section "Informations complementaires" :

> "Ces informations sont protegees et facultatives. Elles servent a adapter l'accompagnement de vos auxiliaires. Vous pouvez les modifier ou les supprimer a tout moment depuis cette page."

### Phase 2 — Chiffrement (recommande)

**4.3 Chiffrement avec pgsodium**

```sql
-- Activer pgsodium
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Creer une cle de chiffrement
SELECT pgsodium.create_key(name := 'medical_data_key');

-- Chiffrer les colonnes sensibles
-- Option A : Transparent Column Encryption (TCE)
-- Option B : Chiffrement applicatif via fonctions
```

**Colonnes a chiffrer** :
- `handicap_type`
- `handicap_name`
- `specific_needs`

**Note** : les champs PCH sont des donnees administratives (montant, heures) et ne necessitent pas forcement de chiffrement, mais c'est recommande.

### Phase 3 — Droit a l'effacement

**4.4 Suppression des donnees medicales**

Ajouter un bouton dans la section "Ma Situation" :
- "Supprimer mes donnees medicales"
- Confirmer par modale
- Met a `NULL` les colonnes : `handicap_type`, `handicap_name`, `specific_needs`
- Optionnel : met aussi a `NULL` les champs PCH
- Met `medical_data_consent` a `false`

---

## 5. Acces par role — Matrice

| Donnee | Employeur (proprietaire) | Employe (contrat actif) | Aidant (lie) | Tuteur/Curateur |
|--------|--------------------------|------------------------|--------------|-----------------|
| `handicap_type` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |
| `handicap_name` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |
| `specific_needs` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |
| `pch_*` | Lecture + Ecriture | Non | **Lecture** | Lecture + Ecriture |
| `emergency_contacts` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |
| `address` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |

> **Point d'attention** : les employes avec contrat actif peuvent actuellement lire **toutes** les colonnes de la table `employers` via la policy RLS "Employees can read employer for active contracts". Il faudrait envisager une vue ou une fonction qui filtre les colonnes retournees selon le role.

---

## 6. References juridiques

- **RGPD** — Reglement (UE) 2016/679, articles 5, 6, 9, 17, 30
- **Loi Informatique et Libertes** — Loi n°78-17 du 6 janvier 1978 modifiee
- **Code de la sante publique** — Articles L.1111-8 et R.1111-8-8 (HDS)
- **CNIL** — Guide pratique "Les bases legales du RGPD" et "Donnees de sante"
- **Convention IDCC 3239** — Convention collective du particulier employeur et de l'emploi a domicile

---

## 7. Checklist de mise en conformite

- [ ] Ajouter le consentement explicite (colonne + UI)
- [ ] Ajouter les mentions legales dans le formulaire
- [ ] Chiffrer les colonnes sensibles (pgsodium ou applicatif)
- [ ] Ajouter le bouton "Supprimer mes donnees medicales"
- [ ] Definir la duree de conservation et la politique de purge
- [ ] Restreindre les colonnes retournees aux employes (vue ou fonction)
- [ ] Creer le registre des traitements (document CNIL)
- [ ] Ajouter un journal d'acces aux donnees sensibles
