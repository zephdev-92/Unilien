# Authentification à deux facteurs (2FA) — Implémentation

> Statut : **✅ TERMINÉ** — PR #220 (3 avril 2026)

---

## Contexte

La 2FA TOTP est implémentée via Supabase Auth MFA natif. La card dans Paramètres > Sécurité est fonctionnelle.

---

## Solutions comparées

| Solution | Type | Sécurité | Prix | Dépendance |
|----------|------|----------|------|------------|
| **Supabase MFA (TOTP)** | App authenticator | Élevée | Gratuit | Aucune |
| **SMS OTP (Twilio)** | Code par SMS | Moyenne (SIM swap) | ~0.05€/SMS | Twilio |
| **Email OTP** | Code par email | Moyenne | Gratuit | Service email |
| **WebAuthn / Passkeys** | Biométrie / clé USB | Très élevée | Gratuit | Support navigateur |

### Choix : Supabase MFA natif (TOTP)

- Intégré dans Supabase Auth — API dédiée (`mfa.enroll`, `mfa.challenge`, `mfa.verify`)
- Gratuit, sans service tiers
- Compatible Google Authenticator, Authy, 1Password, Microsoft Authenticator
- Standard TOTP (RFC 6238) — fonctionne offline côté utilisateur
- Pas de données personnelles supplémentaires à stocker (pas de numéro de téléphone requis)

---

## Flow utilisateur

### Activation du 2FA

```
Paramètres > Sécurité > Activer la vérification en deux étapes
    ↓
1. Afficher QR code TOTP (généré par Supabase)
    ↓
2. L'utilisateur scanne avec son app authenticator
    ↓
3. L'utilisateur saisit le code à 6 chiffres pour vérifier
    ↓
4. Afficher les codes de récupération (backup codes)
    ↓
5. 2FA activé ✅
```

### Connexion avec 2FA

```
Email + mot de passe (ou OAuth)
    ↓
Supabase retourne un MFA challenge
    ↓
Écran intermédiaire : "Entrez le code de votre application"
    ↓
Code vérifié → accès au tableau de bord
```

### Désactivation du 2FA

```
Paramètres > Sécurité > Désactiver la vérification en deux étapes
    ↓
Confirmer avec un code TOTP actuel
    ↓
2FA désactivé
```

---

## API Supabase MFA

### Enrôlement (activation)

```ts
// 1. Démarrer l'enrôlement — génère le QR code
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Mon application',
})
// data.id → factor ID
// data.totp.qr_code → data URI du QR code (affichable dans <img>)
// data.totp.uri → URI otpauth:// (pour copie manuelle)

// 2. Vérifier le premier code pour confirmer l'enrôlement
const { data: challenge } = await supabase.auth.mfa.challenge({
  factorId: data.id,
})

const { error: verifyError } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: '123456', // Code saisi par l'utilisateur
})
```

### Vérification au login

```ts
// Après signInWithPassword, vérifier si MFA est requis
const { data: { user } } = await supabase.auth.getUser()
const factors = await supabase.auth.mfa.listFactors()

if (factors.data.totp.length > 0) {
  // MFA activé → demander le code
  const factor = factors.data.totp[0]

  const { data: challenge } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  })

  // Afficher l'écran de saisie du code
  const { error } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code: userInputCode,
  })
}
```

### Vérification de l'Assurance Level

```ts
// Supabase fournit un "assurance level" dans le JWT
const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

// data.currentLevel : 'aal1' (mdp seul) ou 'aal2' (mdp + TOTP vérifié)
// data.nextLevel : le niveau requis

if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
  // L'utilisateur doit encore vérifier son TOTP
  // → Rediriger vers l'écran de saisie du code
}
```

### Désactivation

```ts
const { error } = await supabase.auth.mfa.unenroll({
  factorId: factor.id,
})
```

---

## Implémentation technique

### 1. Hook useMfa

```ts
// src/hooks/useMfa.ts

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'

export function useMfa() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFactors()
  }, [])

  async function loadFactors() {
    setLoading(true)
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error && data) {
      setFactors(data.totp)
      setIsEnabled(data.totp.some(f => f.status === 'verified'))
    }
    setLoading(false)
  }

  async function enroll() {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Unilien',
    })
    if (error) {
      logger.error('Erreur enrôlement MFA:', error)
      throw error
    }
    return data // contient qr_code et uri
  }

  async function verify(factorId: string, code: string) {
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) throw new Error('Challenge échoué')

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (error) throw error
    await loadFactors()
  }

  async function unenroll(factorId: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw error
    await loadFactors()
  }

  return { factors, isEnabled, loading, enroll, verify, unenroll }
}
```

### 2. Composant d'enrôlement (QR Code)

```tsx
// src/components/auth/MfaEnrollment.tsx

// Étapes :
// 1. Afficher le QR code (data.totp.qr_code → <img src={qrCode} />)
// 2. Champ de saisie pour le code à 6 chiffres
// 3. Bouton "Vérifier" → appel verify()
// 4. Affichage des codes de récupération (à copier/imprimer)
```

