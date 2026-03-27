# Offensive security review

_Date: 2026-03-18_

> **Update 2026-03-26** — This document reflects the **offensive review as of the review date**. Subsequent fixes are in **`supabase/migrations/041_security_fixes.sql`** with a summary in **`docs/SECURITY_CHECK_2026-03-26.md`**. Use the historical findings below for **regression testing**; see **Current posture** for the post-migration state.

## Scope and attacker model

This review assumes a **bug bounty / external attacker** with:
- no insider access,
- only a normal user account they can register themselves,
- access to the shipped frontend, browser traffic, the public Supabase URL, and the public anon key.

Because the frontend embeds the Supabase URL and anon key, every issue below is described as something an attacker can exercise directly over the Supabase REST / RPC / Storage surface, without relying on hidden admin tools.

---

## Executive summary

The application is currently vulnerable to at least **three critical account/tenant compromise paths**:

1. **Caregiver self-service update policy can be abused as a full mass-assignment primitive on `caregivers`**.
2. **That primitive can be chained into cross-tenant takeover** by rewriting `employer_id`, `permissions`, and `legal_status`, then inheriting RLS-based access to another family/team.
3. **Medical justification documents are stored in a bucket created as `public = true` and exposed via `getPublicUrl()`**, which is incompatible with health/privacy-sensitive data.

There were also strong secondary findings (historical):
- **global profile enumeration** for any user who becomes an employer,
- **arbitrary notification injection / in-app spam** for any authenticated user.

---

## Current posture (2026-03-26)

| Area | Status after migration 041 |
|------|----------------------------|
| Caregiver self-update | **Addressed** — `Caregivers can update own profile limited` locks `legal_status`, `employer_id`, `permissions`, `permissions_locked` on self-service updates |
| Justifications bucket | **Addressed** — `public = false` for bucket `justifications`; app uses signed URLs (`absenceJustificationService`) |
| Profile enumeration | **Mitigated** — employer/tutor search policies tightened |
| Notifications / RPC | **Addressed** — `notifications_insert_own`; `create_notification` enforces business relationship + safe `action_url` |

Re-test suggested on staging: REST replay of old PoCs should **fail** where 041 applies.

---

## Finding 1 — Caregiver row mass assignment via self-update policy

- **Attack name:** Caregiver self-escalation via unrestricted row update
- **Severity:** Critical
- **Prerequisites:** Attacker has any authenticated account linked as a caregiver, or can get added once as a caregiver to any employer.

### Why this works

The database grants caregivers the ability to update **their own row** in `caregivers` with this policy:

- `USING (profile_id = auth.uid())`
- `WITH CHECK (profile_id = auth.uid())`

There is **no column-level restriction** in the policy, so a caregiver is not limited to “profile” fields like relationship details or address; they can potentially update **security-critical columns** on the same row as well, including `permissions`, `permissions_locked`, `legal_status`, and `employer_id`. The frontend helper `updateCaregiverProfile()` only sends a safe subset, but the attacker is not constrained to frontend code and can call Supabase REST directly. 

### Exploitation scenario

1. Register a normal caregiver account.
2. Get invited once by any employer, or compromise a low-value caregiver account.
3. Extract the Supabase URL and anon key from the frontend.
4. Send a direct REST `PATCH` against `caregivers` with the bearer token of that caregiver.
5. Overwrite high-value fields such as:
   - `permissions`
   - `legal_status`
   - `permissions_locked`
   - `employer_id`

### Example payload

```http
PATCH /rest/v1/caregivers?profile_id=eq.<attacker_uuid>
Authorization: Bearer <attacker_jwt>
apikey: <public_anon_key>
Content-Type: application/json
Prefer: return=representation

{
  "permissions": {
    "canViewPlanning": true,
    "canEditPlanning": true,
    "canViewLiaison": true,
    "canWriteLiaison": true,
    "canManageTeam": true,
    "canExportData": true
  },
  "legal_status": "tutor",
  "permissions_locked": false,
  "can_replace_employer": true
}
```

### Impact

- privilege escalation from limited caregiver to high-privilege caregiver,
- unauthorized access to planning, team, compliance, and liaison/logbook data,
- setup for deeper tenant takeover by changing `employer_id`.

### At-scale weaponization

An attacker can automate this against every caregiver account they control and instantly convert low-privilege invitations into privileged access footholds.

### Remediation status (2026-03-26)

**Addressed in `041_security_fixes.sql`** — policy **`Caregivers can update own profile limited`**: `legal_status`, `employer_id`, `permissions`, and `permissions_locked` cannot be changed in self-service. Re-test direct `PATCH` from the PoCs; expect failure.

---

## Finding 2 — Cross-tenant takeover by rewriting `employer_id` on the caregiver row

- **Attack name:** Cross-tenant RLS pivot through mutable relationship record
- **Severity:** Critical
- **Prerequisites:** Attacker controls a caregiver account with any existing caregiver row.

