# Analyse SEO & Liens — Unilien

**Dernière mise à jour** : 26 mars 2026  
**Périmètre** : SPA React + Vite + PWA déployée sur Netlify  
**Contexte** : Application métier B2B (employeurs particuliers / auxiliaires de vie). Seules `/` et `/contact` sont publiquement indexables — les pages applicatives sont protégées par authentification.

> **Note 26/03/2026** — Alignement partiel avec le dépôt : routes françaises dans `App.tsx`, favicon **`Favicon.svg`**, page **`/mentions-legales`**, footer avec liens encore partiels (`#` sur certains placeholders). Pas de **`robots.txt`** / PNG PWA dédiés au moment de la relecture ; **`@axe-core/react`** toujours non branché en dev — voir **`docs/ACCESSIBILITY.md`**.

---

## Résumé exécutif

| Catégorie | Score | Priorité |
|-----------|-------|----------|
| Balises HTML de base | 🔴 2/10 | Critique |
| Open Graph / partage social | 🔴 0/10 | Important |
| PWA (icônes, manifest) | 🟠 4/10 | Critique |
| Robots / sitemap | 🔴 0/10 | Important |
| Liens internes | 🟠 5/10 | Critique (liens morts) |
| Liens légaux | 🔴 0/10 | Critique (RGPD) |
| Structure sémantique HTML | 🟠 5/10 | Important |
| Accessibilité liée au SEO | 🟢 7/10 | Bon, améliorable |
| Performance / code splitting | 🟢 9/10 | Excellent |

---

## 1. État actuel

### 1.1 `index.html`

```html
<html lang="fr">                          ✅ langue déclarée
<title>Unilien</title>                    ⚠️ trop court
<link rel="icon" type="image/svg+xml" href="/Favicon.svg" />   ✅ favicon projet
<!-- meta OG, description : toujours à enrichir -->
```

| Balise | État | Impact |
|--------|------|--------|
| `<title>` | "Unilien" seulement | Faible différenciation dans les SERPs |
| `<meta name="description">` | **ABSENTE** | Google génère un extrait automatique peu pertinent |
| `<meta property="og:*">` | **ABSENT** | Aucun aperçu au partage sur réseaux sociaux |
| `<meta name="twitter:card">` | **ABSENT** | |
| `<link rel="canonical">` | **ABSENT** | Risque de contenu dupliqué |
| `<meta name="theme-color">` | **ABSENT** | Défini dans le manifest mais pas en `<head>` |
| `<link rel="apple-touch-icon">` | **ABSENT** | Référencé dans `vite.config.ts` mais le fichier n'existe pas dans `public/` |
| `favicon` | **`/Favicon.svg`** (SVG) | Présent — poursuivre les meta / OG |

### 1.2 Manifest PWA

Le manifest (`manifest.webmanifest` généré par `vite-plugin-pwa`) est bien structuré :

```json
{
  "name": "Unilien",
  "short_name": "Unilien",
  "description": "Application de gestion des auxiliaires de vie pour personnes en situation de handicap",
  "lang": "fr",
  "display": "standalone",
  "theme_color": "#2B6CB0",
  "icons": [
    { "src": "pwa-192x192.png", "sizes": "192x192" },
    { "src": "pwa-512x512.png", "sizes": "512x512" },
    { "src": "pwa-512x512.png", "sizes": "512x512", "purpose": "any maskable" }
  ]
}
```

