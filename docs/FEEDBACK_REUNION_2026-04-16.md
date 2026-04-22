# Feedback réunion — 16 avril 2026

> Synthèse issue de la réunion avec Marie, Vincent, Nico (mentions : John, Philippe, Christophe).
> Source : transcription audio automatique (fichier `reunion-16.04.2026.txt`).

## Vue d'ensemble

Retour globalement très positif sur l'avancée du produit. Marie considère qu'**on est proches d'une sortie en bêta**, avec quelques ajustements UX à faire avant de lancer les premiers tests utilisateurs.

Trois axes de travail distincts ressortent :

1. **Quick wins UI** (ajustements saisie intervention, pointage, suivi des heures)
2. **Modèles de données / logique métier** (heures jour-nuit, absences, pauses)
3. **Stratégie produit & commercialisation** (modules, formules, cibles)

---

## 1. Saisie d'intervention

### 1.1 Segments jour / nuit → calcul automatique

**Problème soulevé par Marie** : dans le tableau de saisie, la distinction manuelle `présence de jour` / `présence de nuit` pose problème dès qu'un créneau est à cheval (ex. 20h → 23h).

**Statut : ✅ déjà implémenté pour la garde 24h** — voir `docs/Garde_de_24_heures.md` + section `Garde de 24h — N-segments libres (18/02/2026)` du CLAUDE.md.

- Les segments sont typés `effective | astreinte | break` (pas jour/nuit).
- Les majorations nuit sont appliquées **automatiquement** sur les segments effectifs entre 21h et 6h (migration `030_guard_segments_v2`).
- Validations : total effectif ≤ 12h (bloquant), présence nuit > 12h (avertissement).

**Action** : vérifier si Marie testait **une autre saisie** que la garde 24h (intervention standard ?) — si oui, aligner l'UX sur le même pattern `effective/astreinte/break`. Sinon, lui refaire une démo rapide du segmenteur existant, c'est probablement un malentendu.

**À ajouter éventuellement** : récap visible en bas du tableau des segments (`Total effectif X dont Y nuit / Total astreinte X dont Y nuit`) si pas déjà affiché.

### 1.2 Format des heures

**Problème** : affichage actuel `10.3` / `10,50` = ambigu (décimal base 100 vs sexagésimal base 60).

**À faire** : afficher systématiquement au format `10h30` ou `10:30` (jamais décimal).

### 1.3 Pause obligatoire

**Problème** : le champ "pause 20 min / 6h" est modifiable — risque que l'employeur mette `5 min` et devienne en infraction.

**À faire** :

- Passer ce champ en **info fixe** (non modifiable), affichée sous forme d'encart bleu d'information.
- Texte type : _"Pause obligatoire de 20 minutes pour toute période de travail effectif de 6 heures consécutives. La pause doit être prise d'affilée."_

### 1.4 Liste des courses — découplage du planning

**Problème** : demander de remplir la liste des courses pendant la création d'une intervention alourdit le flow et n'est pas pertinent à ce moment.

**À faire** :

- Au moment de créer l'intervention : champ facultatif avec mention "Vous pouvez remplir cette liste plus tard".
- Sur le calendrier : **pastille / badge d'alerte** (petit panier rouge) sur les jours où une liste est attendue mais non remplie.
- Conserver la possibilité de **listes récurrentes pré-remplies** (ex. courses hebdo du lundi) — cas d'usage validé par Marie elle-même.

---

## 2. Calendrier & pointage

### 2.1 Validation calendrier

Ce qui fonctionne bien et a été validé en direct :

- Récurrence d'intervention (date de fin OU nombre de répétitions)
- Détection de conflits (durée max, chevauchement)
- Affichage alertes "durée max dépassée"

### 2.2 Chrono sur page de pointage

**Problème** : l'heure qui défile en live (`16:08:42` qui tourne) est **perturbante et inutile**.

**À faire** : retirer le chrono temps réel de la page de pointage.

### 2.3 Page "Suivi des heures"

**Problème** : redondante avec le Planning et la page Équipe. Contenu peu lisible (`24 interventions`, `0 heures`, etc. — non contextualisés).

**Options proposées** :

- **Supprimer** la page "Suivi des heures" (préférence de Marie).
- OU déplacer `Équipe` dans le menu `Gestion`, et garder "Suivi des heures" uniquement si on y ajoute une **vraie valeur différentielle** (ex. les anomalies de pointage, les interventions non validées).

### 2.4 Parcours pointage "Démarrer / Terminer"