### 3. Écran de vérification au login

```tsx
// src/components/auth/MfaVerification.tsx

// Affiché entre le login email/mdp et l'accès au dashboard
// Champ de saisie : code à 6 chiffres
// Bouton "Vérifier"
// Lien "Utiliser un code de récupération"
```

### 4. Card 2FA dans les paramètres

```tsx
// Dans SettingsPage.tsx — SecurityPanel
// Remplacer la card grisée "Bientôt" par :

// Si 2FA non activé :
//   → Bouton "Activer la vérification en deux étapes"
//   → Ouvre le flow d'enrôlement (QR code)

// Si 2FA activé :
//   → Badge "Activé" en vert
//   → Date d'activation
//   → Bouton "Désactiver" (avec confirmation par code TOTP)
//   → Bouton "Régénérer les codes de récupération"
```

### 5. Protection des routes sensibles

```ts
// src/hooks/useAuth.ts — ajouter la vérification AAL

// Pour les actions sensibles (suppression compte, changement email, export données) :
// Vérifier que currentLevel === 'aal2' si l'utilisateur a activé le 2FA
// Sinon, demander la vérification TOTP avant de procéder
```

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/hooks/useMfa.ts` | Créer — hook MFA (enroll, verify, unenroll, status) |
| `src/components/auth/MfaEnrollment.tsx` | Créer — flow d'activation (QR code + vérification) |
| `src/components/auth/MfaVerification.tsx` | Créer — écran de saisie du code au login |
| `src/pages/SettingsPage.tsx` | Modifier — remplacer la card 2FA "Bientôt" |
| `src/components/auth/LoginForm.tsx` | Modifier — gérer le flow MFA après signIn |
| `src/hooks/useAuth.ts` | Modifier — vérifier l'assurance level (aal1/aal2) |

Aucune migration DB nécessaire — Supabase gère le stockage MFA en interne.

---

## Codes de récupération

Les codes de récupération permettent de se connecter si l'utilisateur perd son téléphone.

Supabase ne gère pas les backup codes nativement. Deux options :

### Option A : Stocker côté Supabase (recommandé)

```sql
-- Migration : table recovery_codes
CREATE TABLE mfa_recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL, -- bcrypt du code
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own recovery codes"
  ON mfa_recovery_codes FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
```

- Générer 10 codes aléatoires côté client
- Hasher et stocker en DB
- Afficher une seule fois à l'utilisateur (à copier/imprimer)
- Chaque code est à usage unique

### Option B : Sans backup codes

- Plus simple mais plus risqué
- L'utilisateur qui perd son téléphone doit contacter le support
- Désactivation manuelle du 2FA via le dashboard Supabase

**Recommandation** : Option A pour un produit sérieux traitant des données de santé.

---

## Points d'attention

### Sécurité
- Ne jamais logger les codes TOTP ou les codes de récupération
- Les codes de récupération sont hashés en DB (jamais en clair)
- Rate limiting sur la vérification (Supabase le gère côté auth)
- Forcer la re-vérification TOTP pour les actions sensibles (zone de danger, export)

### UX
- Le QR code doit être assez grand et contrasté pour être scanné facilement
- Proposer l'URI `otpauth://` en copie manuelle pour les utilisateurs qui ne peuvent pas scanner
- Message clair : "Conservez vos codes de récupération dans un endroit sûr"
- Indiquer dans le panneau Sécurité si le 2FA est activé ou non (badge vert/gris)

### Compatibilité OAuth
- Si l'utilisateur se connecte via Google/Microsoft ET a activé le 2FA :
  - Le 2FA se déclenche après l'OAuth
  - Vérifier `getAuthenticatorAssuranceLevel()` après le callback OAuth

### RGPD
- Le secret TOTP est stocké par Supabase Auth (pas dans nos tables)
- Les codes de récupération hashés ne sont pas des données personnelles
- Documenter dans la politique de confidentialité

---

## Estimation

| Tâche | Effort |
|-------|--------|
| Hook `useMfa` | ~30min |
| `MfaEnrollment` (QR code + vérification) | ~1h |
| `MfaVerification` (écran login) | ~45min |
| Card 2FA dans Settings (remplacer "Bientôt") | ~30min |
| Intégration LoginForm (flow MFA) | ~30min |
| Codes de récupération (migration + UI) | ~1h |
| Tests manuels + edge cases | ~45min |
| **Total** | **~5h** |

---

## Ordre d'implémentation

1. Créer le hook `useMfa`
2. Créer `MfaEnrollment` (QR code + champ vérification)
3. Remplacer la card "Bientôt" dans Settings > Sécurité
4. Tester l'activation avec Google Authenticator / Authy
5. Créer `MfaVerification` (écran intermédiaire au login)
6. Modifier `LoginForm` pour détecter le MFA et rediriger
7. Implémenter les codes de récupération (migration + UI)
8. Vérifier la compatibilité avec le flow OAuth (si implémenté)
