# Social Login (OAuth) — Plan d'implémentation

> Statut : **En attente**

---

## Contexte

Unilien utilise actuellement l'authentification email/mot de passe via Supabase Auth.
L'objectif est d'ajouter la connexion via Google et Microsoft (Hotmail/Outlook) pour simplifier l'inscription et la connexion.

---

## Providers supportés par Supabase Auth

| Provider | Identifiant Supabase | Comptes couverts | Config |
|----------|---------------------|------------------|--------|
| **Google** | `google` | Gmail, Google Workspace | Google Cloud Console |
| **Microsoft** | `azure` | Hotmail, Outlook, Live, Office 365 | Azure AD (Entra ID) |
| **Apple** | `apple` | iCloud, Apple ID | Apple Developer (99$/an) |
| **Facebook** | `facebook` | Facebook, Instagram | Meta for Developers |

### Recommandation : Google + Microsoft en priorité

- Couvre la grande majorité des utilisateurs français
- Gratuit, configuration simple
- Apple en phase 2 si besoin (nécessite un compte développeur payant)

---

## Prérequis

### Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet (ou utiliser un existant)
3. APIs & Services > Credentials > Create OAuth Client ID
4. Type : **Web application**
5. Redirect URI : `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
6. Récupérer `Client ID` + `Client Secret`

### Microsoft OAuth (Azure AD)

1. Aller sur [Azure Portal](https://portal.azure.com/) > Azure Active Directory (Entra ID)
2. App registrations > New registration
3. Nom : `Unilien`
4. Supported account types : **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI : `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
6. Certificates & secrets > New client secret
7. Récupérer `Application (client) ID` + `Client Secret`

### Configuration Supabase

Pour chaque provider :
1. Dashboard Supabase > Authentication > Providers
2. Activer le provider
3. Coller `Client ID` + `Client Secret`
4. Sauvegarder

---

## Implémentation technique

### 1. Fonctions d'authentification OAuth

```tsx
// src/lib/supabase/auth.ts

import { supabase } from '@/lib/supabase/client'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  if (error) throw error
}

export async function signInWithMicrosoft() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'email profile openid',
    },
  })
  if (error) throw error
}
```

### 2. Boutons Social Login (composant réutilisable)

```tsx
// src/components/auth/SocialLoginButtons.tsx

import { VStack, Button, Text, Separator, HStack } from '@chakra-ui/react'
import { signInWithGoogle, signInWithMicrosoft } from '@/lib/supabase/auth'

export function SocialLoginButtons() {
  return (
    <VStack gap={3} w="100%">
      <HStack w="100%" gap={3}>
        <Separator flex={1} />
        <Text fontSize="xs" color="text.muted">ou continuer avec</Text>
        <Separator flex={1} />
      </HStack>

      <Button
        w="100%"
        variant="outline"
        onClick={signInWithGoogle}
      >
        <GoogleIcon />
        Google
      </Button>

      <Button
        w="100%"
        variant="outline"
        onClick={signInWithMicrosoft}
      >
        <MicrosoftIcon />
        Microsoft
      </Button>
    </VStack>
  )
}
```

### 3. Intégration dans les pages existantes

```tsx
// src/components/auth/LoginForm.tsx — ajouter après le formulaire email/mdp
<SocialLoginButtons />

// src/components/auth/SignupForm.tsx — ajouter après le formulaire
<SocialLoginButtons />
```

### 4. Page callback OAuth

```tsx
// src/pages/AuthCallbackPage.tsx

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Vérifier si le profil existe → sinon rediriger vers choix de rôle
        navigate('/tableau-de-bord')
      }
    })
  }, [navigate])

  return <Spinner />
}
```

Route à ajouter dans `App.tsx` :
```tsx
<Route path="/auth/callback" element={<AuthCallbackPage />} />
```

### 5. Écran choix de rôle (nouvel utilisateur OAuth)

Quand un utilisateur se connecte via OAuth pour la première fois, il n'a pas de profil dans la table `profiles` (pas de rôle attribué).