**Problème** : deux chemins possibles pour pointer (depuis le dashboard ou depuis l'intervention), pas clair. Le bouton "Démarrer" n'indique pas clairement ce qu'il fait.

**À faire** : repenser le parcours — proposer un bouton `Pointer` directement sur l'intervention du jour dans le dashboard, sans passer par plusieurs écrans.

### 2.5 Risque fraude au pointage

Point business important : en entreprise, le **pointage mobile auto-déclaratif est souvent désactivé** par crainte de fraude. Si on veut vendre aux employeurs, il faudra soit :

- Géolocalisation (paramétrée par rapport à l'adresse du bénéficiaire)
- Badge physique / NFC
- Validation croisée par l'aidant

À garder en tête mais pas prioritaire pour la sortie bêta.

---

## 3. Messagerie vs Cahier de liaison

Distinction validée :

| Canal             | Usage                                          | Accès                         |
|-------------------|------------------------------------------------|-------------------------------|
| Messagerie        | Informel (bon courage, info ponctuelle)        | Équipe salariée               |
| Cahier de liaison | Formel (médication, consignes, transmissions)  | Équipe + aidants familiaux    |

### Améliorations proposées

- **Envoi de photos** dans les deux canaux (nouveau matériel, blessure, etc.).
- **Transmission automatique** : dans le cahier de liaison, checkbox "Transmettre aux aidants" sur un événement important (fièvre, médicament oublié) → notification directe.
- **Badge "Important"** avec mise en surbrillance pour le prochain salarié qui prend le relais.

---

## 4. Conformité & paie

### 4.1 Export PDF fiche de paye

**Bug observé en live** : l'export PDF affiche une erreur / PDF cassé. À investiguer.

### 4.2 Clarifier le statut

L'écran actuel prête à confusion — bien préciser que c'est une **simulation** / **prévisualisation**, pas le bulletin légal.

### 4.3 Format d'heure (idem 1.2)

Sur la fiche générée : `10,50` → `10h30`.

---

## 5. Absences

### 5.1 "Taux de présence"

**Problème** : la stat affichée n'a pas de sens métier clair.

**À faire** : remplacer par une stat plus actionnable :

- Nombre d'absences **non pointées**
- Nombre d'absences **non justifiées**
- Contrats **non validés**

### 5.2 Libellés motifs d'absence

**Problème** : "Annonce handicap d'un enfant → 1 jour" — le libellé est mal formulé, prête à confusion (on dirait une annonce commerciale).

**À faire** : revoir tous les libellés des motifs de congés rémunérés selon le Code du travail :

- Mariage salarié : 4 jours
- Mariage enfant : 1 jour
- Naissance / adoption
- Décès conjoint / enfant / parent
- Annonce handicap d'un enfant → reformuler en _"Annonce du handicap d'un enfant"_ ou _"Diagnostic handicap d'un enfant"_

---

## 6. Stratégie produit & commercialisation

### 6.1 Refonte des formules

Plutôt que formules actuelles, passer sur une **segmentation par module** :

- **Module Cahier de liaison** : gratuit ou très bas prix — sert d'accroche (c'est LE module pivot identifié)
- **Module Messagerie** : inclus / bas prix
- **Module Paie / Conformité** : payant
- **Module Export conformité auto** : payant
- **Formule complète** : 3-5 € (tarif cible évoqué)

Logique : faire essayer gratuitement, convertir une fois accroché.

### 6.2 Pourquoi le cahier de liaison est capital

> "C'est l'un des modules les plus importants. Tu peux le vendre aux entreprises, aux aidants, à tout le monde."

Le cahier de liaison est le point d'entrée pour vendre à des profils différents (familles aidantes, agences, indépendants).

### 6.3 Ajouts produit identifiés

- **Photos contributeurs** sur la landing page (pas juste du texte)
- **Base de procédures** accessible aux salariés (utilisation fauteuil, respirateur, lève-malade, etc.) — fiches alimentées par les aidants
- **Notifications programmées** : rappels renouvellement dossiers (MDPH, PCH, etc.)

### 6.4 Cibles et présentations

| Cible              | Contact      | Action                                               |
|--------------------|--------------|------------------------------------------------------|
| Aidant testeur     | Philippe     | Tester la formule complète                           |
| Entreprise / SAMU  | Christophe   | Présentation B2B — travaille avec pompiers/SAMU      |
| Salon Autonomie    | Contact Willison | Obtenir un stand                                 |
| Réseau Anthony     | Anthony      | Réseau médical existant                              |

### 6.5 Structure juridique (conseil John)

Monter une **entreprise** (pas une association) pour ne pas se faire racheter à bas prix ou absorber par un gros acteur.

---

## 7. Prochaines étapes

### Dev — avant bêta

- [ ] Vérifier sur quelle page Marie testait la saisie jour/nuit — si hors garde 24h, aligner sur le pattern `effective/astreinte/break` existant (cf. `docs/Garde_de_24_heures.md`)
- [ ] Ajouter récap `Total effectif / Total astreinte` (dont nuit) sous le tableau de segments si absent
- [ ] Format d'heure `10h30` partout (fiches, PDF, récap)
- [ ] Pause obligatoire en mode info fixe (non modifiable)
- [ ] Découpler liste des courses de la création d'intervention + pastille calendrier
- [ ] Retirer chrono live de la page pointage
- [ ] Décision : supprimer ou refondre "Suivi des heures"
- [ ] Fix bug export PDF fiche de paye
- [ ] Remplacer "Taux de présence" par stats actionnables
- [ ] Revoir libellés motifs d'absence
- [ ] Repenser parcours pointage (bouton direct sur intervention du jour)

### Dev — post bêta

- [ ] Envoi de photos dans messagerie / cahier de liaison
- [ ] Checkbox "Transmettre aux aidants" + notification auto
- [ ] Base de procédures matériel
- [ ] Notifications renouvellement dossiers
- [ ] Réflexion anti-fraude pointage (géoloc / NFC)

### Business

- [ ] Restructurer les formules par modules
- [ ] Questionnaire utilisateur à préparer (post 1er mois d'usage)
- [ ] Préparer présentation Christophe
- [ ] Contacter Willison pour Salon Autonomie
- [ ] Ajouter photos contributeurs sur la landing

---

_Document généré depuis la transcription du 16/04/2026 — à valider avec Marie et Vincent._
