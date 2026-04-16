# Politique de conservation des données — Unilien

_Dernière mise à jour : 16 avril 2026_

---

## 1. Contexte et base légale

Unilien collecte et traite des données personnelles dans le cadre de la gestion de l'emploi à domicile pour personnes en situation de handicap. Conformément au **RGPD article 5.1(e)** (limitation de la conservation), les données ne doivent pas être conservées au-delà de la durée nécessaire à leur finalité.

Cette politique définit les durées de conservation applicables et les mécanismes de purge automatique implémentés.

### Références réglementaires

| Texte | Application |
|-------|-------------|
| RGPD art. 5.1(e) | Limitation de la conservation |
| RGPD art. 9 | Données de santé — traitement interdit sauf exceptions |
| RGPD art. 17 | Droit à l'effacement (implémenté via `delete_own_data` / `delete_own_account`) |
| Code du travail L3243-4 | Conservation des bulletins de paie — 5 ans |
| Code du travail L1234-19 | Conservation des documents contractuels — 5 ans après fin de contrat |
| Code de la sécurité sociale | Prescription URSSAF — 3 ans |
| Code civil art. 2224 | Prescription de droit commun — 5 ans |

---

## 2. Durées de conservation

Le point de départ de la durée de rétention est la **date de fin du dernier contrat actif** de l'employeur. Tant qu'un contrat est actif ou suspendu, aucune donnée n'est purgée.

| Catégorie | Données concernées | Durée | Justification |
|-----------|-------------------|-------|---------------|
| **Contrats** | Table `contracts` | 5 ans | Code du travail — prescription prud'homale |
| **Bulletins de paie** | Table `payslips` + PDFs Storage | 5 ans | Code du travail L3243-4 |
| **Interventions** | Table `shifts` | 5 ans | Lié aux bulletins de paie (preuve des heures) |
| **Absences** | Table `absences` + justificatifs Storage | 5 ans | Prescription prud'homale (litiges congés/maladie) |
| **Déclarations CESU** | Table `cesu_declarations` + PDFs Storage | 3 ans | Prescription URSSAF |
| **Données de santé** | Table `employer_health_data` | 6 mois | RGPD art. 9 — finalité cessée + délai de grâce |
| **Messages** | Tables `conversations` + `liaison_messages` | 2 ans | Pas d'obligation légale — durée raisonnable |
| **Notifications** | Tables `notifications`, `push_subscriptions`, `notification_preferences` | 6 mois | Pas d'obligation légale — données éphémères |
| **Journal d'audit** | Table `audit_logs` | 5 ans | Traçabilité CNIL recommandée |

---

## 3. Cas particuliers

### 3.1. Suppression volontaire par l'utilisateur (RGPD art. 17)

L'utilisateur peut à tout moment demander la suppression de ses données via **Paramètres > Zone de danger** :

- **Supprimer mes données** (`delete_own_data`) : supprime toutes les données personnelles, anonymise les audit logs
- **Supprimer mon compte** (`delete_own_account`) : supprime les données + le compte auth

Ces actions sont immédiates et ne dépendent pas de la politique de rétention.

### 3.2. Contrats actifs

Aucune purge automatique n'est effectuée tant qu'au moins un contrat de l'employeur est en statut `active` ou `suspended`. La rétention ne commence qu'après la fin du **dernier** contrat.

### 3.3. Données partagées

Les données liées à une relation employeur-employé (shifts, absences, messages) sont purgées en se basant sur le contrat de l'employeur. Les employés et aidants conservent leur profil tant qu'ils ont d'autres contrats actifs.

### 3.4. Fichiers Storage (Supabase)

Les fichiers stockés dans Supabase Storage (bulletins PDF, justificatifs, avatars) suivent les mêmes durées que leurs tables associées. La purge des enregistrements DB n'entraîne pas automatiquement la suppression des fichiers Storage — un nettoyage complémentaire est nécessaire (voir section 5).

### 3.5. Audit logs

Les audit logs de type `purge_retention` (preuve de la purge elle-même) sont conservés au-delà des 5 ans — ils ne sont jamais purgés automatiquement, pour garantir la traçabilité de la conformité.

---

## 4. Implémentation technique

### 4.1. Table de configuration

```sql
-- Table : data_retention_policy (migration 050)
-- Colonnes : data_category, retention_months, description, legal_basis
```

Les durées sont configurables en base de données. Toute modification doit être validée par le responsable légal et documentée.

### 4.2. Fonction de purge

```sql
-- RPC : purge_expired_data()
-- Type : SECURITY DEFINER (exécution avec les droits owner)
-- Retour : jsonb avec le nombre d'éléments purgés par catégorie
```

La fonction :
1. Identifie les employeurs dont **tous** les contrats sont terminés
2. Pour chaque catégorie, vérifie si la durée de rétention est dépassée
3. Supprime les données expirées
4. Inscrit chaque purge dans `audit_logs` (action `purge_retention`)

### 4.3. Exécution

| Méthode | Disponibilité | Fréquence |
|---------|--------------|-----------|
| Appel manuel | Disponible | `SELECT purge_expired_data()` |
| pg_cron | Supabase Pro requis | `0 3 1 * *` (1er du mois, 3h) |
| Edge Function schedulée | Alternative | Cron externe appelant la RPC |

**Recommandation** : exécuter la purge **une fois par mois**, de nuit, pour minimiser l'impact sur les performances.

---

## 5. Limitations actuelles et TODO

| Élément | Statut | Description |
|---------|--------|-------------|
| Purge DB | ✅ Implémenté | RPC `purge_expired_data()` (migration 050) |
| Configuration | ✅ Implémenté | Table `data_retention_policy` modifiable |
| Audit trail | ✅ Implémenté | Chaque purge loguée dans `audit_logs` |
| Exécution automatique | ⏳ En attente | Nécessite pg_cron (Supabase Pro) ou cron externe |
| Purge fichiers Storage | ⏳ En attente | Les PDFs/images dans Storage ne sont pas encore purgés automatiquement |
| Notification pré-suppression | ⏳ En attente | Prévenir l'utilisateur 30 jours avant la purge |
| Archivage avant purge | ⏳ En attente | Option d'export des données avant suppression définitive |

---

## 6. Processus de révision

Cette politique doit être révisée :
- **Annuellement** dans le cadre de la revue RGPD
- **À chaque changement réglementaire** affectant les durées de conservation
- **À chaque évolution fonctionnelle** introduisant de nouvelles catégories de données

Toute modification des durées dans `data_retention_policy` doit être accompagnée d'une mise à jour de ce document et d'une entrée dans `audit_logs`.

---

## 7. Contact

Pour toute question relative à la conservation des données :
- **Responsable du traitement** : l'employeur (utilisateur Unilien)
- **Contact technique** : vzepharren@gmail.com
