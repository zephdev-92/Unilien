# TODO - Notifications Push, Email & SMS

## Vue d'ensemble

Ce document trace les fonctionnalités de notification à implémenter pour une livraison complète des alertes utilisateur.

---

## 1. Web Push API ✅ IMPLÉMENTÉ

### Statut : ✅ Configuré et déployé (09/02/2026)

### Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Front-end   │────▶│ Service      │────▶│ Push Service    │
│ (subscribe) │     │ Worker       │     │ (navigateur)    │
└─────────────┘     └──────────────┘     └─────────────────┘
        │                                        ▲
        │                                        │
        ▼                                        │
┌─────────────┐     ┌──────────────┐             │
│ Supabase    │────▶│ Edge Function│─────────────┘
│ (trigger)   │     │ (send-push)  │
└─────────────┘     └──────────────┘
```

### Fichiers créés ✅
- [x] `public/sw-push.js` - Service Worker pour push
- [x] `src/services/pushService.ts` - Gestion des subscriptions
- [x] `src/hooks/usePushNotifications.ts` - Hook React
- [x] `src/components/notifications/PushPermissionBanner.tsx` - UI permission
- [x] `supabase/migrations/006_add_push_subscriptions.sql` - Table DB
- [x] `supabase/functions/send-push-notification/index.ts` - Edge Function

### Configuration requise ⚠️

> **SÉCURITÉ (09/02/2026)** : Les anciennes clés VAPID ont été compromises (clé privée
> stockée en clair dans `.vapid-keys.json`). De nouvelles clés ont été régénérées.
> Ne JAMAIS stocker la clé privée dans un fichier du projet.

#### 1. Clés VAPID (régénérées le 09/02/2026)

**Clé publique** (dans `.env`) :
```
BDv33ff-KqJCumsmKee6SHqswcN9nhaH8q7zdIgIDNUtuO5B3fqIJp035EmyqRfL0OOfltwtiXVnLdWBAV-a-I4
```

> La clé privée est stockée **uniquement** dans les secrets Supabase.
> Pour régénérer en cas de besoin : `npx web-push generate-vapid-keys --json`

#### 2. Variables d'environnement Frontend (.env) ✅
```env
VITE_VAPID_PUBLIC_KEY=BDv33ff-KqJCumsmKee6SHqswcN9nhaH8q7zdIgIDNUtuO5B3fqIJp035EmyqRfL0OOfltwtiXVnLdWBAV-a-I4
```

#### 3. Secrets Supabase ✅ (configurés le 09/02/2026)
```bash
# Déjà configurés via : npx supabase secrets set
# VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
```

#### 4. Appliquer la migration
```bash
supabase db push
```

#### 5. Déployer l'Edge Function
```bash
supabase functions deploy send-push-notification
```

### Utilisation dans l'app

```tsx
import { PushPermissionBanner } from '@/components/notifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'

// Dans le Dashboard ou Layout principal
function App() {
  const { user } = useAuth()

  return (
    <div>
      <PushPermissionBanner
        userId={user?.id || null}
        onSubscribed={() => console.log('Push activé!')}
      />
      {/* ... rest of app */}
    </div>
  )
}

// Utilisation avancée du hook
function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe
  } = usePushNotifications({ userId: user.id })

  return (
    <Switch
      checked={isSubscribed}
      onChange={isSubscribed ? unsubscribe : subscribe}
      disabled={!isSupported || permission === 'denied'}
    />
  )
}
```

---

## 2. Email (SendGrid/Resend) 📋 À FAIRE

### Statut : Non commencé

### Service recommandé
- **Resend** (moderne, bon free tier: 3000 emails/mois)
- Alternative : SendGrid, Mailgun

### Architecture cible
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Supabase    │────▶│ Edge Function    │────▶│ Resend API  │
│ (trigger)   │     │ (send-email)     │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
```

### Étapes d'implémentation
1. Créer compte Resend et obtenir API key
2. Créer Edge Function Supabase `send-notification-email`
3. Créer templates email (HTML) :
   - `shift-reminder.html`
   - `compliance-alert.html`
   - `new-message.html`
   - `contract-created.html`
4. Créer trigger PostgreSQL sur `INSERT` dans `notifications`
5. Appeler Edge Function depuis le trigger
6. Respecter les préférences utilisateur (`email_enabled`)

### Variables d'environnement
```env
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=notifications@unilien.fr
```

### Coût estimé
- Free : 3000 emails/mois
- Pro : $20/mois pour 50k emails

---

## 3. SMS (Twilio) 📋 À FAIRE

### Statut : Non commencé

### Service recommandé
- **Twilio** (leader du marché)
- Alternative : Vonage, OVH SMS

### Architecture cible
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│ Supabase    │────▶│ Edge Function    │────▶│ Twilio API  │
│ (trigger)   │     │ (send-sms)       │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
```

### Étapes d'implémentation
1. Créer compte Twilio et obtenir credentials
2. Acheter un numéro de téléphone Twilio
3. Créer Edge Function Supabase `send-notification-sms`
4. Définir les notifications éligibles SMS :
   - `compliance_critical` (urgent)
   - `shift_cancelled` (important)
   - `shift_reminder` (si activé)
5. Respecter les préférences utilisateur (`sms_enabled`)
6. Ajouter champ `phone` vérifié dans `profiles`

### Variables d'environnement
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxxx
```

### Coût estimé
- ~0.07€ par SMS envoyé en France
- Numéro : ~1€/mois

### Considérations
- Limiter aux notifications urgentes pour maîtriser les coûts
- Opt-in explicite requis (RGPD)
- Vérification du numéro de téléphone obligatoire

---

## 4. Firebase Cloud Messaging (Mobile) 📋 À FAIRE PLUS TARD

### Statut : Non prioritaire (app web first)

### Prérequis
- App mobile React Native ou PWA
- Compte Firebase

### Notes
- À implémenter si/quand une app mobile est développée
- FCM gratuit, intégration avec Supabase possible

---

## Priorités

| Fonctionnalité | Priorité | Statut | Effort |
|----------------|----------|--------|--------|
| Web Push API | P0 | ✅ Implémenté | 1 jour |
| Email (Resend) | P1 | 📋 À faire | 2 jours |
| SMS (Twilio) | P2 | 📋 À faire | 1 jour |
| FCM Mobile | P3 | 📋 À faire | 2 jours |

---

## Préférences utilisateur à ajouter

```typescript
interface NotificationPreferences {
  // Existant
  emailEnabled: boolean
  pushEnabled: boolean

  // À ajouter pour SMS
  smsEnabled: boolean           // Opt-in SMS
  smsOnlyUrgent: boolean        // SMS uniquement pour urgences
  quietHoursStart?: string      // "22:00" - pas de notif
  quietHoursEnd?: string        // "07:00"
}
```

---

## Checklist finale

- [x] Web Push API - Code implémenté
- [x] Web Push API - Configuration VAPID ✅ (clés régénérées 09/02/2026, secrets Supabase configurés)
- [ ] Web Push API - Tests de bout en bout
- [ ] Email via Resend
- [ ] SMS via Twilio (urgences)
- [ ] Heures silencieuses
- [ ] Documentation utilisateur

---

## Notes de développement

### Test local du Push
Pour tester en local sans déployer l'Edge Function :
1. La notification en base est créée
2. Le hook `useNotifications` reçoit l'update realtime
3. Le `PushPermissionBanner` peut afficher une notification locale

### Production
1. Configurer les secrets VAPID sur Supabase
2. Déployer l'Edge Function
3. Les notifications seront envoyées automatiquement
