# Configuration Supabase — Redirect URLs pour réinitialisation mot de passe

_Pour que le lien "Réinitialiser mon mot de passe" redirige correctement vers `/reinitialisation`_

---

## Problème

Si le lien de réinitialisation dans l’email renvoie vers la racine (`https://unilien.netlify.app/`) au lieu de `/reinitialisation`, Supabase utilise la liste blanche des Redirect URLs. Si l’URL demandée n’est pas autorisée, Supabase remplace par le Site URL (souvent la racine).

## Solution

### 1. Configurer le Dashboard Supabase (obligatoire)

1. Ouvrir le [Dashboard Supabase](https://supabase.com/dashboard)
2. Sélectionner le projet Unilien
3. Aller dans **Authentication** → **URL Configuration**
4. Dans **Redirect URLs**, ajouter :
   - `https://unilien.netlify.app/reinitialisation`
   - `https://unilien.fr/reinitialisation` (si domaine custom utilisé)
   - `http://localhost:5173/reinitialisation` (développement local, souvent déjà présent)

5. Vérifier que **Site URL** pointe bien vers l’origine de production, par ex. `https://unilien.netlify.app`

### 2. Fallback côté app (déjà implémenté)

Un fallback dans `App.tsx` gère le cas où Supabase redirige vers la racine :

- Si l’URL contient `#...&type=recovery` au chargement → redirection vers `/reinitialisation`
- Si l’événement `PASSWORD_RECOVERY` est émis → redirection vers `/reinitialisation`

Cela atténue le problème tant que les Redirect URLs ne sont pas correctement configurées, mais **la configuration Dashboard reste recommandée** pour un flux nominal.

---

## Référence

- [Supabase Auth — Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase — Resetting a password](https://supabase.com/docs/guides/auth/auth-password-reset)
