# UniLien

Application web de gestion pour les services d'aide à domicile et auxiliaires de vie.

## 📋 Description

Unilien est une plateforme complète permettant de gérer efficacement les équipes d'auxiliaires de vie, leurs plannings, leurs interventions et leur conformité réglementaire.

### Fonctionnalités principales

- **Authentification sécurisée** : Connexion, inscription, réinitialisation de mot de passe
- **Dashboards multi-rôles** : Interfaces adaptées pour employés, employeurs et aidants
- **Planning intelligent** : Gestion des horaires et des shifts d'intervention
- **Journal de bord** : Suivi détaillé des interventions avec filtres avancés
- **Gestion d'équipe** : Gestion des auxiliaires et de leurs contrats
- **Conformité** : Suivi des obligations réglementaires et alertes
- **Documents** : Centralisation des documents administratifs
- **Profils** : Gestion des informations personnelles

## 🛠️ Stack technique

- **Frontend** : React 19 + TypeScript + Vite
- **UI** : Chakra UI + Framer Motion
- **Backend** : Supabase (BaaS)
- **State Management** : Zustand + TanStack Query
- **Formulaires** : React Hook Form + Zod
- **Routing** : React Router v7
- **Tests** : Vitest + Testing Library
- **Accessibilité** : Axe Core React

## 🚀 Installation

1. Cloner le dépôt :
```bash
git clone <url-du-depot>
cd unilien
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env
```
Puis renseigner vos identifiants Supabase dans le fichier `.env`.

4. Lancer l'application en mode développement :
```bash
npm run dev
```

## 📝 Scripts disponibles

- `npm run dev` : Lance le serveur de développement
- `npm run build` : Compile l'application pour la production
- `npm run preview` : Prévisualise la version de production
- `npm run lint` : Vérifie le code avec ESLint
- `npm run test` : Lance les tests en mode watch
- `npm run test:run` : Lance les tests une fois
- `npm run test:coverage` : Génère le rapport de couverture de tests

## 🔐 Configuration Supabase

L'application nécessite un projet Supabase configuré. Obtenez vos clés API depuis :
https://app.supabase.com/project/_/settings/api

## 🔄 CI/CD avec GitHub Actions

Le projet est configuré avec plusieurs workflows GitHub Actions :

### Workflows disponibles

#### 🧪 CI (Intégration Continue)
- **Déclencheurs** : Push sur `main`/`master`/`develop` et Pull Requests
- **Actions** :
  - Lint du code avec ESLint
  - Exécution des tests unitaires
  - Génération du rapport de couverture
  - Vérification TypeScript
  - Build de l'application
  - Upload des artifacts

#### 🚀 Deploy (Déploiement)
- **Déclencheurs** : Push sur `main`/`master` ou manuel
- **Actions** :
  - Build de production
  - Upload des artifacts de production
  - Déploiement (à configurer selon votre plateforme)

#### ✅ PR Checks (Vérifications des Pull Requests)
- **Déclencheurs** : Ouverture/mise à jour de Pull Requests
- **Actions** :
  - Vérification de la qualité du code
  - Tests avec couverture
  - Rapport de taille du bundle
  - Tests d'accessibilité

#### 🤖 Dependabot
- Mises à jour automatiques des dépendances npm (hebdomadaire)
- Mises à jour des GitHub Actions (mensuel)

### Configuration des secrets GitHub

Pour que les workflows fonctionnent correctement, configurez les secrets suivants dans votre repository GitHub (`Settings > Secrets and variables > Actions`) :

**Secrets obligatoires :**
- `VITE_SUPABASE_URL` : URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY` : Clé publique anonyme Supabase
- `VITE_APP_URL` : URL de votre application (ex: https://votre-app.com)

**Secrets optionnels (selon la plateforme de déploiement) :**
- `CODECOV_TOKEN` : Token pour l'upload de couverture vers Codecov
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` : Pour Vercel
- `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` : Pour Netlify

### Badges de statut

Ajoutez ces badges en haut de votre README pour afficher le statut des workflows :

```markdown
![CI](https://github.com/votre-username/unilien/workflows/CI/badge.svg)
![Deploy](https://github.com/votre-username/unilien/workflows/Deploy%20to%20Production/badge.svg)
```

## 📄 Licence

Projet privé - Tous droits réservés
