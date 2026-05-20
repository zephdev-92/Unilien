# OAuth Publisher Verification — Microsoft & Google

Procédure pour faire vérifier l'application Unilien auprès de Microsoft et
Google, afin de supprimer les avertissements **"App non vérifiée"** sur les
écrans de consentement OAuth.

> **Statut** : à exécuter **avant la sortie beta publique** (testeurs
> early-access actuels acceptent l'avertissement, mais les users finaux ne
> doivent pas le voir).

---

## Pourquoi le faire

Sans vérification, l'écran de consentement affiche un warning de type :

- **Microsoft** : *"Cette application n'a pas été publiée par Microsoft"* /
  *"Éditeur non vérifié"*
- **Google** : *"Google n'a pas vérifié cette application"* + bouton
  *"Avancé > Continuer (non sécurisé)"*

Conséquences :

- **UX dégradée** : friction sur le signup (~20-40% de drop selon les études)
- **Méfiance utilisateur** : impression d'app phishing, surtout pour une appli
  qui manipule des données de santé (RGPD art. 9)
- **Limites Google** : tant que l'app est en mode "Testing", limite de **100
  testeurs** maximum et expiration des tokens tous les 7 jours

---

## Microsoft (Azure AD / Entra ID)

### Prérequis

- [ ] App registration Azure existante (déjà fait — voir
      `docs/SOCIAL_LOGIN_IMPLEMENTATION.md`)
- [ ] Compte **Microsoft Cloud Partner Program (MCPP)** — gratuit
- [ ] Accès admin au tenant Azure utilisé pour l'app registration
- [ ] Domaine `unilien.app` vérifié dans le tenant (DNS TXT)

### Étapes

#### 1. Créer un compte MCPP (Microsoft Cloud Partner Program)

1. Aller sur https://partner.microsoft.com/dashboard
2. *Join the Microsoft Cloud Partner Program* → inscription gratuite
3. Renseigner les infos légales de l'entité (raison sociale, SIRET, adresse)
4. Récupérer le **Partner ID** (Microsoft Partner Network ID, format
   numérique 7 chiffres)

> ⏱ Délai d'activation : quelques minutes à 24h

#### 2. Vérifier le domaine `unilien.app` dans le tenant Azure AD

1. Azure Portal → **Microsoft Entra ID** → **Custom domain names**
2. *Add custom domain* → `unilien.app`
3. Copier l'enregistrement TXT proposé et l'ajouter au DNS (OVH ou registrar)
4. Attendre la propagation (~quelques minutes), puis cliquer *Verify*

> Si déjà fait pour Microsoft 365 ou Outlook : skip.

#### 3. Associer l'app registration au Partner ID

1. Azure Portal → **App registrations** → ton app *Unilien*
2. **Branding & properties** → *Publisher verification* → *Add MPN ID to
   verify publisher*
3. Coller le **Partner ID** récupéré à l'étape 1
4. Cliquer *Verify and save*

> Microsoft vérifie automatiquement le lien tenant ↔ MPN ↔ domaine.
> Délai : **immédiat à 24h** si tout est cohérent.

#### 4. Vérification finale

L'écran de consentement doit désormais afficher :

> **Unilien (Vérifié)** — *Publié par Vincent Zepharren* (ou la raison sociale)

Si le warning persiste après 24h, voir :
https://learn.microsoft.com/en-us/entra/identity-platform/troubleshoot-publisher-verification

### Documentation officielle

- Overview : https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview
- Mark app as publisher verified : https://learn.microsoft.com/en-us/entra/identity-platform/mark-app-as-publisher-verified

---

## Google (Google Cloud Console)

### Prérequis

- [ ] Projet Google Cloud existant avec OAuth client configuré
- [ ] OAuth consent screen rempli (déjà fait — vérifier les champs)
- [ ] URLs publiques **Privacy Policy** et **Terms of Service** sur `unilien.app`
- [ ] Domaine `unilien.app` vérifié dans **Google Search Console**

### Étapes

#### 1. Vérifier le domaine `unilien.app` dans Google Search Console

1. https://search.google.com/search-console
2. Ajouter `unilien.app` → méthode DNS TXT (recommandée)
3. Ajouter l'enregistrement TXT proposé au DNS
4. Cliquer *Verify*

#### 2. Compléter l'OAuth consent screen

Google Cloud Console → **APIs & Services** → **OAuth consent screen** :

