# Vérification du numéro de téléphone — Spec d'implémentation

> Statut : **Cadrage** (non implémenté)
> Provider retenu : **OVHcloud SMS** (souverain, déjà sur OVH côté infra)
> Auteur : Zephdev + Claude — 05/05/2026

---

## 1. Contexte & objectif

Aujourd'hui le numéro de téléphone est saisi librement au profil et accepté tel quel — aucune validation que le numéro existe ou appartient à l'utilisateur. À terme on voudra :

- Permettre des notifications urgentes (changement de planning, incident)
- Préparer un éventuel 2FA SMS en complément du TOTP
- Avoir un canal de contact fiable côté employeur ↔ auxi

**Objectif v1** : prouver que l'utilisateur possède bien le numéro qu'il a déclaré, **sans pénaliser le signup**.

---

## 2. Décisions produit

| Décision | Choix retenu | Alternative écartée |
|---|---|---|
| **Provider SMS** | OVHcloud SMS | Twilio (US, RGPD OK mais non souverain) ; Brevo (FR mais orienté marketing) |
| **Quand vérifier** | Après signup, dans Settings (différé) | À l'inscription (friction +1 étape, abandons) |
| **Mécanisme** | OTP 6 chiffres via SMS | Lookup seul (ne prouve pas la propriété) ; appel vocal (UX moindre) |
| **Obligation** | Optionnelle pour l'instant | Bloquante (à reconsidérer si volume notif SMS justifie l'imposer) |
| **Durée code** | 10 minutes | 5 min (trop court pour SMS retardés) ; 1h (fenêtre attaque trop large) |
| **Tentatives max** | 3 | 5+ (brute force facile sur 6 chiffres) |
| **Cooldown renvoi** | 60 secondes | Trop court (10s) = spam ; trop long (5min) = mauvaise UX si SMS perdu |

### Pourquoi OVH plutôt que Twilio Verify ?

- **Souveraineté** : Unilien gère des données santé. Hébergement + opérateur français cohérent avec l'engagement RGPD.
- **Écosystème existant** : VPS Unilien déjà sur OVH (compte facturation existant, pas un nouveau fournisseur à intégrer).
- **Coût** : ~0,05€/SMS chez OVH FR, équivalent Twilio. Pour 100 vérifs/mois = 5€/mois.

**Inconvénient principal** : OVH SMS n'a pas d'équivalent à `Twilio Verify` (qui gère génération/stockage/expiration du code automatiquement). On doit coder cette logique nous-mêmes (cf. § 3.2).

---

## 3. Architecture

### 3.1. Schéma DB (migration `061_phone_verification.sql`)

```sql
-- Table de codes en attente
CREATE TABLE phone_verifications (
  profile_id  uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  phone_e164  text NOT NULL,                 -- numéro normalisé E.164 (+33...)
  code_hash   text NOT NULL,                 -- SHA-256 du code (jamais en clair)
  expires_at  timestamptz NOT NULL,
  attempts    int NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Drapeau "vérifié" sur le profil
ALTER TABLE profiles ADD COLUMN phone_verified boolean NOT NULL DEFAULT false;

-- RLS owner-only
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;
-- Pas de policy SELECT/INSERT/UPDATE/DELETE pour authenticated :
-- toutes les opérations passent par les RPC SECURITY DEFINER.
```

### 3.2. Flux et responsabilités

```
┌─────────────┐    ┌──────────────────────┐    ┌──────────┐    ┌─────────┐
│  Front (UI) │───▶│ Edge Function        │───▶│ Postgres │    │ OVH SMS │
│             │    │  send-sms-otp        │    │          │    │   API   │
└─────────────┘    └──────────────────────┘    └──────────┘    └─────────┘
       │ 1. POST { phone }      │
       │                        │ 2. Génère code 6 chiffres
       │                        │ 3. Hash + UPSERT phone_verifications
       │                        │ 4. Appelle OVH SMS API ──────────────────▶
       │ 5. 200 OK              │
       │
       │ 6. RPC verify_phone_code({ code })
       │                                       │ 7. Lit hash + check expiration
       │                                       │ 8. Si OK : UPDATE profile.phone_verified = true
       │                                       │ 9. DELETE row phone_verifications
       │ 10. boolean (success/fail)
```

