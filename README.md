# Handi-Lien

Application web de gestion pour les services d'aide à domicile et auxiliaires de vie.

## 📋 Description

Handi-Lien est une plateforme complète permettant de gérer efficacement les équipes d'auxiliaires de vie, leurs plannings, leurs interventions et leur conformité réglementaire.

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

## 📄 Licence

Projet privé - Tous droits réservés
