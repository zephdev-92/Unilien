# Checklist — Ecarts Prototype vs React

**Derniere mise a jour** : 17 mars 2026
**Reference prototype** : `/media/zephdev/Jeux/warp/template-final/`
**Reference React** : `/media/zephdev/Jeux/warp/unilien/src/`

---

## 1. Page Settings

Page `/parametres` implementee avec navigation par panneaux (SettingsPage.tsx).

- [x] Creer la page `/parametres` avec navigation par panneaux ✅
- [x] **Panneau Profil** — formulaire infos personnelles (nom, email, tel, adresse, langue, format date) ✅
- [x] **Panneau Securite** — changement mot de passe (actuel, nouveau, confirmation) ✅
- [ ] **Panneau Securite** — toggle 2FA avec explication _(badge "Bientot", disabled)_
- [ ] **Panneau Securite** — Danger Zone (bordure rouge) : bouton supprimer toutes les donnees _(badge "Bientot", disabled)_
- [ ] **Panneau Securite** — Danger Zone : bouton desactiver le compte (modale confirmation) _(badge "Bientot", disabled)_
- [x] **Panneau Abonnement** (employeur) — carte plan actuel (nom, prix, date renouvellement, moyen paiement) ✅ _(UI-only, Stripe non integre)_
- [x] **Panneau Abonnement** — barres usage (employes X/X, bulletins, stockage) ✅ _(UI-only, donnees statiques)_
- [x] **Panneau Abonnement** — grille 3 forfaits (Starter, Standard, Pro) avec features + CTA ✅ _(UI-only)_
- [x] **Panneau Notifications** — toggles par canal (push fonctionnel, email disabled "Bientot") ✅
- [ ] **Panneau Notifications** — notifications email fonctionnelles _(attente backend SendGrid/Resend)_
- [x] **Panneau Convention** (employeur) — parametres convention IDCC 3239 ✅ _(localStorage, TODO: migrer vers DB)_
- [x] **Panneau PCH** (aidant) — configuration PCH ✅ _(localStorage)_
- [ ] **Panneau Apparence** — toggle dark/light mode _(badge "Bientot", disabled)_
- [x] **Panneau Apparence** — selecteur densite (confortable/compact) ✅ _(localStorage)_
- [ ] **Panneau Apparence** — selecteur palette couleurs
- [x] **Panneau Accessibilite** — toggle contraste eleve ✅ _(Zustand + localStorage)_
- [x] **Panneau Accessibilite** — controle echelle texte (slider 80-150%) ✅
- [x] **Panneau Accessibilite** — toggle optimisation lecteur ecran ✅
- [x] **Panneau Accessibilite** — toggle police dyslexie ✅
- [x] **Panneau Donnees** — export JSON (7 tables) + CSV (planning) ✅
- [ ] **Panneau Donnees** — toggles confidentialite (analytics, cookies) _(badge "Bientot", disabled)_

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

## 3. Clock-in — ✅ Termine

- [x] **Horloge digitale** — grande horloge HH:MM:SS live avec mise a jour chaque seconde _(LiveClock.tsx)_
- [x] **Affichage date** — date complete sous l'horloge _(LiveClock.tsx)_
- [x] **Resume semaine** — sidebar avec barres horizontales Lun-Dim + total heures _(WeeklySummary.tsx)_
- [x] **Anomalies detectees** — sidebar alertes _(AnomaliesPanel.tsx)_
- [x] **Saisie manuelle** — formulaire ajout heure manuelle avec selecteur auxiliaire _(ManualEntryForm.tsx)_
- [x] **Tableau heures du jour** — colonnes avec nom auxiliaire (employeur), duree temps reel, statut, actions _(TodayTable.tsx)_

---

## 4. Profile — ✅ Termine

