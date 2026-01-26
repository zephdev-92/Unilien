# Configuration GitHub

Cette documentation décrit l'organisation du dossier `.github` et les configurations disponibles pour le projet Handi-Lien.

## 📁 Structure du dossier

```
.github/
├── workflows/                    # Workflows GitHub Actions
│   ├── ci.yml                   # Intégration continue
│   ├── deploy.yml               # Déploiement production
│   └── pr-checks.yml            # Vérifications des Pull Requests
├── ISSUE_TEMPLATE/              # Templates pour les issues
│   ├── bug_report.md            # Template pour signaler des bugs
│   └── feature_request.md       # Template pour proposer des fonctionnalités
├── CODEOWNERS                   # Définition des propriétaires de code
├── CONTRIBUTING.md              # Guide de contribution
├── dependabot.yml               # Configuration Dependabot
├── labels.yml                   # Configuration des labels GitHub
├── pull_request_template.md    # Template pour les Pull Requests
├── README.md                    # Ce fichier
└── SETUP.md                     # Guide de configuration détaillé
```

## 🚀 Démarrage rapide

### Pour les administrateurs

1. **Lire le guide de setup** : Consultez [`SETUP.md`](./SETUP.md) pour la configuration complète
2. **Configurer les secrets** : Ajoutez les secrets GitHub nécessaires (voir SETUP.md)
3. **Personnaliser CODEOWNERS** : Remplacez les usernames par défaut
4. **Activer Dependabot** : Les PRs de mise à jour seront créées automatiquement
5. **Créer les labels** : Utilisez `labels.yml` pour créer les labels GitHub

### Pour les contributeurs

1. **Lire le guide de contribution** : Consultez [`CONTRIBUTING.md`](./CONTRIBUTING.md)
2. **Utiliser les templates** : Les templates d'issues et de PR vous guideront
3. **Respecter les conventions** : Suivez les conventions de commit et de code
4. **Attendre les checks** : Les workflows CI doivent passer avant merge

## 📋 Workflows disponibles

### 🧪 CI (Continuous Integration)
- **Fichier** : `workflows/ci.yml`
- **Déclencheur** : Push et PR sur main/master/develop
- **Actions** :
  - ✅ Linting ESLint
  - ✅ Tests unitaires
  - ✅ Couverture de code
  - ✅ Type checking TypeScript
  - ✅ Build de l'application

### 🚀 Deploy
- **Fichier** : `workflows/deploy.yml`
- **Déclencheur** : Push sur main/master (ou manuel)
- **Actions** :
  - ✅ Tests complets
  - ✅ Build de production
  - ✅ Upload des artifacts
  - 🔧 Déploiement (à configurer)

### ✅ PR Checks
- **Fichier** : `workflows/pr-checks.yml`
- **Déclencheur** : Ouverture/mise à jour de PR
- **Actions** :
  - ✅ Vérifications de qualité
  - ✅ Tests avec couverture
  - ✅ Rapport de taille du bundle
  - ✅ Tests d'accessibilité

## 🤖 Automatisations

### Dependabot
- **Mises à jour npm** : Hebdomadaires (lundis à 9h)
- **Mises à jour GitHub Actions** : Mensuelles
- **PRs groupées** : Par type de dépendance
- **Labels automatiques** : `dependencies`, `npm`, `github-actions`

### CODEOWNERS
- **Review automatique** : Les propriétaires sont automatiquement assignés
- **Zones protégées** :
  - Configuration CI/CD
  - Logique de conformité
  - Authentification
  - Documentation

## 📝 Templates

### Issues
- **Bug Report** : Pour signaler des problèmes
- **Feature Request** : Pour proposer des fonctionnalités

### Pull Requests
- **Template standard** : Checklist complète pour les PRs
- **Sections** : Description, type, tests, captures d'écran

## 🏷️ Labels disponibles

### Par type
- `bug`, `enhancement`, `documentation`, `question`

### Par priorité
- `priority: critical`, `priority: high`, `priority: medium`, `priority: low`

### Par statut
- `status: in progress`, `status: blocked`, `status: ready for review`

### Par domaine
- `area: frontend`, `area: backend`, `area: compliance`, `area: auth`, etc.

### Par taille
- `size: xs`, `size: s`, `size: m`, `size: l`, `size: xl`

### Spéciaux
- `good first issue`, `help wanted`, `accessibility`, `performance`, `security`

Voir [`labels.yml`](./labels.yml) pour la liste complète.

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** : Guide complet de configuration
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** : Guide de contribution
- **[Workflows](./workflows/)** : Détails des workflows CI/CD

## 🔐 Sécurité

### Secrets nécessaires
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

### Secrets optionnels
- `CODECOV_TOKEN` (pour les rapports de couverture)
- `VERCEL_TOKEN`, `NETLIFY_AUTH_TOKEN` (pour le déploiement)

⚠️ **Important** : Ne committez JAMAIS de secrets dans le code !

## 🛠️ Maintenance

### Mettre à jour les workflows
1. Éditez les fichiers dans `workflows/`
2. Testez avec des branches de test
3. Déployez sur les branches principales

### Ajouter un nouveau workflow
1. Créez un fichier `.yml` dans `workflows/`
2. Définissez les déclencheurs (`on:`)
3. Ajoutez les jobs et steps
4. Documentez dans ce README

### Modifier les labels
1. Éditez `labels.yml`
2. Synchronisez avec github-label-sync ou manuellement

## 📊 Métriques et Monitoring

### Visualiser les workflows
- Onglet `Actions` du repository
- Filtres par workflow, branche, événement
- Logs détaillés de chaque étape

### Badges de statut
Ajoutez ces badges au README principal :

```markdown
![CI](https://github.com/your-username/unilien/workflows/CI/badge.svg)
![Deploy](https://github.com/your-username/unilien/workflows/Deploy%20to%20Production/badge.svg)
```

## 💡 Bonnes pratiques

✅ **À faire** :
- Tester localement avant de pousher
- Utiliser les templates fournis
- Respecter les conventions de commit
- Attendre les reviews avant de merger
- Garder les secrets confidentiels

❌ **À éviter** :
- Committer directement sur main
- Ignorer les warnings des workflows
- Merger avec des checks en échec
- Committer des secrets ou credentials
- Skip les templates d'issues/PRs

## 🆘 Besoin d'aide ?

- 📖 Consultez [SETUP.md](./SETUP.md) pour la configuration
- 🤝 Lisez [CONTRIBUTING.md](./CONTRIBUTING.md) pour contribuer
- 🐛 Ouvrez une issue avec le label `question`
- 📧 Contactez les mainteneurs du projet

---

**Dernière mise à jour** : Janvier 2026  
**Maintenu par** : Équipe Handi-Lien
