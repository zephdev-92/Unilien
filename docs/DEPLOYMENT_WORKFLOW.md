# Workflow de déploiement

Document de référence sur **comment Unilien passe d'un merge sur `main` à la prod**, et pourquoi ce flow a été retenu plutôt qu'une alternative branche-based.

## Objectif

Éviter de pousser directement en prod un changement non vérifié sur staging. Garder une **fenêtre humaine** entre un merge sur `main` et la mise en ligne publique, sans alourdir le process à 5 étapes.

## ✅ Idée retenue : Sequential staging → approval → prod (one workflow)

### Flow concret

```
PR mergée sur main
       │
       ▼
 [release.yml triggered]
       │
       ├─► Job: staging
       │   - npm ci + test:run
       │   - build avec env staging (VITE_*_staging)
       │   - rsync dist → staging.unilien.app
       │   - rsync edge functions → /opt/supabase-staging/...
       │   - restart functions container
       │   - health check staging (200 ou 401 basic auth)
       │
       ▼ (auto si staging OK)
       │
       ├─► Job: production
       │   - environment: env_unilien (Required Reviewers activé)
       │   - ↳ ATTEND APPROBATION dans l'onglet Actions
       │   - npm ci + build avec env prod (VITE_*_prod)
       │   - rsync dist → unilien.app
       │   - rsync edge functions → /opt/supabase/...
       │   - restart functions container
       │   - health check unilien.app (200)
```

### Pourquoi ce design

- **Un seul workflow** au lieu de deux qui se marchent dessus
- **Staging toujours en phase avec main** : chaque merge déploie automatiquement staging — fini la dérive "staging 15 commits derrière"
- **Une seule étape humaine** : un clic dans l'onglet Actions pour valider la promotion staging → prod
- **Rollback simple** : staging foire → prod ne part jamais ; prod foire après approbation → revert le commit + re-merge → re-déploie la version précédente

### Setup GitHub Environments requis

Avant le premier run, configurer dans **Settings → Environments** :

| Environment            | Required reviewers | Secrets / Variables                                                  |
|------------------------|--------------------|----------------------------------------------------------------------|
| `env_unilien_staging`  | ❌ (auto deploy)   | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, SSH creds, `VPS_PORT` |
| `env_unilien`          | ✅ zephdev-92      | mêmes noms, valeurs prod, `VPS_PORT`                                 |

Sans `Required reviewers` sur `env_unilien`, le job prod tournera sans pause = pas de gate.

### Le workflow manuel `deploy-staging.yml` reste utile

Conservé tel quel : permet de pousser une **branche WIP** sur staging via `workflow_dispatch`, pour faire tester à des non-devs sans devoir merger. Cas d'usage différent du flow release.

---

## ❌ Alternative non retenue : Branche `develop` + tag pour prod

### Flow

```
feature/X → PR → merge sur develop
                    │
                    ▼
            deploy-develop.yml
                    │
                    ▼
            staging.unilien.app

(quand stable)
git tag v1.2.3 + push tag
                    │
                    ▼
            deploy-prod.yml (on: push: tags: v*)
                    │
                    ▼
            unilien.app
```

### Pourquoi pas

- **Double merge** (`feature → develop`, puis `develop → main`) pour shipper un fix d'une ligne = friction inutile à l'échelle solo dev / early-access
- **Tags = ceremony** : pour Unilien on n'a pas de release notes formelles, pas de besoin de versioning sémantique côté users
- **Risque de divergence develop / main** : sans automatisation stricte, la branche `develop` finit par avoir 3 commits en avance jamais portés sur main
- Bénéfice principal de l'approche tag (= release history versionnée) est mieux servi par les **Releases GitHub** générées depuis `main` quand on en aura besoin

### Quand reconsidérer

- Si on passe à une **équipe** avec plusieurs PRs ouvertes en parallèle qui ont besoin de staging séparés
- Si on doit shipper plusieurs versions en parallèle (LTS, stable, beta)
- Si la régression d'un fix devient critique (clients enterprise, contrats SLA)

Ni l'un ni l'autre dans le contexte actuel.

---

## Runbook

### Cas nominal

1. PR mergée sur `main`
2. Aller dans **Actions → Release (staging → prod)** : le run est en cours
3. Attendre que le job `staging` passe vert (≈ 4-5 min)
4. Ouvrir `https://staging.unilien.app` (basic auth → marie / fred / zeph), vérifier visuellement le changement
5. Retour dans Actions, cliquer **Review deployments → Approve and deploy** sur `production`
6. Attendre que `production` passe vert (≈ 2-3 min)
7. Vérifier `https://unilien.app`

### Si staging foire

- Le job `production` ne s'exécute pas — prod intacte
- Logs Actions → identifier l'erreur
- Revert le commit responsable sur `main` (`git revert` + push) → re-déploie l'état précédent sur staging

### Si prod foire après approbation

- Caddy continue à servir l'ancien `dist/` jusqu'à ce que rsync écrive — donc downtime quasi-nul
- Revert le commit sur `main` → re-déclenche release.yml → re-approbation → re-deploy

### Skip de l'approbation (urgence)

Pas recommandé. Si vraiment besoin de bypass, lancer le job `production` via `workflow_dispatch` avec un commentaire explicite dans le PR/issue qui l'a motivé.

---

## Historique

- **2026-05-21** : création du workflow `release.yml` (PR à venir), remplacement de `deploy.yml` (auto-deploy direct sur main). `deploy-staging.yml` (manual dispatch pour branches WIP) conservé.