- [x] **Hero profil** — background colore, grand avatar 80x80, nom h1, role + badge convention _(ProfileHero.tsx)_
- [x] **Hero profil** — tags : localisation, badge verifie, date inscription _(ProfileHero.tsx)_
- [x] **Hero profil** — bouton "Modifier le profil" _(ProfileHero.tsx)_
- [x] **Navigation ancres** — jump nav vers sections (Mon profil, Ma situation, Urgence) _(ProfileJumpNav.tsx)_
- [x] **Mode vue/edition** — toggle entre lecture seule (definition list dt/dd) et formulaire _(ProfilePage.tsx + ProfileViewList.tsx)_
- [x] **Section Ma Situation** — carte informations complementaires (type handicap, precision) _(EmployerSection.tsx — existait, restructure dans ProfilePage)_
- [x] **Section Ma Situation** — panneau depliable "Besoins, CESU & convention" _(EmployerSection.tsx — Collapsible)_
- [x] **Section Ma Situation** — carte PCH (toggle beneficiaire, champs conditionnels, taux, enveloppe) _(EmployerSection.tsx — existait)_
- [x] **Contacts d'urgence** — section dediee avec formulaire contacts urgence _(ProfilePage.tsx — EmergencyContactsView/Edit)_

---

## 5. Compliance — ✅ Termine

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

## 6. Team — ✅ Termine

- [x] **Stats equipe** — 4 cards : employes actifs, inactifs, heures/semaine, contrats actifs ✅
- [x] **Recherche employes** — input "Rechercher un employe..." avec filtre texte ✅
- [x] **Filtre "En conge"** — ajouter le statut "En conge" au filtre existant ✅
- [x] **Cards enrichies** — date d'embauche dans les metadata (icone + date) ✅
- [x] **Cards enrichies** — heures/semaine dans les metadata (icone + nombre) ✅
- [x] **Cards enrichies** — email avec ellipsis dans les metadata ✅
- [x] **Modale ajout employe** — flow invitation si pas de compte (Edge Function + email) ✅

---

## 7. Logbook — ✅ Termine

- [x] **Recherche** — input "Rechercher dans le journal..." _(LogbookFilters.tsx)_
- [x] **Filtre categories** — Observation, Incident, Alerte, Instruction en pills toggleables _(LogbookFilters.tsx)_
- [x] **Timeline visuelle** — points colores sur la timeline (bleu obs, rouge incident, orange alerte, violet instruction) _(LogEntryCard.tsx)_
- [x] **Separateurs de dates** — "Aujourd'hui", "Hier", dates formatees _(LogbookPage.tsx)_
- [x] **Badges categorie** — badge colore par type sur chaque entree _(LogEntryCard.tsx)_
- [x] **Edition entree** — bouton crayon pour modifier une entree existante _(EditLogEntryModal.tsx)_
- [x] **Alerte dans entree** — encart alerte conditionnel pour incidents et urgents _(LogEntryCard.tsx)_
- [x] **Footer auteur** — avatar + nom + role auteur en bas de chaque entree _(LogEntryCard.tsx)_

---

## 8. Landing — ✅ Termine