**Problèmes** :
- 🔴 `pwa-192x192.png`, `pwa-512x512.png` et `apple-touch-icon.png` sont **référencés mais absents** de `public/` — l'app n'est pas installable en l'état et les notifications push sont brisées (le service worker `sw-push.js` référence `/pwa-192x192.png`)
- Pas de `screenshots` (améliore le prompt d'installation Android Chrome)
- Pas de `categories` (`["health", "productivity"]` serait pertinent)

### 1.3 `robots.txt`

**Absent.** Le fichier est listé dans `vite.config.ts` (`includeAssets: ['robots.txt', ...]`) mais n'existe pas dans `public/`. Sans ce fichier, le comportement par défaut (tout autorisé) s'applique.

### 1.4 `sitemap.xml`

**Absent.** Aucun plugin (`vite-plugin-sitemap` ou autre), aucun fichier statique. Pas de guidance pour le crawl des deux pages publiques.

---

## 2. Routes de l'application

### 2.1 Cartographie complète

| Route | Accès | Composant | Indexable |
|-------|-------|-----------|-----------|
| `/` | Public | `HomePage` | ✅ Oui |
| `/contact` | Public | `ContactPage` | ✅ Oui |
| `/login` | Public (redirect si connecté) | `LoginForm` | Déconseillé |
| `/signup` | Public (redirect si connecté) | `SignupForm` | Déconseillé |
| `/forgot-password` | Public | `ForgotPasswordForm` | Non |
| `/reset-password` | Public | `ResetPasswordForm` | Non |
| `/dashboard` | Protégé (tous rôles) | `Dashboard` | Non |
| `/settings` | Protégé (tous rôles) | `ProfilePage` | Non |
| `/planning` | Protégé (tous rôles) | `PlanningPage` | Non |
| `/logbook` | Protégé (tous rôles) | `LogbookPage` | Non |
| `/liaison` | Protégé (tous rôles) | `LiaisonPage` | Non |
| `/clock-in` | Protégé (employee) | `ClockInPage` | Non |
| `/team` | Protégé (employer, caregiver) | `TeamPage` | Non |
| `/compliance` | Protégé (employer, caregiver) | `CompliancePage` | Non |
| `/documents` | Protégé (employer, caregiver, employee) | `DocumentsPage` | Non |
| `*` | — | Redirect `/` | — |

### 2.2 Liens morts

Deux routes sont référencées dans `QuickActionsWidget.tsx` mais **non définies dans `App.tsx`** :

| Lien | Fichier source | Conséquence |
|------|----------------|-------------|
| `/logbook/new` | `QuickActionsWidget.tsx` | Redirect silencieuse vers `/` |
| `/profile` | `QuickActionsWidget.tsx` (rôle caregiver) | Redirect silencieuse vers `/` |

### 2.3 Absence de page 404 réelle

Le catch-all `path="*"` fait un `<Navigate to="/" replace>` — toute URL invalide retourne un HTTP 200 via le SPA fallback. Pour les crawlers, c'est un **soft 404** potentiellement pénalisant.

---

## 3. Liens

### 3.1 Liens sortants

| URL | Fichier | État |
|-----|---------|------|
| `https://airtable.com/apphPLBwuWxsAq75J/...` | `DevelopmentBanner.tsx` | ✅ `rel="noopener noreferrer"` — OK |
| `cesu.urssaf.fr` (mentionné en texte) | `DocumentsPage.tsx` | ⚠️ Texte pur sans `<a>` |

### 3.2 Liens internes morts ou vides

| Lien | Fichier | Problème |
|------|---------|----------|
| `href="#"` × 3 | `HomePage.tsx` footer | Mentions légales, Politique de confidentialité, CGU — pages obligatoires (RGPD) non implémentées |
| `/logbook/new` | `QuickActionsWidget.tsx` | Route non déclarée dans `App.tsx` |
| `/profile` | `QuickActionsWidget.tsx` | Route non déclarée dans `App.tsx` |

### 3.3 Coordonnées non cliquables

Dans `ContactPage.tsx`, les coordonnées sont affichées en texte pur sans attributs HTML appropriés :

```tsx
// Actuellement — texte pur
<Text>contact@unilien.fr</Text>
<Text>01 23 45 67 89</Text>

// À corriger
<Link href="mailto:contact@unilien.fr">contact@unilien.fr</Link>
<Link href="tel:+33123456789">01 23 45 67 89</Link>
```

Note : les coordonnées et l'adresse sont actuellement **fictives** (`123 Rue de l'Innovation, 75001 Paris`, `01 23 45 67 89`). Le formulaire de contact **simule** l'envoi sans appel API réel.

---

## 4. Structure sémantique HTML

### 4.1 Hiérarchie des titres — `HomePage.tsx`

**Problème majeur** : aucun titre de section n'utilise de balise heading HTML. Tous les titres sont des `<Text>` (rendu `<p>`) stylisés en grand.

```tsx
// Actuel — rendu comme <p>
<Text fontSize="3xl" fontWeight="bold">Tout ce dont vous avez besoin</Text>
<Text fontSize="3xl" fontWeight="bold">Ils nous font confiance</Text>
<Text fontSize="3xl" fontWeight="bold">Prêt à simplifier votre quotidien ?</Text>

// À corriger
<Heading as="h2" size="xl">Tout ce dont vous avez besoin</Heading>
```

Résultat : la page d'accueil n'a **aucun `<h1>`, `<h2>` ou `<h3>`** au sens HTML. Les crawlers et lecteurs d'écran ne détectent aucune structure de titre.

Même problème dans `ContactPage.tsx` : "Contactez-nous" est un `<Text fontSize="4xl">` sans `as="h1"`.

### 4.2 Points positifs

- `<html lang="fr">` ✅
- `<nav aria-label="Navigation principale">` dans `DashboardLayout` ✅
- `<main id="main-content">` dans `DashboardLayout` ✅
- Skip link "Aller au contenu principal" dans `DashboardLayout` ✅
- `aria-current="page"` sur la navigation active ✅
- `RouteAnnouncer` (mis à jour `document.title` par route, `aria-live`) ✅
- `@axe-core/react` en devDependency ✅

### 4.3 Points manquants

| Élément | Fichier | Problème |
|---------|---------|----------|
| `<footer as="footer">` | `HomePage.tsx`, `ContactPage.tsx` | `<Box>` sans sémantique |
| Skip link | `HomePage.tsx`, `ContactPage.tsx` | Absent des pages publiques |
| `<h1>` | `HomePage.tsx`, `ContactPage.tsx` | Aucun heading HTML |

---

## 5. Performance SEO

### 5.1 Code splitting — Excellent ✅

Toutes les pages sont chargées via `React.lazy()` avec `<Suspense>`. Le build produit plusieurs chunks séparés, limitant le JS initial.

### 5.2 Render mode — SPA pure

L'application est une SPA sans SSR ni SSG. **Impact limité** car :
- Googlebot exécute le JavaScript et peut indexer le contenu
- Les pages applicatives (dashboard, planning, etc.) sont protégées par authentification et ne doivent **pas** être indexées
- Seules `/` et `/contact` ont un intérêt SEO réel

Pour ces deux pages, le manque de meta tags est plus pénalisant que l'absence de SSR.

### 5.3 Core Web Vitals

Non mesuré ici. La PWA avec service worker devrait garantir de bonnes performances. Points à surveiller :
- LCP (Largest Contentful Paint) sur `HomePage` : le hero avec images/illustrations
- CLS (Cumulative Layout Shift) : transitions de route avec `Suspense`

---

## 6. Propositions d'amélioration

### 6.1 Priorité Critique

#### P1 — Créer les fichiers d'icônes manquants

Les fichiers `public/pwa-192x192.png`, `public/pwa-512x512.png` et `public/apple-touch-icon.png` sont référencés mais absents. Générer depuis `Logo_Unilien.svg` :

```bash
# Avec sharp-cli ou un outil équivalent
npx sharp-cli resize 192 192 --input public/Logo_Unilien.svg --output public/pwa-192x192.png
npx sharp-cli resize 512 512 --input public/Logo_Unilien.svg --output public/pwa-512x512.png
cp public/pwa-192x192.png public/apple-touch-icon.png
```

#### P2 — Favicon Unilien (remplacer Vite)

```html
<!-- index.html -->
<link rel="icon" type="image/svg+xml" href="/Logo_Unilien.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

#### P3 — Meta tags de base dans `index.html`

```html
<!-- index.html — dans <head> -->
<title>Unilien — Gestion des auxiliaires de vie</title>
<meta name="description" content="Application de gestion pour employeurs particuliers et auxiliaires de vie. Plannings, déclarations CESU, bulletins de paie, conformité IDCC 3239." />
<meta name="theme-color" content="#2B6CB0" />
<link rel="canonical" href="https://unilien.fr/" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://unilien.fr/" />
<meta property="og:title" content="Unilien — Gestion des auxiliaires de vie" />
<meta property="og:description" content="Application de gestion pour employeurs particuliers et auxiliaires de vie. Plannings, déclarations CESU, bulletins de paie, conformité IDCC 3239." />
<meta property="og:image" content="https://unilien.fr/og-image.png" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:site_name" content="Unilien" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Unilien — Gestion des auxiliaires de vie" />
<meta name="twitter:description" content="Application de gestion pour employeurs particuliers et auxiliaires de vie." />
<meta name="twitter:image" content="https://unilien.fr/og-image.png" />
```

Créer également `public/og-image.png` (1200×630px).

#### P4 — Créer `public/robots.txt`

```
User-agent: *
Allow: /
Allow: /contact

Disallow: /dashboard
Disallow: /settings
Disallow: /planning
Disallow: /logbook
Disallow: /liaison
Disallow: /clock-in
Disallow: /team
Disallow: /compliance
Disallow: /documents
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password

Sitemap: https://unilien.fr/sitemap.xml
```

#### P5 — Corriger les liens morts dans `QuickActionsWidget.tsx`

```tsx
// Remplacer /logbook/new → /logbook (route existante)
// Remplacer /profile → /settings (route existante pour les paramètres de profil)
```

#### P6 — Pages légales obligatoires (RGPD)

Créer les 3 pages manquantes et mettre à jour le footer :

```tsx
// App.tsx — ajouter
<Route path="/mentions-legales" element={<MentionsLegalesPage />} />
<Route path="/politique-confidentialite" element={<PolitiqueConfidentialitePage />} />
<Route path="/cgu" element={<CguPage />} />

// HomePage.tsx — footer
<Link as={RouterLink} to="/mentions-legales">Mentions légales</Link>
<Link as={RouterLink} to="/politique-confidentialite">Politique de confidentialité</Link>
<Link as={RouterLink} to="/cgu">CGU</Link>
```

---

### 6.2 Priorité Importante

#### P7 — Hiérarchie de titres dans `HomePage.tsx` et `ContactPage.tsx`

```tsx
// HomePage.tsx — remplacer <Text> par <Heading>
// Titre principal de la hero section
<Heading as="h1" size="2xl" fontWeight="bold" color="white">
  Simplifiez la gestion de vos auxiliaires de vie
</Heading>

// Sections
<Heading as="h2" size="xl" fontWeight="bold" color="gray.900">
  Tout ce dont vous avez besoin
</Heading>
<Heading as="h2" size="xl" fontWeight="bold" color="gray.900">
  Ils nous font confiance
</Heading>
<Heading as="h2" size="xl" fontWeight="bold" color="white">
  Prêt à simplifier votre quotidien ?
</Heading>

// ContactPage.tsx
<Heading as="h1" size="2xl">Contactez-nous</Heading>
```

#### P8 — `<footer>` sémantique dans `HomePage.tsx` et `ContactPage.tsx`

```tsx
// Remplacer <Box> par <Box as="footer">
<Box as="footer" bg="gray.900" py={12}>
```

#### P9 — Skip link sur les pages publiques

```tsx
// À ajouter en premier enfant de <body> dans HomePage et ContactPage
<a
  href="#main-content"
  style={{ position: 'absolute', left: '-9999px' }}
  onFocus={(e) => (e.target.style.left = '0')}
>
  Aller au contenu principal
</a>
```

#### P10 — `<main id="main-content">` dans les pages publiques

```tsx
// HomePage.tsx, ContactPage.tsx
<Box as="main" id="main-content">
  {/* contenu */}
</Box>
```

#### P11 — Créer `public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://unilien.fr/</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://unilien.fr/contact</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>
```

Ou configurer `vite-plugin-sitemap` pour génération automatique :

```bash
npm install vite-plugin-sitemap --save-dev
```

```ts
// vite.config.ts
import Sitemap from 'vite-plugin-sitemap'

plugins: [
  Sitemap({
    hostname: 'https://unilien.fr',
    dynamicRoutes: ['/', '/contact'],
    exclude: ['/dashboard', '/settings', '/planning', /* ... */],
  }),
]
```

#### P12 — Page 404 dédiée

```tsx
// App.tsx
<Route path="*" element={<NotFoundPage />} />

// src/pages/NotFoundPage.tsx
export function NotFoundPage() {
  return (
    <main>
      <Heading as="h1">Page introuvable</Heading>
      <Text>La page demandée n'existe pas.</Text>
      <Button as={RouterLink} to="/">Retour à l'accueil</Button>
    </main>
  )
}
```

---

### 6.3 Priorité Mineure

#### P13 — Coordonnées cliquables dans `ContactPage.tsx`

```tsx
<Link href="mailto:contact@unilien.fr">contact@unilien.fr</Link>
<Link href="tel:+33123456789">01 23 45 67 89</Link>
```

#### P14 — Lien cliquable pour `cesu.urssaf.fr` dans `DocumentsPage.tsx`

```tsx
<Link href="https://www.cesu.urssaf.fr" target="_blank" rel="noopener noreferrer">
  cesu.urssaf.fr
</Link>
```

#### P15 — Champs supplémentaires dans le manifest PWA

```json
{
  "categories": ["health", "productivity"],
  "screenshots": [
    {
      "src": "screenshot-dashboard.png",
      "sizes": "1280x720",
      "type": "image/png",
      "label": "Tableau de bord Unilien"
    }
  ]
}
```

#### P16 — Supprimer `public/_redirects` (redondant avec `netlify.toml`)

Le fichier `public/_redirects` contient `/* /index.html 200`, déjà défini dans `netlify.toml`. Un seul des deux est nécessaire.

---

## 7. Roadmap d'implémentation suggérée

| Étape | Actions | Effort | Impact |
|-------|---------|--------|--------|
| **Sprint 1** (1 jour) | P1 Icônes PWA + P2 Favicon + P3 Meta tags + P4 robots.txt | Faible | Critique |
| **Sprint 2** (1 jour) | P5 Liens morts + P6 Pages légales (contenu minimal) + P12 Page 404 | Moyen | Critique |
| **Sprint 3** (½ jour) | P7 Headings HomePage/ContactPage + P8 `<footer>` + P9/P10 Skip link / `<main>` | Faible | Important |
| **Sprint 4** (½ jour) | P11 sitemap.xml + P13/P14 Liens cliquables + P15 Manifest enrichi + P16 Nettoyage | Faible | Mineur |

---

## 8. Synthèse des fichiers à créer / modifier

### Fichiers à créer

| Fichier | Contenu |
|---------|---------|
| `public/robots.txt` | Directives crawl (voir §6.1 P4) |
| `public/sitemap.xml` | 2 URLs publiques (voir §6.2 P11) |
| `public/pwa-192x192.png` | Icône PWA 192×192 depuis `Logo_Unilien.svg` |
| `public/pwa-512x512.png` | Icône PWA 512×512 |
| `public/apple-touch-icon.png` | Icône Apple Touch 180×180 |
| `public/og-image.png` | Image Open Graph 1200×630 |
| `src/pages/NotFoundPage.tsx` | Page 404 dédiée |
| `src/pages/MentionsLegalesPage.tsx` | Mentions légales (RGPD obligatoire) |
| `src/pages/PolitiqueConfidentialitePage.tsx` | Politique de confidentialité |
| `src/pages/CguPage.tsx` | CGU |

### Fichiers à modifier

| Fichier | Changements |
|---------|-------------|
| `index.html` | `<title>` enrichi, meta description, og:*, twitter:card, canonical, theme-color, favicon |
| `src/pages/HomePage.tsx` | `<Heading as="h1/h2">` pour tous les titres, `as="footer"`, skip link, `as="main" id="main-content"` |
| `src/pages/ContactPage.tsx` | `<Heading as="h1">`, `mailto:`, `tel:`, skip link |
| `src/pages/DocumentsPage.tsx` | Lien `<a>` sur `cesu.urssaf.fr` |
| `src/components/dashboard/QuickActionsWidget.tsx` | Corriger `/logbook/new` → `/logbook` et `/profile` → `/settings` |
| `src/App.tsx` | Ajouter routes légales + route `*` → `<NotFoundPage>` |

---

*Document généré le 27 février 2026 — analyse statique du code source.*
