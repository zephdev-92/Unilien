# Checklist — Ecarts Prototype vs React

**Derniere mise a jour** : 9 mars 2026
**Reference prototype** : `/media/zephdev/Jeux/warp/template-final/`
**Reference React** : `/media/zephdev/Jeux/warp/unilien/src/`

---

## 1. Page Settings (absente dans React)

Le prototype a une page Settings complete avec navigation horizontale et 7 panneaux.
React n'a qu'une ProfilePage avec onglets.

- [ ] Creer la page `/parametres` avec navigation par panneaux
- [ ] **Panneau Profil** — formulaire infos personnelles (nom, email, tel, adresse, langue, format date)
- [ ] **Panneau Securite** — changement mot de passe (actuel, nouveau, confirmation)
- [ ] **Panneau Securite** — toggle 2FA avec explication
- [ ] **Panneau Securite** — Danger Zone (bordure rouge) : bouton supprimer toutes les donnees
- [ ] **Panneau Securite** — Danger Zone : bouton desactiver le compte (modale confirmation)
- [ ] **Panneau Abonnement** (employeur) — carte plan actuel (nom, prix, date renouvellement, moyen paiement)
- [ ] **Panneau Abonnement** — barres usage (employes X/X, bulletins, stockage)
- [ ] **Panneau Abonnement** — grille 3 forfaits (Starter, Standard, Pro) avec features + CTA
- [ ] **Panneau Notifications** — toggles par canal (email, SMS, push) par type de notification
- [ ] **Panneau Notifications** — frequence/planning des notifications
- [ ] **Panneau Convention** (employeur) — parametres convention IDCC 3239
- [ ] **Panneau PCH** (aidant) — configuration PCH
- [ ] **Panneau Apparence** — toggle dark/light mode
- [ ] **Panneau Apparence** — selecteur taille police
- [ ] **Panneau Apparence** — selecteur palette couleurs
- [ ] **Panneau Accessibilite** — toggle contraste eleve
- [ ] **Panneau Accessibilite** — controle echelle texte
- [ ] **Panneau Accessibilite** — toggle optimisation lecteur ecran
- [ ] **Panneau Accessibilite** — toggle police dyslexie
- [ ] **Panneau Donnees** — export/suppression donnees personnelles

---

## 2. Dashboard — Elements manquants

- [ ] **Demo banner** — bandeau "Mode demo" avec badge, texte explicatif, CTA inscription, bouton fermer
- [ ] **Onboarding banner** — 3 etapes avec progression (compte cree, ajouter employe, planifier intervention)
- [x] **Greeting enrichi** — eyebrow jour/date, chips (prochaine intervention + alertes conformite), CTA "Voir le planning" ✅
- [x] **Greeting skeleton** — skeleton loading sur le bloc greeting ✅
- [x] **Action nudges** — cartes contextuelles ("X bulletins a generer", "Valider les heures de la semaine") ✅
- [x] **Planning du jour** — tableau interventions du jour (employe, horaire, type, statut) avec lignes cliquables ✅
- [x] **Planning du jour** — empty state avec icone + message + CTA ✅
- [x] **Tendances stats** — indicateurs tendance sur les stats cards (fleche haut/bas, +1, +8%) ✅
- [x] **Quick actions** — grille 2x2/4 de boutons par role (existait deja : QuickActionsWidget) ✅
- [x] **Alertes conformite sidebar** — liste detaillee des alertes (icone, titre, description, niveau) ✅
- [ ] **Empty state dashboard** — variante onboarding quand aucun employe/intervention

---

## 3. Clock-in — Elements manquants

- [ ] **Horloge digitale** — grande horloge HH:MM:SS live avec mise a jour chaque seconde
- [ ] **Affichage date** — date complete sous l'horloge ("Mardi 3 mars 2026")
- [ ] **Resume semaine** — sidebar avec barres horizontales Lun-Ven + total heures
- [ ] **Anomalies detectees** — sidebar alertes (ex: "7h30 sans pause", "fin d'heure manquante")
- [ ] **Saisie manuelle** — formulaire ajout heure manuelle (employe, date, debut, fin)
- [ ] **Tableau heures du jour** — colonnes : employe, debut, fin, duree, statut, actions + duree temps reel

