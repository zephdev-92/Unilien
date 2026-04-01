# Conformite donnees medicales et sensibles

_Derniere mise a jour : 01 avril 2026_

---

## Contexte

Unilien collecte des donnees relatives au handicap et a la situation medicale des employeurs (personnes en situation de handicap). Ces donnees sont qualifiees de **donnees sensibles** au sens du RGPD (Article 9) et necessitent des mesures de protection renforcees.

---

## 1. Inventaire des donnees sensibles

### Table `employer_health_data` (migration 043 — isolee depuis le 30/03/2026)

| Colonne | Type | Sensibilite | Description |
|---------|------|-------------|-------------|
| `handicap_type` | text | **Sante** | Type de handicap (moteur, visuel, auditif, cognitif, psychique, polyhandicap, maladie_invalidante, autre) |
| `handicap_name` | text | **Sante** | Precision du handicap (ex: Paraplegie, DMLA, Autisme) |
| `specific_needs` | text | **Sante** | Besoins specifiques lies au handicap |

> **Important** : ces colonnes ont ete **deplacees** de la table `employers` vers `employer_health_data` (migration 043). La table est protegee par RLS **owner-only** (`profile_id = auth.uid()`). Les employes et aidants n'y ont plus acces.

### Table `employers` (donnees medico-administratives restantes)

| Colonne | Type | Sensibilite | Description |
|---------|------|-------------|-------------|
| `pch_beneficiary` | boolean | Medico-admin | Statut beneficiaire PCH |
| `pch_type` | text | Medico-admin | Type de dispositif PCH |
| `pch_monthly_amount` | numeric | Medico-admin | Montant PCH mensuel |
| `pch_monthly_hours` | numeric | Medico-admin | Heures PCH allouees |
| `emergency_contacts` | jsonb[] | Personnel | Contacts d'urgence (nom, telephone, relation) |
| `address` | jsonb | Personnel | Adresse du domicile |

### Table `user_consents` (migration 042)

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | Utilisateur concerne |
| `consent_type` | text | Type de consentement (`health_data`, `cookie`) |
| `granted_at` | timestamptz | Date du consentement |
| `revoked_at` | timestamptz | Date de revocation (nullable) |
| `ip_address` | text | IP au moment du consentement |
| `user_agent` | text | Navigateur au moment du consentement |

### Table `audit_logs` (migration 044)

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | Utilisateur ayant effectue l'action |
| `action` | text | `read`, `create`, `update`, `delete`, `grant_consent`, `revoke_consent` |
| `resource` | text | Table/ressource concernee |
| `resource_id` | UUID | ID de la ressource |
| `fields_accessed` | text[] | Colonnes accedees |

> Table **immuable** : policy `INSERT` uniquement, pas de `DELETE` ni `UPDATE`.

### Composants front-end concernes

- `HealthDataConsentModal` — modale de consentement explicite (RGPD art. 9)
- `EmployerSection.tsx` — formulaire de saisie (handicap, PCH, CESU, contacts urgence)
- `ProfilePage.tsx` — affichage mode lecture (EmployerSituationView, EmergencyContactsView)

### Hooks et services concernes

- `useHealthConsent` — hook de gestion du consentement (grant/revoke)
- `auditService.ts` — journalisation des acces aux donnees sensibles
- `profileService.ts` — CRUD Supabase avec `sanitizeText()` sur les champs texte
- `accountService.ts` — suppression compte et donnees (RPC `delete_own_data`, `delete_own_account`)

### Migrations DB

- `024_auto_create_role_row_on_signup.sql` — creation automatique ligne employers
- `031_add_pch_fields.sql` — colonnes PCH
- **`042_user_consents.sql`** — table consentements (grant/revoke + metadata)
- **`043_employer_health_data.sql`** — isolation donnees sante dans table dediee
- **`044_audit_logs.sql`** — journal d'acces immuable
- **`047_delete_account.sql`** — RPC suppression donnees + compte (RGPD art. 17)

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
| RLS (Row Level Security) | ✅ | `employer_health_data` : RLS **owner-only** (`profile_id = auth.uid()`) |
| Isolation donnees sante | ✅ | Table `employer_health_data` separee de `employers` (migration 043) |
| Acces employes/aidants | ✅ | **Bloque** — employes et aidants ne peuvent plus lire `handicap_type`, `handicap_name`, `specific_needs` |
| Consentement explicite | ✅ | `HealthDataConsentModal` + `useHealthConsent` + table `user_consents` (migration 042) |
| Journal d'acces | ✅ | Table `audit_logs` immuable + `auditService.ts` (migration 044) |
| Droit a l'effacement | ✅ | RPC `delete_own_data` supprime toutes les donnees + anonymise les audit logs (migration 047) |
| Suppression de compte | ✅ | RPC `delete_own_account` avec double confirmation UI (migration 047) |
| Sanitisation | ✅ | `sanitizeText()` applique sur les champs texte avant ecriture |
| Champs optionnels | ✅ | Tous les champs medicaux sont optionnels |
| Mentions legales | ✅ | Texte d'information dans la modale de consentement + `LegalPage` |

### Ce qui reste a faire