**Pourquoi l'Edge Function pour l'envoi et pas la RPC** :
- Le code en clair ne doit pas transiter (front ↔ DB ↔ front). L'Edge Function génère, hash, stocke, et envoie le SMS — le code en clair ne sort jamais que vers l'API SMS.
- La logique d'appel HTTP externe (OVH API + signature) est plus naturelle en Deno qu'en plpgsql.

**Pourquoi RPC pour la vérification** :
- Atomique : valider + flag `phone_verified` + supprimer la ligne en une transaction.
- SECURITY DEFINER : pas besoin de RLS complexe sur `phone_verifications`.

### 3.3. Edge Function `send-sms-otp`

```ts
// supabase/functions/send-sms-otp/index.ts (pseudo)
const { phone } = await req.json()
const phoneE164 = normalize(phone)              // libphonenumber côté front mieux

const { user } = await supabase.auth.getUser(token)
if (!user) return 401

// Rate limit : 1 SMS par minute par profile
const { data: existing } = await supabase.from('phone_verifications')
  .select('last_sent_at').eq('profile_id', user.id).maybeSingle()
if (existing && now() - existing.last_sent_at < 60s) return 429

const code = randomDigits(6)                    // crypto.getRandomValues
const codeHash = sha256(code)

await supabase.from('phone_verifications').upsert({
  profile_id: user.id,
  phone_e164: phoneE164,
  code_hash: codeHash,
  expires_at: now() + 10min,
  attempts: 0,
  last_sent_at: now(),
})

// Appel OVH SMS API (signature avec timestamp + secret)
await ovhSmsClient.send({
  receiver: phoneE164,
  message: `Unilien : votre code de vérification est ${code}. Valide 10 minutes.`,
  sender: 'Unilien',
})

return 200
```

### 3.4. RPC `verify_phone_code`

```sql
CREATE FUNCTION verify_phone_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row phone_verifications;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '28000'; END IF;

  SELECT * INTO v_row FROM phone_verifications WHERE profile_id = v_user_id;
  IF NOT FOUND OR v_row.expires_at < now() THEN RETURN false; END IF;
  IF v_row.attempts >= 3 THEN RETURN false; END IF;

  IF v_row.code_hash = encode(digest(p_code, 'sha256'), 'hex') THEN
    UPDATE profiles SET phone = v_row.phone_e164, phone_verified = true WHERE id = v_user_id;
    DELETE FROM phone_verifications WHERE profile_id = v_user_id;
    RETURN true;
  END IF;

  UPDATE phone_verifications SET attempts = attempts + 1 WHERE profile_id = v_user_id;
  RETURN false;
END $$;

REVOKE ALL ON FUNCTION verify_phone_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_phone_code(text) TO authenticated;
```

### 3.5. UI (composant `PhoneVerificationCard`)

Intégré dans `SettingsPage` (section Profil). États du composant :

| État | UI |
|---|---|
| **Non vérifié** | Champ `Téléphone` + badge gris "Non vérifié" + bouton **"Vérifier mon numéro"** |
| **Code envoyé** | Input 6 chiffres + bouton "Vérifier" + bouton "Renvoyer" (cooldown 60s) + lien "Modifier le numéro" |
| **Vérification en cours** | Spinner |
| **Échec (mauvais code)** | Message "Code incorrect, il vous reste X tentatives" |
| **Échec (expiré)** | Message "Code expiré, veuillez en redemander un" |
| **Vérifié** | Numéro + badge vert "Vérifié ✓" + bouton "Modifier" (revérifie tout depuis zéro) |

Saisie numéro : librairie **`libphonenumber-js`** côté front pour formater en E.164 et bloquer les formats invalides avant l'appel API.

---

## 4. Configuration OVH SMS (à faire avant PR 2)

1. **Activer le service SMS** sur le compte OVH : https://www.ovhtelecom.fr/sms/
2. **Acheter un pack de crédits** (~5€ pour 100 SMS, prix dégressif)
3. **Configurer un expéditeur** (sender alphanumérique "Unilien") — validation OVH ~24h
4. **Créer une application API** : https://api.ovh.com/createApp/
   - `Application Key`, `Application Secret`, `Consumer Key` à récupérer
   - Permissions : `GET /sms/*`, `POST /sms/*/jobs`