### Why this works

Multiple RLS policies trust the contents of `caregivers.employer_id`, `caregivers.permissions`, and `caregivers.legal_status` to decide access to other tables such as `employers`, `contracts`, `shifts`, `absences`, `log_entries`, `profiles`, and storage access for justifications. If the attacker can mutate their own caregiver row, they can point that row at a **different employer** and then satisfy downstream RLS checks.

Examples:
- caregiver read access to employer contracts based on `caregivers.employer_id = contracts.employer_id` plus JSON permission checks,
- tutor/curator access to absences, contracts, logs, and employee profiles based on `caregivers.legal_status IN ('tutor', 'curator')`,
- storage access to justifications for tutors/curators via `caregivers.employer_id` joined to contracts.

### Exploitation scenario

1. Start from Finding 1.
2. Update your own caregiver row to set:
   - `employer_id = <target_employer_uuid>`
   - `legal_status = 'tutor'` or `'curator'`
   - elevated permissions JSON where relevant.
3. Call Supabase REST endpoints directly:
   - `/rest/v1/contracts`
   - `/rest/v1/shifts`
   - `/rest/v1/absences`
   - `/rest/v1/log_entries`
   - `/rest/v1/profiles`
4. Query or modify the target tenant’s data under RLS-approved conditions.

### Example pivot payload

```http
PATCH /rest/v1/caregivers?profile_id=eq.<attacker_uuid>
Authorization: Bearer <attacker_jwt>

{
  "employer_id": "<target_employer_uuid>",
  "legal_status": "tutor",
  "permissions": {
    "canViewPlanning": true,
    "canEditPlanning": true,
    "canViewLiaison": true,
    "canWriteLiaison": true,
    "canManageTeam": true,
    "canExportData": true
  }
}
```

Then, for example:

```http
GET /rest/v1/contracts?select=*&employer_id=eq.<target_employer_uuid>
Authorization: Bearer <attacker_jwt>
```

### Realistic impact

- full read access to another employer’s workforce relationships,
- read/update access to sensitive absences,
- read/create/update/delete access to logbook data depending on chosen flags,
- access to employee identities and potentially medical/administrative evidence.

### How an attacker pivots further

Once inside a target tenant, the attacker can:
- harvest employee UUIDs and schedules,
- monitor future shifts for stalking or fraud,
- alter logbook entries or absence statuses,
- pull justification URLs or storage objects,
- create misleading internal records to support social engineering.

### Remediation status (2026-03-26)

**Addressed** — same **limited** policy as Finding 1: `employer_id` cannot be rewritten by the caregiver on self-update. Replay cross-tenant PoCs against a DB with **041** applied.

---

## Finding 3 — Public medical-document bucket for absence justifications

- **Attack name:** Public storage exposure of health-related supporting documents
- **Severity:** Critical
- **Prerequisites:** None for download once object paths are known.

### Why this works

The `justifications` bucket is created with `public = true`, and the application explicitly returns a **public URL** using `getPublicUrl()` after upload. Even though a later migration drops a `Public read access` policy, the bucket creation itself remains public and no migration in the repository switches it back to private.

This is especially serious because the uploaded files are sick-leave / justification documents, i.e. potentially medical or highly sensitive HR records.

### Exploitation scenario

1. Obtain or guess an object path in the `justifications` bucket.
2. Fetch the file directly over HTTPS without being authenticated.
3. Repeat for additional victims.

### Example object naming pattern

The application generates predictable object names:

```text
<employee_uuid>/arret_YYYY_MM_DD_<timestamp>.pdf
<employee_uuid>/justificatif_YYYY_MM_DD_<timestamp>.png
```

### Practical attacker paths to object discovery

- read `justification_url` from application data after exploiting Finding 2,
- scrape URLs from browser history, logs, or shared links,
- enumerate candidate employee UUIDs from Finding 4,
- brute-force timestamps around known absence dates.

### Impact

- direct disclosure of medical/administrative documents,
- privacy breach affecting employees,
- likely reportable regulatory exposure.

### At-scale weaponization

A motivated attacker can build a collector for all leaked `publicUrl` values and exfiltrate documents in bulk, then use the contents for extortion, identity fraud, or targeted phishing.

### Remediation status (2026-03-26)

**Mitigated** — `UPDATE storage.buckets SET public = false WHERE id = 'justifications'` in **041**; client uses **signed URLs** (`createSignedUrl` in `absenceJustificationService.ts`). Re-test unauthenticated fetch of old public URL patterns.

---

## Finding 4 — Global profile enumeration for any employer account

- **Attack name:** Full profile directory disclosure through over-broad search policy
- **Severity:** High
- **Prerequisites:** Attacker can register as an employer.

### Why this works

The profiles RLS policy intended for email lookup is written as:

- `EXISTS (SELECT 1 FROM employers WHERE employers.profile_id = auth.uid())`

