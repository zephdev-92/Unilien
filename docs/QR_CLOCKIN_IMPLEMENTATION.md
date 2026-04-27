# Pointage par QR code — Spec d'implémentation

> Statut : **Cadrage** (non implémenté)
> Origine : feedback réunion Marie 16/04/2026 — fiabilité du pointage actuel
> Auteur : Zephdev + Claude — 27/04/2026

---

## 1. Contexte & problème

Le pointage actuel est **déclaratif et auto-saisi par l'auxi** :

- L'auxi clique "Démarrer mon intervention" → l'app enregistre l'heure courante
- Aucune vérification que l'auxi est physiquement chez le bénéficiaire
- L'auxi peut valider à 13h00 alors qu'elle est encore en transport / chez elle

**Conséquences** :

1. **Paie potentiellement injuste** — l'employeur paie des heures non réellement effectuées
2. **Pas de preuve en cas de litige** (URSSAF, prud'hommes, conflit employeur/salarié)
3. **Perte de confiance** côté employeur (Marie l'a explicitement remonté)
4. **Qualité de service** non traçable pour le bénéficiaire (a-t-il vraiment été visité ?)

**Objectif** : rendre le pointage **vérifiable** sans dégrader l'expérience auxi ni introduire un dispositif de surveillance disproportionné.

---

## 2. Options évaluées

### Option A — QR code chez le bénéficiaire (recommandé)

L'employeur génère un sticker QR depuis l'app (impression PDF), le colle à un endroit fixe du domicile (porte d'entrée, frigo). L'auxi scanne ce QR via la PWA pour pointer.

**Avantages**

- **RGPD léger** : pas de tracking de position, juste un scan ponctuel volontaire
- **Force la présence physique** : l'auxi doit être au domicile pour scanner
- **iOS / PWA compatible** : scanner caméra natif, fiable sur tous les téléphones modernes
- **Faible coût de déploiement** : un sticker imprimé par contrat
- **Offline-friendly** : le scan peut être enregistré en local et sync ensuite (cohérent avec PWA)
- **Neutre relationnellement** : "je badge en arrivant", pas perçu comme surveillance

**Faiblesses connues**

- L'auxi peut **photographier le QR à l'avance** et le scanner depuis chez elle
  - *Mitigation phase 1* : couplage avec photo lat/long ponctuelle au moment du scan (cf. § 4)
  - *Mitigation phase 2* : QR rotatif type TOTP (suppose un device chez le bénéficiaire)
- Si le sticker est arraché / illisible → blocage
  - *Mitigation* : fallback "saisie manuelle" gardé, mais marqué `clock_in_method = 'manual'` pour audit

### Option B — Géolocalisation

Vérifier que la position GPS de l'auxi correspond à l'adresse du bénéficiaire au moment du clock-in.

**Avantages**

- Pas de matériel à déployer (sticker, etc.)
- Vérification "automatique" perçue par l'utilisateur

**Inconvénients (bloquants)**

- **RGPD très encadré** (art. 88 RGPD + délibération CNIL 2015-165) :
  - Géolocalisation des salariés = donnée sensible
  - DPIA obligatoire, consentement explicite, droit d'opposition
  - Finalité limitée, durée de conservation courte, minimisation
  - Risque d'amende CNIL si mal cadré
- **Précision indoor ±20-50m** (béton, étages) → faux positifs
- **Spoofable** sur Android via apps "Fake GPS" (faille fondamentale)
- **PWA iOS** : géolocalisation background non fiable
- **Auxi proche du domicile** (200m) → faux positif systématique
- **Perception salarié** : tracking continu = relation employeur/salarié dégradée

**Conclusion** : la géoloc seule n'est pas une bonne solution principale. Elle peut être **complémentaire** au QR (cf. § 4).

### Option C — Statu quo + sensibilisation

Garder le pointage déclaratif et compter sur la confiance / sanctions contractuelles.

**Inconvénients** : ne répond pas au feedback de Marie. Aucune amélioration de la traçabilité.

**Rejeté.**

---

## 3. Reco : QR code en deux phases

### Phase 1 — MVP QR statique (1 sprint)

**Périmètre**

- Token UUID stable par contrat (ou par bénéficiaire) → généré côté serveur
- Page employeur "Imprimer mon badge de pointage" → PDF avec le QR + nom du bénéficiaire + nom du contrat
- Lecteur QR intégré à la PWA auxi (`html5-qrcode`)
- Scan validé = clock-in/out direct, sans formulaire
- Champ DB `clock_in_method` sur la table `clock_in_entries` : `'qr_scan' | 'manual' | 'retroactive'`
- Fallback manuel conservé, mais l'employeur voit "Pointage manuel — l'auxi n'a pas scanné le badge" sur le récap

**Acceptance criteria**

- L'employeur peut générer et imprimer un badge depuis `/parametres` (ou page contrat)
- L'auxi peut scanner le QR depuis le widget pointage du dashboard
- Un scan invalide (QR d'un autre client, QR expiré) → message d'erreur clair
- Le récap mensuel distingue visuellement les pointages QR vs manuels

### Phase 2 — Renforcement anti-fraude (optionnel, selon retours)

À déclencher **uniquement si abus constatés en réel** sur la phase 1.

**Sous-options**

- **2a — QR rotatif (TOTP-style)** : le QR change toutes les 60s. Suppose un device permanent chez le bénéficiaire (tablette dédiée, app de l'aidant, etc.). Plus contraignant mais infalsifiable.
- **2b — Photo lat/long ponctuelle au scan** (cf. § 4) : aucun déploiement matériel supplémentaire, RGPD acceptable, détecte les fraudes basiques (auxi qui scan depuis chez elle).

**Reco** : commencer par **2b** (plus simple, moins intrusif) et ne passer au QR rotatif qu'en dernier recours.

---

## 4. Variante hybride QR + position ponctuelle

Au moment du scan QR (et **uniquement à ce moment**) :

1. La PWA demande la position GPS via `navigator.geolocation.getCurrentPosition()`
2. Lat/long capturée **une seule fois** (pas de tracking continu)
3. Stockée avec le pointage : `clock_in_lat`, `clock_in_lng`, `clock_in_accuracy_m`
4. Comparaison côté serveur avec l'adresse du bénéficiaire (géocodée au moment de la création du contrat) : si distance > 200m, flag `suspicious = true` (notification employeur, pas de blocage automatique)

**Pourquoi c'est RGPD-acceptable** :

- Finalité claire et limitée (preuve de présence au moment du pointage)
- Captation ponctuelle, pas de tracking
- Donnée minimisée (un point lat/long par pointage, pas un historique)
- Consentement recueilli à l'onboarding auxi
- Auxi peut **refuser** la géoloc → fallback : pointage `qr_scan` sans position, mais marqué pour l'employeur

C'est compatible avec la délibération CNIL "géolocalisation des véhicules de salariés" appliquée par analogie.

---

## 5. Modèle de données

### Migration

Nouveau fichier `supabase/migrations/0XX_qr_clockin.sql` :

```sql
-- Token QR par contrat (stable phase 1, rotatif phase 2)
ALTER TABLE contracts
  ADD COLUMN clock_in_qr_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN clock_in_qr_revoked_at timestamptz NULL;

-- Méthode de pointage + preuve géo optionnelle
ALTER TABLE clock_in_entries
  ADD COLUMN clock_in_method text NOT NULL DEFAULT 'manual'
    CHECK (clock_in_method IN ('qr_scan', 'manual', 'retroactive')),
  ADD COLUMN clock_in_lat numeric(9, 6) NULL,
  ADD COLUMN clock_in_lng numeric(9, 6) NULL,
  ADD COLUMN clock_in_accuracy_m integer NULL,
  ADD COLUMN clock_in_suspicious boolean NOT NULL DEFAULT false;

-- Index sur le token pour lookup au scan
CREATE INDEX idx_contracts_clock_in_qr_token ON contracts(clock_in_qr_token)
  WHERE clock_in_qr_revoked_at IS NULL;
```

### RLS

- `clock_in_qr_token` lisible par l'auxi rattachée au contrat (pour validation côté serveur)
- L'employeur peut le **régénérer** (révocation + nouveau token) si compromis
- Endpoint RPC `validate_clockin_qr(token)` qui retourne `contract_id` + `employee_id` si valide, sinon `null`

---

## 6. UX — flux auxi

### Cas nominal

1. Dashboard auxi → widget pointage : bouton **"Scanner pour pointer"**
2. Caméra s'ouvre (`html5-qrcode`)
3. Scan reconnu → confirmation : "Vous allez pointer chez **Mme Dupont** (intervention 9h00 → 13h00). Confirmer ?"
4. Validation → clock-in enregistré, retour au dashboard avec confirmation
5. Le widget affiche **"Intervention en cours · 9h00 → 13h00"** + chrono
6. À la fin : même flow inverse, scan QR pour pointer la sortie

### Cas d'erreur

- QR illisible / d'un autre contrat → "Ce badge ne correspond à aucune intervention prévue. Demander à l'employeur de vérifier."
- Permission caméra refusée → fallback bouton "Saisie manuelle"
- Pas de réseau → enregistrement local (PWA), sync au retour de connexion

---

## 7. Librairies envisagées

- **Lecteur QR PWA** : [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) (~150kb, BSD-3, PWA-friendly, iOS Safari OK)
  - Alternative : `react-qr-scanner` (plus léger mais moins maintenu)
- **Génération QR — 2 options à arbitrer plus tard** :
  - [`qrcode`](https://www.npmjs.com/package/qrcode) (~30kb) — minimaliste, juste un QR noir/blanc. Suffisant pour un MVP fonctionnel.
  - [`qr-code-styling`](https://www.npmjs.com/package/qr-code-styling) (~50kb gzipped) — supporte logo central, dots arrondis, couleurs custom, corners stylisés. Plus pro pour un badge imprimé.
  - Décision : ship MVP avec `qrcode` puis migrer vers `qr-code-styling` quand on veut un rendu branded, ou partir directement sur `qr-code-styling` si Marie veut un badge "présentable" dès le départ.
- **PDF** : `@react-pdf/renderer` (déjà utilisé dans le projet)

---

## 8. Estimation

| Phase | Tâches | Estimation |
|-------|--------|-----------|
| **1 MVP** | Migration DB · service `qrClockInService` · scanner widget · génération PDF badge · update `clock_in_method` partout · tests · UI distinguant QR/manuel | **5-7 jours dev** |
| **2b — Hybride géo** | Capture lat/long au scan · géocodage adresse contrat · flag `suspicious` · UI employeur · consentement RGPD onboarding | **3-4 jours dev** |
| **2a — QR rotatif** (si nécessaire) | Génération TOTP côté serveur · device dédié bénéficiaire · sync horloge · UX | **2 sprints** |

---

## 9. Décisions à valider avec Marie avant développement

1. **Phase 1 pure QR statique** suffisante pour démarrer, ou besoin direct de la phase 2b (QR + position) ?
2. **Pointages manuels** : toujours autorisés (fallback QR cassé) avec marquage audit, ou bloqués sauf validation employeur a posteriori ?
3. **Que faire d'un pointage `suspicious`** (distance > 200m de l'adresse client) : notification simple à l'employeur, blocage du clock-in, ou validation manuelle requise ?
4. **Génération badge** : page dédiée par contrat, ou intégré dans la fiche contrat existante ?

---

## 10. Risques & contournements

| Risque | Probabilité | Mitigation |
|--------|-------------|-----------|
| Auxi photographie le QR à l'avance | Moyenne | Phase 2b (position ponctuelle) ou phase 2a (QR rotatif) |
| Sticker arraché / perdu | Faible | Page employeur "Régénérer le badge" + fallback manuel |
| Auxi sans smartphone récent (caméra HS) | Très faible | Fallback saisie manuelle |
| Refus caméra par l'auxi | Faible | Fallback manuel + sensibilisation onboarding |
| Faux positif géoloc (auxi habite à côté) | Possible | Seuil `suspicious` à 200m, pas blocage automatique |
| Données géo mal cadrées RGPD | Élevé si négligé | DPIA + consentement + minimisation (cf. § 4) |

---

## 11. Implémentation technique — génération QR

> Deux variantes documentées ci-dessous. Le choix sera tranché au moment du dev (cf. § 7) :
> - **Variante A (minimaliste)** : `qrcode` — QR sobre noir/blanc, plus léger, suffisant pour un MVP
> - **Variante B (brandée)** : `qr-code-styling` — logo central, dots arrondis, couleurs charte

### Variante A — `qrcode` (minimaliste)

#### Dépendances

```bash
npm install qrcode
npm install -D @types/qrcode
```

`@react-pdf/renderer` est déjà dans le projet (utilisé pour les exports PDF).

### Stratégie de contenu du QR

**Le QR encode uniquement le token UUID brut** (`550e8400-e29b-41d4-a716-446655440000`), pas une URL. Raisons :

- Empêche un scan via l'app caméra native iOS/Android d'ouvrir un navigateur lambda — le scan ne fonctionne **que** depuis la PWA Unilien
- Plus court → QR plus dense → plus tolérant à la dégradation du sticker
- Pas de fuite d'information sur l'URL de prod si le QR est photographié

### Affichage à l'écran (preview)

```tsx
// src/components/clock-in/ClockInBadgePreview.tsx
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Box, Image, Spinner } from '@chakra-ui/react'

interface Props {
  token: string
  size?: number
}

export function ClockInBadgePreview({ token, size = 256 }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(token, {
      width: size,
      errorCorrectionLevel: 'M', // tolère ~15% de dégradation
      margin: 2,
      color: { dark: '#1a2435', light: '#ffffff' },
    }).then(setDataUrl)
  }, [token, size])

  if (!dataUrl) return <Spinner />
  return <Image src={dataUrl} alt="QR de pointage" boxSize={`${size}px`} />
}
```

### Génération PDF imprimable

> ⚠️ `@react-pdf/renderer` ne supporte pas `<canvas>` — il faut générer le DataURL en amont via `QRCode.toDataURL()` puis le passer en `<Image src={...} />`.

```tsx
// src/lib/export/clockInBadgePdf.tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import QRCode from 'qrcode'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 12, color: '#5a6573', marginBottom: 24 },
  qr: { width: 320, height: 320, marginBottom: 24 },
  beneficiary: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  contract: { fontSize: 12, color: '#5a6573', marginBottom: 32 },
  instructions: { fontSize: 10, color: '#5a6573', textAlign: 'center', maxWidth: 400 },
})

interface BadgeProps {
  token: string
  beneficiaryName: string
  contractLabel: string
}

export async function buildClockInBadgePdf({ token, beneficiaryName, contractLabel }: BadgeProps) {
  const qrDataUrl = await QRCode.toDataURL(token, {
    width: 800, // grande taille pour impression nette
    errorCorrectionLevel: 'H', // 30% — résiste à un sticker abîmé
    margin: 1,
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Badge de pointage</Text>
        <Text style={styles.subtitle}>À coller à un endroit fixe du domicile</Text>
        <Image src={qrDataUrl} style={styles.qr} />
        <Text style={styles.beneficiary}>{beneficiaryName}</Text>
        <Text style={styles.contract}>{contractLabel}</Text>
        <Text style={styles.instructions}>
          L'auxiliaire scanne ce QR depuis l'application Unilien à son arrivée et à son départ.
          Si le badge est abîmé ou perdu, l'employeur peut en générer un nouveau depuis ses paramètres.
        </Text>
      </Page>
    </Document>
  )
}
```

### Trigger du téléchargement

```tsx
import { pdf } from '@react-pdf/renderer'
import { buildClockInBadgePdf } from '@/lib/export/clockInBadgePdf'

export async function downloadClockInBadge(
  token: string,
  beneficiaryName: string,
  contractLabel: string,
) {
  const document = await buildClockInBadgePdf({ token, beneficiaryName, contractLabel })
  const blob = await pdf(document).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `badge-pointage-${beneficiaryName.toLowerCase().replace(/\s+/g, '-')}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
```

### Génération du token côté serveur

Pas de génération front — la migration SQL s'en charge :

```sql
ALTER TABLE contracts
  ADD COLUMN clock_in_qr_token uuid UNIQUE DEFAULT gen_random_uuid();
```

Chaque contrat a son token unique stable dès la création.

### Régénération (révocation + nouveau token)

RPC Supabase à appeler depuis l'employeur si le badge est compromis :

```sql
CREATE FUNCTION regenerate_clockin_qr_token(p_contract_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  new_token uuid := gen_random_uuid();
BEGIN
  UPDATE contracts
  SET clock_in_qr_token = new_token,
      clock_in_qr_revoked_at = now()
  WHERE id = p_contract_id
    AND employer_id = auth.uid();  -- RLS: employeur uniquement

  RETURN new_token;
END;
$$;
```

L'ancien token devient invalide automatiquement via le `WHERE clock_in_qr_revoked_at IS NULL` de l'index/lookup côté validation.

### Variante B — `qr-code-styling` (avec logo Unilien)

#### Dépendances

```bash
npm install qr-code-styling
```

Pas de `@types/...` nécessaire — la lib expose ses propres types TypeScript.

#### Caveats à respecter

Insérer un logo réduit la lisibilité du QR. Pour compenser :

- **`errorCorrectionLevel: 'H'`** obligatoire (30% de tolérance, vs 15% en `M`)
- **Logo max 20-25%** de la surface du QR (`imageSize: 0.22`) — au-delà, beaucoup de scanners galèrent
- **Logo simple et contrasté** (logo Unilien Ardoise sur fond blanc → idéal)
- **Marge blanche autour du logo** (`margin: 8`) pour séparer visuellement du pattern

#### Génération du QR avec logo

```tsx
// src/lib/qr/buildBrandedQrDataUrl.ts
import QRCodeStyling from 'qr-code-styling'
import logoUrl from '@/assets/logo-unilien.svg'

export async function buildBrandedQrDataUrl(token: string, size = 800): Promise<string> {
  const qr = new QRCodeStyling({
    width: size,
    height: size,
    type: 'canvas',
    data: token,
    image: logoUrl,
    qrOptions: {
      errorCorrectionLevel: 'H', // ← obligatoire avec logo
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 8,
      imageSize: 0.22, // 22% — sweet spot lisibilité/visibilité
      hideBackgroundDots: true,
    },
    dotsOptions: {
      type: 'rounded',
      color: '#1a2435', // Ardoise (charte Unilien)
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#1a2435',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#1a2435',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  })

  const blob = await qr.getRawData('png')
  if (!blob) throw new Error('QR generation failed')

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob as Blob)
  })
}
```

#### Intégration dans le PDF

Identique à la variante A, mais on remplace l'appel à `QRCode.toDataURL()` par `buildBrandedQrDataUrl()` :

```tsx
// dans buildClockInBadgePdf
- const qrDataUrl = await QRCode.toDataURL(token, { ... })
+ const qrDataUrl = await buildBrandedQrDataUrl(token, 800)
```

Le reste du `<Document>` ne change pas.

#### Aperçu visuel attendu

- Carré 800×800, fond blanc
- Dots arrondis Ardoise (`#1a2435`)
- 3 corners avec carrés extra-arrondis
- Logo Unilien centré avec marge blanche

→ Cohérent avec la charte visuelle du projet, "présentable" pour l'impression chez le bénéficiaire.

### Décision à prendre au moment du dev

| Critère | Variante A (`qrcode`) | Variante B (`qr-code-styling`) |
|---------|----------------------|-------------------------------|
| Taille bundle | ~30kb | ~50kb gzipped |
| Logo | Non | Oui |
| Style custom | Couleurs uniquement | Dots, corners, gradients |
| Effort intégration | Direct | +30 min de paramétrage |
| Rendu "pro" pour impression | Sobre | Brandé Unilien |

**Reco par défaut** : démarrer sur la variante A pour shipper vite, basculer sur B au moment de la review esthétique avec Marie. Les deux utilisent le même token côté serveur, donc la migration A→B ne touche pas la DB ni la logique de validation.