| Mesure | Priorite | Description |
|--------|----------|-------------|
| **Chiffrement colonnes** | Haute | Chiffrer `handicap_type`, `handicap_name`, `specific_needs` avec `pgsodium` — en attente migration Supabase self-hosted |
| **Duree de conservation** | Moyenne | Politique de suppression automatique apres fin des contrats |
| **Registre des traitements** | Basse | Document formel pour la CNIL |

---

## 4. Etat d'implementation

### Phase 1 — Consentement et information ✅ (PR #203, 30/03/2026)

- **`HealthDataConsentModal`** : modale affichee avant toute saisie de donnees de sante
- **`useHealthConsent`** : hook grant/revoke avec metadata (IP, user-agent)
- **Table `user_consents`** (migration 042) : horodatage + IP + user-agent pour preuve de consentement
- **Revocation** : le retrait du consentement bloque l'acces aux champs sante cote UI
- **Mentions legales** : texte dans la modale + page mentions legales

### Phase 2 — Isolation et audit ✅ (PR #203, 30/03/2026)

- **Table `employer_health_data`** (migration 043) : donnees sante isolees avec RLS owner-only
- **Table `audit_logs`** (migration 044) : journal immuable de tous les acces aux donnees sensibles
- **`auditService.ts`** : log automatique des lectures/ecritures sur les ressources sensibles

### Phase 3 — Droit a l'effacement ✅ (PR #207, 31/03/2026)

- **RPC `delete_own_data`** (`SECURITY DEFINER`) : supprime toutes les donnees utilisateur, anonymise les audit logs
- **RPC `delete_own_account`** : appelle `delete_own_data` puis supprime le compte `auth.users`
- **Double confirmation UI** : saisie manuelle "SUPPRIMER" / "SUPPRIMER MON COMPTE"
- Accessible dans Parametres > Zone de danger

### Phase 4 — Chiffrement colonnes (a venir)

**Colonnes a chiffrer** (table `employer_health_data`) :
- `handicap_type`
- `handicap_name`
- `specific_needs`

```sql
-- Activer pgsodium (disponible apres migration Supabase self-hosted)
CREATE EXTENSION IF NOT EXISTS pgsodium;
SELECT pgsodium.create_key(name := 'medical_data_key');
```

> **Statut** : en attente de la migration vers Supabase self-hosted. Les donnees sont protegees par RLS owner-only en attendant.

---

## 5. Acces par role — Matrice (mise a jour 01/04/2026)

### Donnees de sante (`employer_health_data`)

| Donnee | Employeur (proprietaire) | Employe | Aidant | Tuteur/Curateur |
|--------|--------------------------|---------|--------|-----------------|
| `handicap_type` | Lecture + Ecriture | **Bloque** | **Bloque** | **Bloque** |
| `handicap_name` | Lecture + Ecriture | **Bloque** | **Bloque** | **Bloque** |
| `specific_needs` | Lecture + Ecriture | **Bloque** | **Bloque** | **Bloque** |

> La table `employer_health_data` est protegee par RLS **owner-only** (`profile_id = auth.uid()`). Seul l'employeur proprietaire peut lire et modifier ses donnees de sante. Les employes, aidants et tuteurs n'y ont pas acces.

### Donnees employeur (`employers`)

| Donnee | Employeur (proprietaire) | Employe (contrat actif) | Aidant (lie) | Tuteur/Curateur |
|--------|--------------------------|------------------------|--------------|-----------------|
| `pch_*` | Lecture + Ecriture | Non | **Lecture** | Lecture + Ecriture |
| `emergency_contacts` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |
| `address` | Lecture + Ecriture | **Lecture** | **Lecture** | Lecture + Ecriture |

---

## 6. References juridiques

- **RGPD** — Reglement (UE) 2016/679, articles 5, 6, 9, 17, 30
- **Loi Informatique et Libertes** — Loi n°78-17 du 6 janvier 1978 modifiee
- **Code de la sante publique** — Articles L.1111-8 et R.1111-8-8 (HDS)
- **CNIL** — Guide pratique "Les bases legales du RGPD" et "Donnees de sante"
- **Convention IDCC 3239** — Convention collective du particulier employeur et de l'emploi a domicile

---

## 7. Checklist de mise en conformite

- [x] Consentement explicite (table `user_consents` + `HealthDataConsentModal` + `useHealthConsent`) — PR #203
- [x] Mentions legales dans la modale de consentement + `LegalPage`
- [x] Isolation donnees sante (table `employer_health_data`, RLS owner-only) — migration 043
- [x] Restriction acces employes/aidants aux colonnes sante — migration 043
- [x] Journal d'acces aux donnees sensibles (table `audit_logs` + `auditService.ts`) — migration 044
- [x] Droit a l'effacement donnees (RPC `delete_own_data`) — migration 047
- [x] Suppression de compte (RPC `delete_own_account` + double confirmation UI) — migration 047
- [ ] Chiffrer les colonnes sensibles (pgsodium) — en attente migration self-hosted
- [ ] Definir la duree de conservation et la politique de purge
- [ ] Creer le registre des traitements (document CNIL)