That condition is **not scoped to a searched email, target relationship, or tenant boundary**. In practice, once an attacker has any employer account, they satisfy the policy for **every row in `profiles`**. Because RLS works at the row level, they can then select broad profile data, not just the minimal fields used by the UI helper.

### Exploitation scenario

1. Register as employer.
2. Authenticate and obtain your JWT.
3. Query the profiles table directly.
4. Dump all rows and fields allowed by grants.

### Example payloads

```http
GET /rest/v1/profiles?select=id,first_name,last_name,email,phone,role
Authorization: Bearer <employer_jwt>
```

Or simply:

```http
GET /rest/v1/profiles?select=*
Authorization: Bearer <employer_jwt>
```

### Impact

- global directory leak of users,
- exposure of names, emails, phone numbers, roles, avatars, and related metadata,
- seed data for credential stuffing, spear phishing, and patient/family targeting.

### At-scale weaponization

A single attacker-employer account can become a full user enumeration oracle for the entire platform.

### Remediation status (2026-03-26)

**Mitigated** — employer and tutor **search** policies on `profiles` rewritten in **041** to require relationship to returned rows (contract / caregiver / self). Re-test broad `GET /profiles` as employer.

---

## Finding 5 — Arbitrary notification injection for any authenticated user

- **Attack name:** Cross-user notification injection / in-app phishing primitive
- **Severity:** High
- **Prerequisites:** Any authenticated user.

### Why this works

There are **two** paths that let any authenticated user create notifications for other users:

1. the `notifications_insert` policy only checks that `auth.uid()` is not null,
2. the `create_notification` `SECURITY DEFINER` RPC only checks that the caller is authenticated, then inserts a notification for arbitrary `p_user_id`.

This means any user can create in-app notifications targeted to victims, even without a legitimate relationship.

### Exploitation scenario

1. Sign up for any account.
2. Discover victim UUIDs via Finding 4 or other routes.
3. Call the RPC or direct insert to create believable notifications such as:
   - fake contract alerts,
   - fake reset/security notices,
   - fake “document rejected” or “urgent compliance” alerts.
4. Use `action_url` to route the victim to attacker-chosen internal paths.

### Example RPC payload

```http
POST /rest/v1/rpc/create_notification
Authorization: Bearer <attacker_jwt>
Content-Type: application/json

{
  "p_user_id": "<victim_uuid>",
  "p_type": "system",
  "p_title": "Action requise immédiatement",
  "p_message": "Votre dossier CESU est bloqué. Ouvrez le document et reconnectez-vous.",
  "p_priority": "urgent",
  "p_data": {"campaign": "phish-01"},
  "p_action_url": "/documents"
}
```

### Impact

- in-app phishing against victims,
- harassment/spam at scale,
- trust abuse using first-party UI as the delivery vehicle.

### At-scale weaponization

Combined with Finding 4, this becomes a reliable internal spam and social-engineering channel across the entire user base.

### Remediation status (2026-03-26)

**Addressed** — `notifications_insert_own` and hardened **`create_notification`** (business relationship + `action_url` validation) in **041**. See `docs/SECURITY_IDOR_ANALYSIS.md` and `docs/SECURITY_XSS_ANALYSIS.md`.

---

## Highest-value attack chains

### Chain A — Caregiver foothold to full victim-family compromise

1. Obtain any caregiver foothold.
2. Abuse caregiver self-update to set `employer_id` to target family and `legal_status = tutor`.
3. Read contracts, absences, logs, profiles, and storage-backed justifications.
4. Modify records to hide the intrusion or cause operational harm.

**Outcome:** full tenant compromise with health/workforce data exposure.

### Chain B — Employer signup to platform-wide recon and phishing

1. Register as employer.
2. Dump `profiles` via over-broad profiles search policy.
3. Inject notifications to arbitrary victims.
4. Use harvested identities for targeted credential attacks and social engineering.

**Outcome:** platform-wide victim targeting from a single low-cost account.

### Chain C — Tenant compromise to medical document breach

1. Execute Chain A.
2. Pull `justification_url` values or infer object paths.
3. Download documents from the public bucket.

**Outcome:** sensitive document breach with high regulatory and reputational impact.

---

## Recommended remediation order

1. **Immediately revoke caregiver self-update on security-critical columns**.
2. **Make `justifications` private and remove all `getPublicUrl()` usage**.
3. **Rewrite profiles search policy to scope rows to intended lookups only**.
4. **Lock down `create_notification` and `notifications_insert` to relationship-aware authorization**.
5. **Add regression tests for RLS invariants and direct REST abuse cases**.

---

## Source map used for this review

Primary evidence came from:
- Supabase client exposure model,
- RLS migrations for caregivers, profiles, notifications, contracts, absences, log entries, and storage,
- frontend service methods showing actual object naming, public URL generation, and callable RPC/edge patterns.
