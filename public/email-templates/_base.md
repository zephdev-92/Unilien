# Templates email Unilien (GoTrue)

Templates HTML FR utilisés par Supabase Auth self-hosted.

## Déploiement

Les fichiers sont servis statiquement par Caddy sur `https://unilien.app/email-templates/*.html` (via GitHub Actions `deploy.yml` → rsync vers `/var/www/unilien/email-templates/`).

## Variables GoTrue

- `{{ .ConfirmationURL }}` — URL complète de confirmation
- `{{ .Token }}` — code OTP 6 chiffres
- `{{ .TokenHash }}` — hash du token
- `{{ .Email }}` — email utilisateur
- `{{ .NewEmail }}` — nouveau email (email_change uniquement)
- `{{ .SiteURL }}` — SITE_URL configuré dans GoTrue
- `{{ .Data }}` — metadata utilisateur

## Config `.env` Supabase

```
GOTRUE_MAILER_SUBJECTS_CONFIRMATION=Confirmez votre adresse email
GOTRUE_MAILER_SUBJECTS_RECOVERY=Réinitialisation de votre mot de passe
GOTRUE_MAILER_SUBJECTS_INVITE=Vous êtes invité(e) sur Unilien
GOTRUE_MAILER_SUBJECTS_MAGIC_LINK=Votre lien de connexion Unilien
GOTRUE_MAILER_SUBJECTS_EMAIL_CHANGE=Confirmez votre nouveau email
GOTRUE_MAILER_SUBJECTS_REAUTHENTICATION=Code de confirmation Unilien

GOTRUE_MAILER_TEMPLATES_CONFIRMATION=https://unilien.app/email-templates/confirmation.html
GOTRUE_MAILER_TEMPLATES_RECOVERY=https://unilien.app/email-templates/recovery.html
GOTRUE_MAILER_TEMPLATES_INVITE=https://unilien.app/email-templates/invite.html
GOTRUE_MAILER_TEMPLATES_MAGIC_LINK=https://unilien.app/email-templates/magic-link.html
GOTRUE_MAILER_TEMPLATES_EMAIL_CHANGE=https://unilien.app/email-templates/email-change.html
GOTRUE_MAILER_TEMPLATES_REAUTHENTICATION=https://unilien.app/email-templates/reauthentication.html
```