---

## 4. Profile — Elements manquants

- [ ] **Hero profil** — background colore, grand avatar 80x80, nom h1, role + badge convention
- [ ] **Hero profil** — tags : localisation, badge verifie, date inscription
- [ ] **Hero profil** — bouton "Modifier le profil"
- [ ] **Navigation ancres** — jump nav vers sections (Mon profil, Ma situation, Urgence)
- [ ] **Mode vue/edition** — toggle entre lecture seule (definition list dt/dd) et formulaire
- [ ] **Section Ma Situation** — carte informations complementaires (type handicap, precision)
- [ ] **Section Ma Situation** — panneau depliable "Besoins, CESU & convention"
- [ ] **Section Ma Situation** — carte PCH (toggle beneficiaire, champs conditionnels, taux, enveloppe)
- [ ] **Contacts d'urgence** — section dediee avec formulaire contacts urgence

---
- [ ] **Lien "Pointer"** — dans la modale detail shift (vue employe) vers clock-in

---


## 5. Compliance — Elements manquants

- [x] **Score circulaire** — anneau SVG avec pourcentage au centre (ex: 87%) ✅
- [x] **3 stat boxes** — points conformes (vert), alertes actives (rouge), avertissements (orange) ✅
- [x] **Section alertes** — legende statuts (Critique, A surveiller, Conforme) ✅
- [x] **Section alertes** — toolbar : recherche + filtre severite + filtre employe ✅
- [x] **Cards alertes** — icone, titre, description, tags (employe, date, ref legale) ✅
- [x] **Cards alertes** — boutons action "Corriger" et "Ignorer" ✅
- [x] **Checks par categorie** — groupe "Temps de travail" (4 items avec icone statut) ✅
- [x] **Checks par categorie** — groupe "Paie et remuneration" (4 items) ✅
- [x] **Checks par categorie** — groupe "Contrats et conges" (3 items) ✅

---

## 6. Team — Elements manquants

- [x] **Stats equipe** — 4 cards : employes actifs, inactifs, heures/semaine, contrats actifs ✅
- [x] **Recherche employes** — input "Rechercher un employe..." avec filtre texte ✅
- [ ] **Filtre "En conge"** — ajouter le statut "En conge" au filtre existant
- [x] **Cards enrichies** — date d'embauche dans les metadata (icone + date) ✅
- [x] **Cards enrichies** — heures/semaine dans les metadata (icone + nombre) ✅
- [x] **Cards enrichies** — email avec ellipsis dans les metadata ✅
- [x] **Modale ajout employe** — flow invitation si pas de compte (Edge Function + email) ✅

---

## 7. Logbook — Elements manquants

- [ ] **Recherche** — input "Rechercher dans le journal..."
- [ ] **Filtre categories** — Observation, Incident, Medical, Administratif
- [ ] **Timeline visuelle** — points colores sur la timeline (rouge incident, vert medical, etc.)
- [ ] **Separateurs de dates** — "Aujourd'hui", "Hier", dates formatees
- [ ] **Badges categorie** — badge colore sur chaque entree (bleu obs, rouge incident, vert medical, gris admin)
- [ ] **Edition entree** — bouton crayon pour modifier une entree existante
- [ ] **Alerte dans entree** — encart alerte conditionnel dans le corps de l'entree
- [ ] **Footer auteur** — avatar + nom auteur en bas de chaque entree

---

## 8. Landing — Elements manquants

