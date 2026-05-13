# Audit sécurité — 2026-05-13

> Snapshot de la posture sécurité après migrations 041 → 061, navigation vocale, pgsodium santé, OAuth onboarding, suivi RLS UPDATE.
> Successeur de [SECURITY_CHECK_2026-03-26.md](./SECURITY_CHECK_2026-03-26.md).

**TL;DR** : posture solide (0 vulnérabilités npm, RLS étendue, chiffrement applicatif des données santé, logger centralisé avec redaction). **1 finding HIGH** sur l'Edge Function `send-email` (relais d'emails ouvert aux authenticated users), 3 findings MEDIUM (dont MEDIUM-3 `log_entries` couvert par migration 062), 3 LOW.

---

## 1. Inventaire vérifié

| Domaine | Vérification | Résultat |
|---|---|---|
| Dépendances | `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| Logs prod | `grep console.* src/` | ✅ 4 hits, tous dans `logger.ts` |
| XSS via injection HTML | `grep dangerouslySetInnerHTML` | ✅ 1 hit ([NavIcon.tsx:51](../src/components/ui/NavIcon.tsx#L51)) — record hardcodé d'SVG paths, pas d'input utilisateur |
| `eval` / `new Function` | grep | ✅ 0 occurrence dans le code app |
| Secrets côté front | `grep VITE_` | ✅ uniquement `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, `VITE_PLAUSIBLE_*` — tous publics par design |
| localStorage | grep + revue | ✅ uniquement prefs UI (thème, dismiss flags, cache config) — pas de PII, pas de tokens |
| RLS | migrations | 139 policies, 18 fonctions SECURITY DEFINER (search_path figé) |
| CSP prod | [infra/caddy/Caddyfile](../infra/caddy/Caddyfile) | ✅ enforcement, `object-src 'none'`, `frame-ancestors 'none'`, pas de `unsafe-inline` script |
| RGPD art. 9 (santé) | migrations 043+058 | ✅ consentement + isolation owner-only + chiffrement pgsodium AEAD |

---

## 2. Forces — défense en profondeur

### 2.1 Logger centralisé ([src/lib/logger.ts](../src/lib/logger.ts))

Redaction côté code applicatif via patterns regex :
- Emails → `[EMAIL]`
- JWT (3 segments base64) → `[JWT]`
- UUIDs → 8 premiers chars + masque
- Téléphones FR → `[PHONE]`
- Clés / tokens 32+ chars → `[REDACTED_KEY]`

Sanitization récursive d'objets : clés sensibles (`password`, `token`, `email`, `phone`, `ssn`, …) → `[REDACTED]` ; profondeur max 5 pour éviter les boucles ; erreurs `Error` sérialisées sans stack en prod.

**Niveaux en prod** : seuls `error` et `warn` sortent ; `info`/`debug` sont no-op.

### 2.2 Sanitization entrée utilisateur ([src/lib/sanitize.ts](../src/lib/sanitize.ts))

- `sanitizeText()` — DOMPurify TEXT_ONLY (aucune balise HTML) → messages, notes, commentaires
- `sanitizeBasicHtml()` — `<b>` `<i>` `<u>` `<strong>` `<em>` `<br>` uniquement
- `sanitizeFileName()` / `sanitizeFileExtension()` — anti path traversal (whitelist alphanumérique + tiret/underscore/point)

Appliqué dans 8/13 services écrivant en DB ; les 5 restants sont read-only ou ne stockent que des enums/UUID/dates.

### 2.3 authStore ([src/stores/authStore.ts:88-94](../src/stores/authStore.ts#L88-L94))

Persiste **uniquement** `{ id, role }` du profil dans `localStorage`. Le profil complet (nom, email, téléphone) est re-fetché depuis Supabase à chaque chargement → limite l'exposition en cas de XSS sur `localStorage`.

### 2.4 Chiffrement applicatif santé ([058_pgsodium_health_data.sql](../supabase/migrations/058_pgsodium_health_data.sql))