- **App information** :
  - App name : `Unilien`
  - User support email : `contact@unilien.app`
  - App logo : 120x120px PNG, fond transparent, < 1 Mo
- **App domain** :
  - Application home page : `https://unilien.app`
  - Privacy policy : `https://unilien.app/privacy`
  - Terms of service : `https://unilien.app/legal` (ou `/terms`)
- **Authorized domains** : `unilien.app`
- **Developer contact information** : `contact@unilien.app`

#### 3. Vérifier les scopes demandés

Pour Unilien, les scopes sont :

- `openid`
- `email`
- `profile`

**Tous non-sensibles** → vérification rapide (1-3 jours ouvrés).

> ⚠️ Si on ajoute un jour des scopes sensibles (Drive, Calendar, Gmail…) :
> délai 4-6 semaines + démo vidéo + justification métier + sécurité audit.

#### 4. Passer en mode "Production"

1. OAuth consent screen → bouton **PUBLISH APP**
2. Confirmer le passage de *Testing* → *In production*
3. Si scopes non-sensibles uniquement : **vérification automatique
   quasi-instantanée** (badge "Vérifié" sous quelques jours max)
4. Si scopes sensibles : *Submit for verification* avec :
   - Vidéo YouTube non-listée montrant le flux OAuth complet
   - Justification écrite de l'usage de chaque scope
   - Confirmation que le site a un favicon + HTTPS + privacy policy publique

#### 5. Suivi de la vérification

- Email automatique de Google à chaque étape
- Tableau de suivi : OAuth consent screen → *Verification status*
- Si refus : Google envoie un email avec la raison + procédure de correction

### Documentation officielle

- OAuth verification : https://support.google.com/cloud/answer/9110914
- Verification FAQ : https://support.google.com/cloud/answer/13463073
- Brand verification : https://support.google.com/cloud/answer/13464321

---

## Checklist consolidée

### Avant lancement beta publique

- [ ] **Microsoft** :
  - [ ] Compte MCPP créé + Partner ID obtenu
  - [ ] Domaine `unilien.app` vérifié dans tenant Azure
  - [ ] App registration liée au Partner ID
  - [ ] Test : écran consentement affiche "Vérifié"
- [ ] **Google** :
  - [ ] Domaine `unilien.app` vérifié dans Search Console
  - [ ] OAuth consent screen complet (logo, URLs, contact)
  - [ ] Page Privacy + Terms accessibles publiquement
  - [ ] App passée en mode "Production"
  - [ ] Test : écran consentement sans warning

### Maintenance continue

- [ ] Renouveler les vérifications à chaque changement majeur (scopes ajoutés,
      raison sociale modifiée)
- [ ] Surveiller les emails de Microsoft/Google pour les notifications de
      re-vérification annuelle

---

## URLs sensibles à préparer

| URL                            | Statut       | À faire                                    |
|--------------------------------|--------------|--------------------------------------------|
| `https://unilien.app/privacy`  | ✅ existe    | Vérifier que la page est publique          |
| `https://unilien.app/legal`    | ✅ existe    | Idem                                       |
| `https://unilien.app/terms`    | ⚠️ ?         | Créer si Google demande URL distincte      |
| Logo 120x120 PNG               | ⚠️ à créer  | À partir du logo Unilien existant          |
| Vidéo démo OAuth (si sensible) | N/A          | Pas nécessaire pour scopes actuels         |

---

## Coût et délais récapitulatifs

| Provider  | Coût    | Délai (scopes non-sensibles) | Délai (scopes sensibles) |
|-----------|---------|------------------------------|--------------------------|
| Microsoft | Gratuit | < 24h                        | N/A                      |
| Google    | Gratuit | 1-3 jours                    | 4-6 semaines             |

---

## Notes

- **Ne pas faire trop tôt** : tant que l'app évolue rapidement (changement de
  scopes, nouveau redirect URI…), la vérification peut devoir être refaite.
  Idéal : faire la vérif quand la liste des scopes et le branding sont stables.
- **Staging** : pas concerné — utilise les mêmes credentials OAuth que la prod
  (ou un client OAuth dédié non vérifié). Le warning sur staging est attendu et
  ne dérange pas les testeurs internes.
- **Multi-tenant Microsoft** : si l'app Azure est en mode "Personal accounts +
  organizational accounts", la vérification couvre les deux types de comptes.
