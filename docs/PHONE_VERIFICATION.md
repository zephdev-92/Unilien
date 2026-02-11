# Vérification du numéro de téléphone par SMS

## Contexte

Lors de l'inscription, il serait utile de valider le numéro de téléphone de l'utilisateur en envoyant un code SMS à saisir.

---

## Option 1 : Supabase Auth natif (Phone Auth)

Supabase supporte l'authentification par téléphone avec OTP (One-Time Password) via SMS.

### Configuration

1. Dashboard Supabase → Authentication → Providers → Phone
2. Configurer un fournisseur SMS (Twilio, MessageBird, Vonage)
3. Activer "Phone Auth"

### Utilisation

```typescript
// Envoyer le code SMS
const { error } = await supabase.auth.signInWithOtp({
  phone: '+33612345678',
})

// Vérifier le code saisi par l'utilisateur
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+33612345678',
  token: '123456',
  type: 'sms',
})
```

### Avantages

- Intégré nativement dans `@supabase/supabase-js`
- Gestion automatique des sessions
- Documentation officielle complète

### Inconvénients

- Nécessite un fournisseur SMS externe
- Coût par SMS envoyé (~0.01-0.05€/SMS)
- Configuration initiale requise

---

## Option 2 : Twilio Verify (recommandé pour la vérification seule)

Service dédié à la vérification de numéros, intégrable via Supabase Edge Functions.

### Avantages

- Gestion automatique des tentatives et expiration
- Rate limiting intégré
- Support international automatique
- API simple et robuste

### Inconvénients

- Service payant (~0.05€/vérification)
- Nécessite une Edge Function Supabase
- Compte Twilio requis

### Flux d'implémentation

```
1. Frontend : Utilisateur entre son numéro
2. Edge Function : Appelle Twilio Verify pour envoyer le SMS
3. Frontend : Utilisateur entre le code reçu
4. Edge Function : Vérifie le code auprès de Twilio
5. Si valide : Marquer le numéro comme vérifié en base
```

---

## Flux utilisateur typique

```
┌─────────────────────────────────────────────────────────┐
│  1. Formulaire d'inscription                            │
│     - Email                                             │
│     - Mot de passe                                      │
│     - Numéro de téléphone                               │
│     [Envoyer le code]                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  2. SMS envoyé                                          │
│     "Votre code UniLien : 123456"                       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  3. Saisie du code                                      │
│     ┌───┬───┬───┬───┬───┬───┐                          │
│     │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │                          │
│     └───┴───┴───┴───┴───┴───┘                          │
│     [Valider]                                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  4. Inscription réussie                                 │
│     Numéro vérifié ✓                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Coûts estimés

| Fournisseur | Coût par SMS (France) | Notes |
|-------------|----------------------|-------|
| Twilio | ~0.04€ | Le plus populaire |
| MessageBird | ~0.03€ | Bonne couverture EU |
| Vonage | ~0.04€ | Ex-Nexmo |

### Estimation mensuelle

| Volume | Coût estimé |
|--------|-------------|
| 100 inscriptions/mois | ~4-5€ |
| 500 inscriptions/mois | ~20-25€ |
| 1000 inscriptions/mois | ~40-50€ |

> Note : Prévoir des tentatives multiples (code expiré, erreur de saisie) → multiplier par 1.3-1.5

---

## Alternative gratuite

Si le budget est limité :

1. **Vérification par email uniquement** (gratuite avec Supabase)
2. Saisie manuelle du téléphone sans vérification SMS
3. Vérification différée (admin vérifie manuellement si besoin)

---

## Recommandation

Pour UniLien, je recommande **Twilio Verify** car :

1. Service fiable et éprouvé
2. Gestion automatique des cas d'erreur
3. Bonne documentation
4. Intégration facile avec Supabase Edge Functions
5. Coût raisonnable pour un usage modéré

---

## Ressources

- [Supabase Phone Auth](https://supabase.com/docs/guides/auth/phone-login)
- [Twilio Verify](https://www.twilio.com/verify)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## Statut

**À implémenter** - En attente de décision sur le fournisseur SMS