```tsx
// src/pages/OnboardingRolePage.tsx

// Afficher 3 cartes : Employeur / Salarié / Aidant
// Au clic → créer le profil avec le rôle choisi
// Puis rediriger vers le tableau de bord

async function selectRole(role: UserRole) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('profiles').insert({
    id: user.id,
    role,
    first_name: user.user_metadata.full_name?.split(' ')[0] ?? '',
    last_name: user.user_metadata.full_name?.split(' ').slice(1).join(' ') ?? '',
    email: user.email,
    avatar_url: user.user_metadata.avatar_url ?? null,
  })

  navigate('/tableau-de-bord')
}
```

Route à ajouter :
```tsx
<Route path="/onboarding/role" element={<OnboardingRolePage />} />
```

---

## Gestion du profil OAuth

### Données récupérées automatiquement

| Champ | Google | Microsoft |
|-------|--------|-----------|
| `email` | Oui | Oui |
| `full_name` | Oui | Oui |
| `avatar_url` | Oui | Non (nécessite Graph API) |

### Trigger DB existant

Vérifier si le trigger `on_auth_user_created` existe déjà dans les migrations Supabase.
- **S'il existe** : adapter pour gérer le cas OAuth (pas de rôle à la création)
- **S'il n'existe pas** : le flow se fait côté client via l'écran de choix de rôle

### Lier un compte existant

Si un utilisateur a déjà un compte email/mdp et se connecte via Google avec le même email :
- Supabase gère ça automatiquement si `GOTRUE_MAILER_AUTOCONFIRM` est activé
- Sinon, activer "Auto-link accounts" dans Dashboard > Auth > Settings

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/lib/supabase/auth.ts` | Créer — fonctions `signInWithGoogle`, `signInWithMicrosoft` |
| `src/components/auth/SocialLoginButtons.tsx` | Créer — boutons Google/Microsoft |
| `src/components/auth/LoginForm.tsx` | Modifier — ajouter `<SocialLoginButtons />` |
| `src/components/auth/SignupForm.tsx` | Modifier — ajouter `<SocialLoginButtons />` |
| `src/pages/AuthCallbackPage.tsx` | Créer — page callback OAuth |
| `src/pages/OnboardingRolePage.tsx` | Créer — choix de rôle post-OAuth |
| `src/App.tsx` | Modifier — ajouter routes `/auth/callback` et `/onboarding/role` |

---

## Points d'attention

### Sécurité
- Les redirect URIs doivent correspondre exactement (Supabase + provider)
- En dev : ajouter `http://localhost:5173/auth/callback` dans les redirect URIs autorisées
- Configurer aussi l'URL de prod dans Supabase : Dashboard > Auth > URL Configuration > Redirect URLs

### UX
- L'utilisateur ne choisit pas de mot de passe → le panneau "Sécurité" (changement mdp) doit gérer ce cas
- Pré-remplir prénom/nom/avatar depuis les métadonnées OAuth
- Afficher le provider connecté dans le profil (ex: "Connecté via Google")

### RGPD
- Informer l'utilisateur des données récupérées depuis le provider (email, nom, photo)
- Documenter dans la politique de confidentialité (LegalPage)

---

## Estimation

| Tâche | Effort |
|-------|--------|
| Config Google OAuth (console + Supabase) | ~15min |
| Config Microsoft OAuth (Azure + Supabase) | ~20min |
| `SocialLoginButtons` + intégration login/signup | ~30min |
| `AuthCallbackPage` | ~20min |
| `OnboardingRolePage` (choix de rôle) | ~1h |
| Gestion edge cases (lien compte, pas de mdp) | ~30min |
| Tests manuels | ~30min |
| **Total** | **~3h** |

---

## Ordre d'implémentation

1. Configurer Google OAuth (console + Supabase dashboard)
2. Configurer Microsoft OAuth (Azure + Supabase dashboard)
3. Créer `SocialLoginButtons` + fonctions auth
4. Créer `AuthCallbackPage`
5. Créer `OnboardingRolePage`
6. Ajouter les routes dans `App.tsx`
7. Intégrer dans `LoginForm` et `SignupForm`
8. Tester le flow complet (inscription + connexion + lien de compte)