- [x] **Nav fonctionnalites** — liens ancres : Fonctionnalites, Conformite, Tarifs, FAQ ✅ (PR #155)
- [x] **Hero enrichi** — message risque legal ("8 000 euros aux Prud'hommes") avec emphase ✅ (PR #155)
- [x] **Hero enrichi** — liste reassurance (pas de CB, WCAG AAA, valide par avocat) ✅ (PR #155)
- [x] **Hero enrichi** — mockup produit avec shield, alertes legales ✅ (PR #155)
- [x] **Chiffres cles** — 4 stats : 280 000 beneficiaires, 2 000+ litiges, 8 000 euros, -40% admin ✅ (PR #155)
- [x] **Section problemes** — 3 pain points cards avec icones ✅ (PR #155)
- [x] **Section fonctionnalites** — grille 6+ feature cards (planning, bulletins, conformite, exports, PCH, analytics) ✅ (PR #155)
- [x] **Section conformite** — features IDCC 3239 avec checklist ✅ (PR #155)
- [x] **Section tarifs** — 3 plans (Gratuit, Essentiel, Pro) avec features, prix, CTA ✅ (PR #155)
- [x] **Section FAQ** — questions depliables avec chevron rotatif ✅ (PR #155)
- [x] **Footer complet** — liens par categorie, copyright, mentions legales ✅ (PR #155)

---

## 9. Messaging (Liaison) — ✅ Termine

- [x] **Recherche conversations** — barre de recherche dans la liste des conversations ✅ (PR #137)
- [x] **Pieces jointes** — bouton attacher fichier dans le compose (images, documents) ✅ (09/03/2026)
- [x] **Labels groupes** — labels "General" et "Conversations" dans la liste ✅ (PR #137)
- [x] **Empty state desktop** — icone + "Selectionnez une conversation" quand aucune selectionnee ✅ _(LiaisonPage.tsx l.657-667)_

---

## 10. Contact — Elements manquants

- [ ] **Subject optgroups** — categoriser les sujets (Utilisation / Compte / Autre)
- [ ] **Piece jointe** — input file (PDF, PNG, JPG, max 5 Mo)
- [x] **Etat succes** — animation checkmark + message de confirmation + bouton "Envoyer un autre" ✅ _(ContactPage.tsx l.155-167)_
- [x] **FAQ integree** — questions en bas de page ✅ _(ContactPage.tsx l.262-281, affichage statique)_

---

## 11. Planning — ✅ Termine

- [x] **Sidebar filtres** — liste employes avec avatars, filtre type shift, filtre statut _(PlanningSidebar.tsx)_
- [x] **Vue employe stats** — barre stats : heures effectuees/contractuelles, interventions, conges _(PlanningStatsBar.tsx)_
- [x] **Chip prochaine intervention** — dans le topbar (vue employe) _(NextShiftChip)_
- [x] **Lien "Pointer"** — dans la modale detail shift (vue employe) vers clock-in ✅ _(ShiftDetailModal.tsx l.422-426)_

---

## 12. Documents — ✅ Termine

- [x] **Onglet Contrats** — liste documents contrats avec download, statut pill "Actif" ✅ _(ContractsSection.tsx)_
- [x] **Onglet Absences** — tableau (employe, type, du, au, duree, statut, actions approuver/refuser) ✅ _(DocumentManagementSection.tsx)_
- [x] **Tableau bulletins** — format tableau (employe, periode, heures, net, statut, actions) ✅ _(PayslipSection.tsx)_

---

## 13. Patterns UI globaux

- [x] **Skeleton loading dashboard** — skeletons sur greeting et action nudges ✅ _(partiel — widgets individuels)_
- [ ] **Empty states onboarding** — variantes specifiques quand le compte est vide
- [ ] **Toasts globaux** — verifier coherence avec le systeme du prototype (success/error/warning/info)
- [x] **Modales** — focus management, Escape ferme, clic backdrop ferme, aria-modal ✅ _(Chakra Dialog natif + aria-modal sur modales custom)_

---

## Resume

| Bloc | Items | Done | Priorite |
|------|-------|------|----------|
| Settings | 22 | 15 | Moyenne (7 items "Bientot") |
| Dashboard | 11 | 8 | Moyenne |
| Landing | 11 | 11 | ✅ Termine |
| Compliance | 9 | 9 | ✅ Termine |
| Profile | 9 | 9 | ✅ Termine |
| Logbook | 8 | 8 | ✅ Termine |
| Team | 7 | 7 | ✅ Termine |
| Clock-in | 6 | 6 | ✅ Termine |
| Contact | 4 | 2 | Basse |
| Messaging | 4 | 4 | ✅ Termine |
| Planning | 4 | 4 | ✅ Termine |
| Documents | 3 | 3 | ✅ Termine |
| Patterns UI | 4 | 2 | Basse |
| **Total** | **102** | **88** | — |