5. **Stocker les credentials** comme secrets Supabase :
   ```bash
   supabase secrets set OVH_APP_KEY=xxx
   supabase secrets set OVH_APP_SECRET=xxx
   supabase secrets set OVH_CONSUMER_KEY=xxx
   supabase secrets set OVH_SMS_ACCOUNT=sms-xxx-1   # nom du service SMS
   ```

---

## 5. Sécurité & RGPD

- **Code hashé** (SHA-256) en DB, jamais stocké en clair
- **Expiration courte** (10 min) limite la fenêtre d'attaque
- **Rate limiting** côté Edge Function (1 SMS/min/user) + max 3 tentatives par code
- **Numéros = donnée personnelle** mais pas sensible au sens RGPD art. 9 → pas de chiffrement pgsodium nécessaire (contrairement aux données santé, cf. migration 058)
- **Logs** : ne jamais logger le code en clair, ni le numéro complet (logger.ts redaction est déjà en place)
- **Audit** : ajouter une entrée `audit_logs` à chaque vérification réussie (cf. `auditService.ts`)
- **Suppression compte** : la table `phone_verifications` est ON DELETE CASCADE depuis `profiles` → cleanup auto

---

## 6. Coûts estimés

| Volume mensuel | Coût SMS | Total OVH |
|---|---|---|
| 50 vérifs/mois | 50 × 0,05€ | **2,50€** |
| 200 vérifs/mois | 200 × 0,05€ | **10€** |
| 1000 vérifs/mois | 1000 × 0,04€ (dégressif) | **40€** |

À titre de comparaison, Twilio Verify France : 0,05€/vérification (équivalent).

---

## 7. Découpage des PRs

### PR 1 — Base DB (autonome, mergeable seule)
- Migration `061_phone_verification.sql` : table + colonne `phone_verified` + RPC `verify_phone_code`
- Tests unitaires PG (script de test rollback)
- Pas d'envoi SMS, pas d'UI

### PR 2 — Edge Function `send-sms-otp`
- Nouveau dossier `supabase/functions/send-sms-otp/`
- Client OVH SMS minimal (signature HMAC-SHA1 selon doc OVH)
- Rate limiting + génération code + hash + insert
- Secrets Supabase à configurer **avant** déploiement

### PR 3 — UI `PhoneVerificationCard`
- Composant dans `src/components/profile/PhoneVerificationCard.tsx`
- Service `src/services/phoneVerificationService.ts` (orchestre Edge Function + RPC)
- Intégration dans `SettingsPage` ou `ProfilePage`
- `libphonenumber-js` ajouté en dépendance

### PR 4 — Tests E2E (optionnel)
- Mock OVH côté Playwright
- Couvre le happy path + cas d'erreur (code expiré, faux code)

---

## 8. Plan de test manuel (post-PR 3)

- [ ] Saisie numéro invalide (lettres, format US) → bloqué côté front
- [ ] Saisie numéro valide (+33...) → SMS reçu en moins de 30 s
- [ ] Saisie code correct → badge "Vérifié" affiché
- [ ] Saisie 3 codes faux d'affilée → message "trop de tentatives"
- [ ] Attente > 10 min → "Code expiré"
- [ ] Renvoi avant 60 s → bouton désactivé
- [ ] Modification numéro vérifié → reset complet du flag

---

## 9. Suite (post-vérification)

Une fois la vérif en place, les chantiers naturels :

- **Notifications SMS opt-in** : envoyer un SMS quand un planning change si l'auxi a vérifié son numéro et activé la préférence (table `notification_preferences` à étendre)
- **2FA SMS** en alternative au TOTP (PR #220) pour les utilisateurs qui n'ont pas d'app authenticator
- **Récupération de mot de passe par SMS** (en plus de l'email actuel)

Mais aucun de ces chantiers n'est sur le radar court terme — ils nécessitent un cas d'usage métier validé par Marie avant de coder.
