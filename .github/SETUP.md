# Configuration GitHub Actions - Guide de démarrage

Ce document explique comment configurer et utiliser les workflows GitHub Actions pour Handi-Lien.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Configuration des secrets](#configuration-des-secrets)
3. [Configuration des labels](#configuration-des-labels)
4. [Configuration de Dependabot](#configuration-de-dependabot)
5. [Configuration du CODEOWNERS](#configuration-du-codeowners)
6. [Workflows disponibles](#workflows-disponibles)
7. [Activation des workflows](#activation-des-workflows)

## ✅ Prérequis

- [ ] Repository Git configuré sur GitHub
- [ ] Projet Supabase créé et configuré
- [ ] Accès administrateur au repository GitHub

## 🔐 Configuration des secrets

### 1. Accéder aux secrets GitHub

1. Allez dans votre repository sur GitHub
2. Cliquez sur `Settings` > `Secrets and variables` > `Actions`
3. Cliquez sur `New repository secret`

### 2. Secrets obligatoires

Ajoutez les secrets suivants :

| Nom du secret | Description | Où le trouver |
|---------------|-------------|---------------|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase | [Supabase Dashboard](https://app.supabase.com) > Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anonyme | [Supabase Dashboard](https://app.supabase.com) > Settings > API |
| `VITE_APP_URL` | URL de votre application | Ex: `https://handi-lien.com` ou `https://votre-app.vercel.app` |

### 3. Secrets optionnels

Ces secrets ne sont nécessaires que si vous utilisez les services correspondants :

#### Pour Codecov (rapports de couverture)
- `CODECOV_TOKEN` : Token Codecov
  - Créez un compte sur [codecov.io](https://codecov.io)
  - Ajoutez votre repository
  - Copiez le token fourni

#### Pour Vercel (déploiement)
- `VERCEL_TOKEN` : Token d'accès Vercel
- `VERCEL_ORG_ID` : ID de votre organisation Vercel
- `VERCEL_PROJECT_ID` : ID de votre projet Vercel

#### Pour Netlify (déploiement)
- `NETLIFY_AUTH_TOKEN` : Token d'authentification Netlify
- `NETLIFY_SITE_ID` : ID de votre site Netlify

### 4. Variables d'environnement

Si vous avez besoin de variables non-sensibles, utilisez `Environment variables` au lieu de `Secrets` :

1. `Settings` > `Secrets and variables` > `Actions` > `Variables`
2. Ajoutez vos variables

## 🏷️ Configuration des labels

### Option 1 : Manuellement

1. Allez dans `Issues` > `Labels`
2. Créez les labels définis dans `.github/labels.yml`

### Option 2 : Automatiquement avec github-label-sync

```bash
# Installer github-label-sync
npm install -g github-label-sync

# Synchroniser les labels
github-label-sync --access-token <your-token> your-username/unilien --labels .github/labels.yml
```

## 🤖 Configuration de Dependabot

### Mettre à jour le fichier .github/dependabot.yml

1. Ouvrez `.github/dependabot.yml`
2. Remplacez `your-github-username` par votre nom d'utilisateur GitHub
3. Commitez le fichier

Dependabot créera automatiquement des PRs pour les mises à jour de dépendances.

### Activer les security updates

1. `Settings` > `Code security and analysis`
2. Activez `Dependabot security updates`

## 👥 Configuration du CODEOWNERS

1. Ouvrez `.github/CODEOWNERS`
2. Remplacez tous les `@your-username` par votre nom d'utilisateur GitHub
3. Ajoutez d'autres reviewers si nécessaire

Format :
```
/path/to/code/ @username1 @username2
```

## 🔄 Workflows disponibles

### 1. CI (Continuous Integration)

**Fichier** : `.github/workflows/ci.yml`

**Déclenché par** :
- Push sur `main`, `master`, `develop`
- Pull Requests vers ces branches

**Actions** :
- Lint du code
- Tests unitaires
- Génération de couverture
- Type checking TypeScript
- Build de l'application

### 2. Deploy

**Fichier** : `.github/workflows/deploy.yml`

**Déclenché par** :
- Push sur `main` ou `master`
- Manuellement via l'interface GitHub

**Actions** :
- Build de production
- Upload des artifacts
- Déploiement (à configurer)

**⚠️ Configuration du déploiement** :

Le workflow inclut des exemples commentés pour :
- Vercel
- Netlify
- GitHub Pages

Décommentez et configurez la section correspondant à votre plateforme.

### 3. PR Checks

**Fichier** : `.github/workflows/pr-checks.yml`

**Déclenché par** :
- Ouverture d'une Pull Request
- Mise à jour d'une Pull Request

**Actions** :
- Vérifications de qualité du code
- Tests avec couverture
- Rapport de taille du bundle
- Tests d'accessibilité

## 🚀 Activation des workflows

### Première activation

1. **Commiter tous les fichiers** :
   ```bash
   git add .github/
   git commit -m "ci: configure GitHub Actions workflows"
   git push origin main
   ```

2. **Vérifier l'exécution** :
   - Allez dans l'onglet `Actions` de votre repository
   - Vous devriez voir le workflow CI en cours d'exécution

3. **Corriger les erreurs** :
   - Si le workflow échoue, cliquez dessus pour voir les logs
   - Corrigez les problèmes (souvent des secrets manquants)
   - Pushez les corrections

### Activer/Désactiver des workflows

1. Allez dans `Actions`
2. Sélectionnez un workflow dans la liste de gauche
3. Cliquez sur `...` > `Disable workflow` ou `Enable workflow`

## 📊 Badges de statut

Ajoutez des badges à votre README pour afficher le statut des workflows :

```markdown
![CI](https://github.com/your-username/unilien/workflows/CI/badge.svg)
![Deploy](https://github.com/your-username/unilien/workflows/Deploy%20to%20Production/badge.svg)
[![codecov](https://codecov.io/gh/your-username/unilien/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/unilien)
```

Remplacez `your-username` par votre nom d'utilisateur GitHub.

## 🔧 Personnalisation

### Modifier les déclencheurs

Éditez la section `on:` de chaque workflow :

```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'  # Tous les lundis à 2h
```

### Ajouter des jobs

Ajoutez de nouveaux jobs dans les workflows :

```yaml
jobs:
  my-job:
    name: Mon nouveau job
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ma commande
        run: echo "Hello"
```

### Matrice de tests

Pour tester sur plusieurs versions de Node.js :

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

## 🐛 Dépannage

### Le workflow ne se déclenche pas

- Vérifiez que les fichiers sont dans `.github/workflows/`
- Vérifiez la syntaxe YAML (indentation stricte)
- Vérifiez les branches dans les déclencheurs

### Erreur "Secret not found"

- Vérifiez que tous les secrets nécessaires sont configurés
- Vérifiez l'orthographe exacte des noms de secrets
- Les secrets sont case-sensitive

### Tests échouent en CI mais passent localement

- Vérifiez les variables d'environnement
- Vérifiez la version de Node.js
- Utilisez `npm ci` au lieu de `npm install` localement

### Build échoue

- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez les secrets pour les variables d'environnement
- Regardez les logs complets dans GitHub Actions

## 📚 Ressources

- [Documentation GitHub Actions](https://docs.github.com/en/actions)
- [Marketplace GitHub Actions](https://github.com/marketplace?type=actions)
- [Documentation Dependabot](https://docs.github.com/en/code-security/dependabot)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ✅ Checklist de configuration

- [ ] Secrets GitHub configurés
- [ ] CODEOWNERS mis à jour avec les bons usernames
- [ ] Dependabot configuré avec les bons reviewers
- [ ] Labels créés (optionnel mais recommandé)
- [ ] Premier workflow exécuté avec succès
- [ ] Badges ajoutés au README (optionnel)
- [ ] Plateforme de déploiement configurée dans deploy.yml
- [ ] Tests passent en CI
- [ ] Dependabot activé et fonctionnel

---

🎉 **Félicitations !** Votre configuration GitHub Actions est prête !