- [ ] **Nav fonctionnalites** — liens ancres : Fonctionnalites, Conformite, Tarifs, FAQ
- [ ] **Hero enrichi** — message risque legal ("8 000 euros aux Prud'hommes") avec emphase
- [ ] **Hero enrichi** — liste reassurance (pas de CB, WCAG AAA, valide par avocat)
- [ ] **Hero enrichi** — mockup produit avec shield, alertes legales
- [ ] **Chiffres cles** — 4 stats : 280 000 beneficiaires, 2 000+ litiges, 8 000 euros, -40% admin
- [ ] **Section problemes** — 3 pain points cards avec icones
- [ ] **Section fonctionnalites** — grille 6+ feature cards (planning, bulletins, conformite, exports, PCH, analytics)
- [ ] **Section conformite** — features IDCC 3239 avec checklist
- [ ] **Section tarifs** — 3 plans (Starter, Standard, Pro) avec features, prix, CTA
- [ ] **Section FAQ** — questions depliables avec chevron rotatif
- [ ] **Footer complet** — liens par categorie, copyright, mentions legales

---

## 9. Messaging (Liaison) — Elements manquants

- [x] **Recherche conversations** — barre de recherche dans la liste des conversations ✅ (PR #137)
- [x] **Pieces jointes** — bouton attacher fichier dans le compose (images, documents) ✅ (09/03/2026)
- [x] **Labels groupes** — labels "General" et "Conversations" dans la liste ✅ (PR #137)
- [ ] **Empty state desktop** — icone + "Selectionnez une conversation" quand aucune selectionnee

---

## 10. Contact — Elements manquants

- [ ] **Subject optgroups** — categoriser les sujets (Utilisation / Compte / Autre)
- [ ] **Piece jointe** — input file (PDF, PNG, JPG, max 5 Mo)
- [ ] **Etat succes** — animation checkmark + message de confirmation + bouton "Envoyer un autre"
- [ ] **FAQ integree** — 4 questions depliables en bas de page

---

## 11. Planning — Elements manquants mineurs

- [ ] **Sidebar filtres** — liste employes avec avatars, filtre type shift, filtre statut
- [ ] **Vue employe stats** — barre stats : heures effectuees/contractuelles, interventions, conges
- [ ] **Chip prochaine intervention** — dans le topbar (vue employe)
- [ ] **Lien "Pointer"** — dans la modale detail shift (vue employe) vers clock-in

---

## 12. Documents — Ecarts de structure

Le prototype a 4 onglets : Bulletins, Contrats, Absences, Export planning.
React a 4 onglets : CESU, Bulletins, Documents, Planning.

- [ ] **Onglet Contrats** — liste documents contrats avec download, statut pill "Actif"
- [ ] **Onglet Absences** — tableau (employe, type, du, au, duree, statut, actions approuver/refuser)
- [ ] **Tableau bulletins** — format tableau (employe, periode, heures, net, statut, actions)

---

## 13. Patterns UI globaux

- [ ] **Skeleton loading dashboard** — skeletons sur greeting, nudges, stats, planning du jour
- [ ] **Empty states onboarding** — variantes specifiques quand le compte est vide
- [ ] **Toasts globaux** — verifier coherence avec le systeme du prototype (success/error/warning/info)
- [ ] **Modales** — focus management, Escape ferme, clic backdrop ferme, aria-modal

---

## Resume

| Bloc | Items | Done | Priorite |
|------|-------|------|----------|
| Settings (page complete) | 20 | 0 | Haute |
| Dashboard | 12 | 8 | Haute |
| Landing | 11 | 0 | Moyenne |
| Compliance | 9 | 9 | ✅ Termine |
| Profile | 9 | 0 | Moyenne |
| Logbook | 8 | 0 | Moyenne |
| Team | 7 | 6 | Moyenne |
| Clock-in | 6 | 0 | Moyenne |
| Contact | 4 | 0 | Basse |
| Messaging | 4 | 3 | Basse |
| Planning | 4 | 0 | Basse |
| Documents | 3 | 0 | Basse |
| Patterns UI | 4 | 0 | Basse |
| **Total** | **~101** | **26** | — |