Colonnes `handicap_type`, `handicap_name`, `specific_needs` :
- AEAD déterministe avec **AAD = `profile_id`** → un même clear-text donne un ciphertext différent par utilisateur (anti-pattern detection cross-user)
- Helpers `encrypt_health_field` / `decrypt_health_field` SECURITY DEFINER ownés `supabase_admin` (superuser) — sinon `permission denied for crypto_aead_det_*`
- Vue `employer_health_data_v` (security_invoker) — RLS héritée
- RPC `upsert_employer_health_data` — chiffre côté serveur, le code app ne manipule que du clair

**Défense en profondeur** : un dump SQL brut ne révèle que des `bytea` — la clé `medical_data_key` reste dans le keyring pgsodium.

### 2.5 Pattern RPC SECURITY DEFINER pour cross-user UPDATE ([061_mark_liaison_messages_read_rpc.sql](../supabase/migrations/061_mark_liaison_messages_read_rpc.sql))

Marquer comme lu un message envoyé par un autre user nécessite un UPDATE sur une ligne dont l'utilisateur n'est pas `sender_id`. La policy RLS UPDATE (`sender_id = auth.uid()`) bloque silencieusement (0 lignes match → pas d'erreur). **Pattern correct adopté** : RPC SECURITY DEFINER qui :
1. Vérifie `auth.uid() IS NOT NULL`
2. Re-vérifie l'accès à la conversation (employer, participant, contract, caregiver)
3. Effectue l'UPDATE
4. `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated`

À répliquer pour toute colonne type "seen_by / read_by" sur les autres tables. Audit cross-tables effectué le 2026-05-13 → `log_entries.read_by` présentait le même bug (cf. MEDIUM-3 + migration 062). Variante remontée la même journée : `leave_balances` INSERT bloqué pour l'employé essayant d'initialiser son solde (policy `employer_manage_balances`) → erreur "Le solde de congés n'a pas encore été initialisé" côté UI → fix migration 063 `initialize_leave_balance` (RPC SECURITY DEFINER avec port serveur de `calculateAcquiredDays`). `notifications` n'est pas concerné (chaque user ne touche que ses propres lignes).

### 2.6 Migrations sécurité post-pentest

- **041** — verrouille les colonnes critiques `caregivers` (`legal_status`, `employer_id`, `permissions`, `permissions_locked`) en `UPDATE`. Bucket `justifications` passé `public=false`. RLS INSERT notifications restreinte `auth.uid() = user_id`. RPC `create_notification` valide les `action_url` (block `javascript:`, `data:`, schemes externes).
- **058** — pgsodium santé (cf. 2.4)
- **059** — RPC `complete_onboarding` SECURITY DEFINER atomique (profile + employers/employees, nettoie orpheline)
- **060** — trigger `auth.users` force `role='authenticated'` (fix bug GoTrue OAuth)
- **061** — RPC `mark_liaison_messages_read`
- **062** — RPC `mark_log_entry_read` (cf. MEDIUM-3, même pattern que 061)
- **063** — RPC `initialize_leave_balance` + helper `count_working_days` (variante INSERT-bloqué du pattern RLS 061/062, fix bug "solde de congés pas initialisé" pour l'employé)

### 2.7 Edge Functions

- JWT validé via `auth.getUser(token)` avant toute action métier
- CORS origin allowlist (`unilien.app`, `www.unilien.app`, localhost dev)
- Rate limiting in-memory : 10 emails/min, 5 invitations/min
- Pas de secrets en clair côté client (`SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur)

### 2.8 CSP enforcement prod ([infra/caddy/Caddyfile:11](../infra/caddy/Caddyfile#L11))

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob: https://plausible.unilien.app;
style-src 'self' 'unsafe-inline';
connect-src 'self' https://api.unilien.app wss://api.unilien.app
            https://plausible.unilien.app https://huggingface.co
            https://*.huggingface.co https://*.hf.co;
img-src 'self' data: blob: https://api.unilien.app;
font-src 'self';
worker-src 'self' blob:;
manifest-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=()`.

---

## 3. Findings

### 🔴 HIGH-1 — `send-email` = relais d'emails ouvert

**Fichier** : [supabase/functions/send-email/index.ts](../supabase/functions/send-email/index.ts)

L'Edge Function vérifie le JWT et applique un rate limit (10 emails/min/user) mais **n'impose aucune contrainte sur `payload.to` ni sur `payload.html`**. Un utilisateur authentifié peut envoyer jusqu'à **600 emails/heure** vers n'importe quelle adresse, avec n'importe quel HTML, depuis l'expéditeur officiel `notifications@unilien.app`.

**Impact** :
- Phishing depuis un domaine vérifié Resend (réputation domaine brûlée + listes anti-spam)
- Risque RGPD (envois non sollicités)
- Risque facture Resend (abus)

**Vecteur** : signup gratuit → automatisation du POST `/functions/v1/send-email` avec un payload custom.

**Fix recommandé** :

Valider côté serveur que `payload.to` correspond à un destinataire légitime du caller. Options :

1. **Stricte** : exposer des RPC métier (`send_shift_reminder(p_shift_id)`, `send_new_message_notification(p_message_id)`) qui résolvent l'email destinataire côté DB en vérifiant les relations. L'Edge Function `send-email` devient privée (callable uniquement par service_role).
2. **Souple** : dans `send-email`, lookup côté serveur que `payload.to` existe dans `profiles` et est lié au caller via `contracts` / `caregivers` / `conversations`. Reject sinon.

Recommandation : option 1 (stricte). Surface d'attaque réduite à 0, et les payloads HTML sont contrôlés par le code de l'app.

### 🟡 MEDIUM-1 — `file_upload_audit` INSERT policy laxiste

**Fichier** : [supabase/migrations/013_add_backend_validation.sql:71-73](../supabase/migrations/013_add_backend_validation.sql#L71-L73)

```sql
CREATE POLICY "Service role can insert audit entries"
  ON file_upload_audit FOR INSERT
  WITH CHECK (true);
```

Le commentaire dit "Only system can insert" mais la policy autorise **n'importe quel `authenticated`** à insérer des lignes. Pas d'exfiltration possible (RLS SELECT reste `auth.uid() = user_id`), mais permet d'empoisonner l'audit log avec des entrées fausses → compromet la traçabilité RGPD.

**Fix** :
```sql
DROP POLICY "Service role can insert audit entries" ON file_upload_audit;
-- soit aucun policy (le trigger SECURITY DEFINER log_storage_upload bypass RLS),
-- soit restriction au service_role explicite :
CREATE POLICY "service_role inserts only"
  ON file_upload_audit FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### 🟡 MEDIUM-3 — `log_entries.read_by` : même bug silencieux que `liaison_messages` (corrigé)

**Fichiers** :
- [supabase/migrations/021_fix_rls_policy_conflicts.sql:534-541](../supabase/migrations/021_fix_rls_policy_conflicts.sql#L534-L541) — policies UPDATE log_entries restreintes à `author_id` / `employer_id` / tutor-curator
- [src/services/logbookService.ts](../src/services/logbookService.ts) — `markAsRead` (avant fix : fetch + UPDATE direct)

Même pattern que `liaison_messages` (cf. §2.5) : un employé non-auteur qui peut LIRE l'entrée (via contrat actif + recipient broadcast ou ciblé) ou un caregiver avec uniquement `view_logbook` voyait son UPDATE bloqué silencieusement (0 ligne match → pas d'erreur). Résultat : `read_by` ne contenait jamais le lecteur, le compteur de non lus revenait à chaque refresh.

**Fix appliqué — migration 062** : RPC SECURITY DEFINER `mark_log_entry_read(p_entry_id)` qui :
1. Vérifie `auth.uid() IS NOT NULL`
2. Re-vérifie l'accès LECTURE selon les 4 cas SELECT (employer / employee via contrat actif / caregiver `view_logbook` / tutor-curator)
3. Append idempotent à `read_by`
4. `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated`

Côté app : `markAsRead(entryId)` passe par `.rpc('mark_log_entry_read', { p_entry_id })`, le param `userId` redondant a été retiré (auth.uid() résolu côté serveur).

### 🟡 MEDIUM-2 — Rate limiter Edge Function in-memory

**Fichier** : [supabase/functions/_shared/rateLimit.ts](../supabase/functions/_shared/rateLimit.ts)

La `Map` JS est par instance d'Edge Function → reset à chaque cold start, et bypassable si plusieurs replicas tournent en parallèle. Acceptable aujourd'hui (self-host single-instance) mais à surveiller.

**Fix** : compteur Postgres (table `rate_limits` avec window glissante via `now() - interval '1 minute'`) ou Redis si volume.

### 🟢 LOW-1 — CSP : `'unsafe-eval'` à challenger

**Fichier** : [infra/caddy/Caddyfile:11](../infra/caddy/Caddyfile#L11)

`script-src` contient `'unsafe-eval'`. `'wasm-unsafe-eval'` (CSP3) est déjà présent et **suffit normalement à WebAssembly** (onnxruntime-web). À tester : retirer `'unsafe-eval'` en preview, valider que la navigation vocale fonctionne, puis pousser.

**Action** : PR test en preview Netlify avant prod.

### 🟢 LOW-2 — Sentry / observabilité erreurs prod absent

**Fichier** : [src/lib/logger.ts:138](../src/lib/logger.ts#L138)

TODO `Sentry.captureException` présent mais pas branché. Les erreurs critiques côté front en prod sont invisibles. Vu la criticité (données santé), recommander **Sentry self-hosted** ou **GlitchTip** pour rester souverain RGPD.

### 🟢 LOW-3 — HSTS pas explicite

**Fichier** : [infra/caddy/Caddyfile](../infra/caddy/Caddyfile)

Caddy active HSTS par défaut en TLS auto, mais pas explicité dans le bloc `header`. Vérifier en prod :

```bash
curl -sI https://unilien.app | grep -i strict-transport
# attendu : Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Si absent, ajouter explicitement dans le bloc `header` du Caddyfile.

---

## 4. Plan d'action

| # | Branche | Priorité | Effort |
|---|---|---|---|
| 1 | `fix/edge-send-email-recipient-validation` | HIGH | ~1 jour |
| 2 | `fix/file-upload-audit-rls` | MEDIUM | ~30 min |
| 3 | ~~`fix/logbook-mark-read-rpc`~~ ✅ migration 062 | MEDIUM | fait |
| 4 | `chore/csp-remove-unsafe-eval` | LOW (test preview) | ~1h |
| 5 | `feat/sentry-self-hosted` | LOW | backlog |
| 6 | Vérif HSTS prod | LOW | 1 commande curl |

---

## 5. Hors scope (à revoir séparément)

- **Migration audit logs vers cold storage** (rétention vs. art. 30 RGPD)
- **Backup chiffrement at-rest** — clé `medical_data_key` pgsodium dans le keyring : stratégie de backup/rotation à documenter (`docs/MEDICAL_DATA_COMPLIANCE.md` ?)
- **Pentest externe** — dernier post-mortem dans [SECURITY_PENTEST_REPORT.md](./SECURITY_PENTEST_REPORT.md), à reconduire annuellement vu l'ajout du chiffrement santé et de la nav vocale (worker-src + ONNX runtime)
- **CSP report-uri** — pas configuré, on perd les violations CSP en prod (utile pour debugger les régressions)

---

## 6. Références

- [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) — synthèse globale
- [SECURITY_CHECK_2026-03-26.md](./SECURITY_CHECK_2026-03-26.md) — audit précédent (migrations 041-048)
- [SECURITY_PENTEST_REPORT.md](./SECURITY_PENTEST_REPORT.md) — rapport pentest initial
- [SECURITY_IDOR_ANALYSIS.md](./SECURITY_IDOR_ANALYSIS.md) — analyse IDOR
- [SECURITY_XSS_ANALYSIS.md](./SECURITY_XSS_ANALYSIS.md) — analyse XSS
- [MEDICAL_DATA_COMPLIANCE.md](./MEDICAL_DATA_COMPLIANCE.md) — checklist RGPD santé (7/10 ✅)
