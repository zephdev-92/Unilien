# Guide de Contribution

Merci de votre intérêt pour contribuer à Handi-Lien ! 🎉

## 📋 Table des matières

- [Code de Conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Standards de code](#standards-de-code)
- [Processus de Pull Request](#processus-de-pull-request)
- [Conventions de commit](#conventions-de-commit)

## 🤝 Code de Conduite

Ce projet adhère à un code de conduite. En participant, vous vous engagez à maintenir un environnement respectueux et inclusif.

## 💡 Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les Issues
2. Ouvrez une nouvelle issue avec le label `bug`
3. Incluez :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs comportement actuel
   - Captures d'écran si applicable
   - Informations sur l'environnement (navigateur, OS, etc.)

### Proposer une fonctionnalité

1. Ouvrez une issue avec le label `enhancement`
2. Décrivez clairement :
   - Le problème que vous souhaitez résoudre
   - La solution proposée
   - Les alternatives envisagées

### Soumettre des changements

1. Fork le repository
2. Créez une branche depuis `develop` :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   # ou
   git checkout -b fix/mon-correctif
   ```
3. Faites vos modifications
4. Committez avec des messages clairs (voir [Conventions de commit](#conventions-de-commit))
5. Pushez vers votre fork
6. Ouvrez une Pull Request

## 📐 Standards de code

### TypeScript

- Utilisez TypeScript strict mode
- Définissez des types explicites pour les props et les retours de fonction
- Évitez `any` - utilisez `unknown` si nécessaire

### React

- Utilisez des composants fonctionnels avec hooks
- Suivez les règles de hooks de React
- Utilisez memo/useMemo/useCallback pour optimiser les performances si nécessaire
- Composants accessibles (ARIA labels, roles, etc.)

### Style de code

- Suivez la configuration ESLint du projet
- Utilisez Prettier pour le formatage (automatique avec les hooks Git)
- Indentation : 2 espaces
- Points-virgules : oui
- Quotes : simples pour JS/TS, doubles pour JSX

### Tests

- Écrivez des tests pour les nouvelles fonctionnalités
- Maintenez une couverture de code > 80%
- Utilisez des noms de tests descriptifs :
  ```typescript
  describe('ComplianceChecker', () => {
    it('should flag overtime when daily hours exceed 10', () => {
      // ...
    });
  });
  ```

### Accessibilité

- Tous les composants interactifs doivent être accessibles au clavier
- Utilisez les composants UI accessibles du projet (`AccessibleButton`, etc.)
- Testez avec des lecteurs d'écran si possible
- Respectez les ratios de contraste WCAG AA minimum

## 🔄 Processus de Pull Request

1. **Pré-requis**
   - Les tests passent : `npm run test:run`
   - Le linting est propre : `npm run lint`
   - Le build fonctionne : `npm run build`
   - La couverture de tests est maintenue : `npm run test:coverage`

2. **Description de la PR**
   - Utilisez le template de PR fourni
   - Expliquez le "pourquoi" et le "comment"
   - Ajoutez des captures d'écran pour les changements UI
   - Liez les issues associées

3. **Review**
   - Au moins un reviewer doit approuver
   - Tous les commentaires doivent être résolus
   - Les checks CI doivent passer

4. **Merge**
   - Utilisez "Squash and merge" pour garder l'historique propre
   - Supprimez la branche après le merge

## 📝 Conventions de commit

Utilisez le format [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>(<scope>): <description>

[corps optionnel]

[footer(s) optionnel(s)]
```

### Types

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation uniquement
- `style`: Formatage, points-virgules manquants, etc.
- `refactor`: Refactoring du code
- `perf`: Amélioration des performances
- `test`: Ajout ou modification de tests
- `chore`: Maintenance (dépendances, config, etc.)
- `ci`: Changements CI/CD

### Exemples

```bash
feat(planning): add shift drag-and-drop functionality

fix(auth): resolve token refresh infinite loop

docs(readme): update installation instructions

test(compliance): add tests for overtime calculation
```

## 🏗️ Structure du projet

```
src/
├── components/     # Composants React réutilisables
├── pages/         # Pages/Routes de l'application
├── hooks/         # Custom React hooks
├── lib/           # Utilitaires et logique métier
├── services/      # Services API
├── stores/        # State management (Zustand)
├── styles/        # Thèmes et styles globaux
├── types/         # Types TypeScript partagés
└── test/          # Configuration et utilitaires de test
```

## 🔐 Conformité et Sécurité

- Ne committez JAMAIS de secrets ou credentials
- Utilisez les variables d'environnement
- Respectez les règles de conformité du code du travail français
- Testez les calculs de paie et d'heures avec attention

## 📞 Besoin d'aide ?

- Ouvrez une issue avec le label `question`
- Consultez la documentation dans le dossier `/docs`
- Contactez les mainteneurs du projet

---

Merci de contribuer à rendre Handi-Lien meilleur ! 🚀
