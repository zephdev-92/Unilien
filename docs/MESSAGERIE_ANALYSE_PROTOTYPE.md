# Analyse Messagerie — Prototype vs Application

Comparaison détaillée entre le prototype HTML/CSS (`liaison.html`, `style.css`) et l’implémentation React actuelle (`LiaisonPage`, `ConversationList`, `MessageBubble`, `MessageInput`).

---

## 1. Structure globale

| Élément | Prototype | Application | Aligné ? |
|--------|-----------|-------------|----------|
| Layout | `.messaging-layout` (flex, 3 colonnes) | `Flex` avec `Box` conv-list + `Flex` thread | ✅ Oui |
| Liste conv | `.conv-list` (340px) | `ConversationList` w 340px (lg) / 280px (md) | ⚠️ md: 280px vs 340px |
| Thread | `.conv-thread` | `Flex` direction column | ✅ |
| Placeholder vide | `.conv-empty` | `Center` avec icône + texte | ✅ |

---

## 2. Topbar / Bouton « Nouveau »

| Élément | Prototype | Application | Aligné ? |
|--------|-----------|-------------|----------|
| Classe bouton | `btn btn-primary btn-sm` | `Button` bg `#3D5166`, color white | ✅ |
| Icône | SVG `+` (line) | SVG idem | ✅ |
| Label | « Nouveau » | « Nouveau » | ✅ |
| Style | `background: var(--c-primary)` (#3D5166), `color: #fff` | bg `#3D5166`, color white | ✅ |

**Note** : Le prototype utilise bien `btn-primary` (fond plein). La 2e maquette visuelle (ghost) ne correspond pas au code du prototype.

---

## 3. Liste des conversations (conv-list)

### 3.1 En-tête / Recherche

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Conteneur | `.conv-list-header` (padding sp-4 sp-4 sp-3) | `Box` px=4 py=3 pb=2 | ⚠️ Légèrement différent |
| Search wrap | `.search-wrap` | `Flex` avec icône + Input | ✅ |
| Placeholder | « Rechercher… » | « Rechercher… » | ✅ |
| Icône loupe | 15×15px, stroke 2 | 14×14 | ⚠️ Mini écart |

### 3.2 Labels de groupe

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Classe | `.conv-group-label` | `Text` fontSize xs, fontWeight medium | ⚠️ |
| CSS prototype | `font-weight: 700`, `letter-spacing: 0.06em`, `text-transform: uppercase` | fontWeight medium (500) | ❌ 700 attendu |
| Padding | `var(--sp-3) var(--sp-3) var(--sp-1)` | px=4 py=2 | ⚠️ |

### 3.3 Item de conversation (conv-item)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Structure | `button.conv-item` | `Flex` onClick | ✅ (sémantique : prototype = button) |
| État actif | `.conv-item.active` bg primary-soft, border primary-mid | bg `#EDF1F5`, border `#C2D2E0` | ✅ |
| Hover | primary-soft | `#EDF1F5` | ✅ |
| Avatar | `.conv-avatar` 38×38px, border-radius 50% | `Flex` 38×38 ou `Avatar.Root` size sm | ✅ |
| Avatar Équipe | bg `var(--c-primary)`, icône SVG | bg `#3D5166`, icône users | ✅ |
| Avatar privé | bg `var(--c-primary)`, `var(--c-warm)`, `var(--c-accent)` | `Avatar.Fallback` (couleur Chakra) | ⚠️ Couleurs différentes selon personne |
| conv-name | `font-size: sm`, `font-weight: 700` | fontSize sm, fontWeight semibold si unread | ✅ |
| conv-preview | `font-size: xs`, `color: text-muted`, `margin-top: 2px` | fontSize xs, color text.muted | ✅ |
| conv-time | `font-size: xs`, `font-weight: 500`, color muted | fontSize 10px (au lieu de xs) | ⚠️ |
| Format date | HH:mm, « Hier », « Lun », « 22/02 » | `format(conv.updatedAt, 'HH:mm')` uniquement | ❌ Pas de « Hier » / « Lun » / « dd/MM » |
| conv-badge | bg primary, color #fff, borderRadius full, minW 18px | bg `#3D5166`, color white, minW 18px | ✅ |

### 3.4 « Nouvelle conversation » en bas

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Présence | ❌ Pas dans liaison.html | ✅ En bas de la liste | ➕ En plus (cohérent avec Nouveau en topbar) |

---

## 4. En-tête du thread (conv-thread-header)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Bouton retour | `.conv-back-btn` (display:none desktop) | `IconButton` display none md | ✅ |
| Avatar thread | `.conv-avatar-sm` 32×32 | ❌ Absent | ❌ Manque |
| Nom | `.conv-thread-name` (font-base, 700) | `Text` fontWeight semibold, fontSize md | ⚠️ |
| Sous-titre | `.conv-thread-sub` (font-xs, muted) | « Conversation d'équipe » ou rien | ⚠️ Prototype = « 3 participants » pour Équipe |

**Sous-titre selon type** :
- Prototype Équipe : « 3 participants »
- Prototype privé : « Auxiliaire de vie », « Aide à domicile »
- App Équipe : « Conversation d'équipe »
- App privé : rien

---

## 5. Messages (msg-row, msg-bubble)

### 5.1 Structure

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Conteneur msg | `.msg-row.msg-in` / `.msg-row.msg-out` | `Flex` justify flex-end/flex-start | ✅ |
| Max-width | `max-width: 78%` | `maxW` 85% base, 70% md | ⚠️ Prototype 78% |
| Alignement | msg-in flex-start, msg-out flex-end, row-reverse | idem | ✅ |

### 5.2 Bulles

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| msg-bubble-in | bg `var(--c-bg)` (#F3F6F9), border 1px, `border-bottom-left-radius: 4px` | bg `#F3F6F9`, border #D8E3ED, borderBottomLeftRadius 4px | ✅ |
| msg-bubble-out | bg `var(--c-primary)` (#3D5166), color #fff, `border-bottom-right-radius: 4px` | bg `#3D5166`, color white, borderBottomRightRadius 4px | ✅ |
| Padding | `var(--sp-3) var(--sp-4)` | px=4 py=3 | ✅ |
| Font size | `var(--fs-sm)` | fontSize md | ⚠️ sm vs md |

### 5.3 Heure (msg-time)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Position | **Dans** la bulle (à l’intérieur du `msg-bubble`) | **Sous** la bulle (Text après le Box) | ❌ Position différente |
| msg-out | `color: rgba(255,255,255,.6)` | color `rgba(255,255,255,0.6)` | ✅ |
| msg-in | `color: text-muted` | color text.muted | ✅ |
| Format | « Hier · 8h30 », « 9h12 » (sans date si aujourd’hui) | « HH:mm », « Hier HH:mm », « dd MMM HH:mm » | ⚠️ Format légèrement différent |

### 5.4 Avatar des messages entrants

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Taille | `.avatar.avatar-sm` | `Avatar.Root size="sm"` | ✅ |
| Couleurs | style inline `background: var(--c-warm)` JM, `var(--c-primary)` AD, `var(--c-accent)` SR | Avatar.Fallback (couleur par défaut Chakra) | ⚠️ Pas de couleur par personne |
| Contenu | Initiales (JM, AD, SR) | Initiales du prénom ou « ? » | ✅ |

### 5.5 Nom + badge rôle

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Présence | ❌ Pas de nom ni badge au-dessus des messages | ✅ Nom + Badge « Employeur »/« Auxiliaire »/« Aidant » | ➕ App ajoute de l’info (choix UX) |

Le prototype ne montre pas le nom de l’expéditeur à chaque message (contexte = conversation d’équipe). L’app le fait, ce qui clarifie qui parle.

### 5.6 Menu contexte (Modifier / Supprimer)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Présence | ❌ Aucun | ✅ Menu 3 points pour ses propres messages | ➕ Fonctionnalité en plus |

---

## 6. Séparateurs de date (msg-date-sep)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Valeurs | « Hier », « Aujourd'hui » | « Hier », « Aujourd'hui », ou « lundi 26 janvier » | ✅ |
| Style | `font-size: xs`, `font-weight: 700`, bg surface, padding 3px sp-4, borderRadius full, border 1px | fontSize xs, fontWeight 700, bg surface, px=4 py=3px, borderRadius full, border | ✅ |

---

## 7. Zone de saisie (conv-compose)

| Élément | Prototype | Application | Aligné ? |
|---------|-----------|-------------|----------|
| Layout | flex, align-items: flex-end, gap sp-2 | Flex gap=3 align=flex-end | ✅ |
| Padding | `var(--sp-3) var(--sp-4)` | p=4 | ⚠️ |
| Border-top | 1px solid border | borderTopWidth 1px | ✅ |
| Bouton attacher | `.compose-attach-btn` 38×38, rond, muted, hover primary | IconButton 44×44 | ⚠️ Taille |
| Bouton micro | idem | IconButton + REC badge si actif | ➕ Plus de fonctionnalités |
| Textarea | `.compose-textarea` borderRadius full, border 1.5px, bg bg, maxH 120px | borderRadius xl, bg gray.50, maxH 150px | ⚠️ Styles différents |
| Placeholder | « Écrire un message… » | « Écrire un message… » | ✅ |
| Bouton envoyer | `.compose-send-btn` 40×40, rond, bg primary | IconButton 44×44, borderRadius full, colorPalette brand | ⚠️ Taille + couleur brand vs #3D5166 |
| Indice clavier | — | « Entrée pour envoyer, Maj+Entrée pour nouvelle ligne » | ➕ En plus |

---

## 8. Avatars des conversations privées

| Personne | Prototype | Application |
|----------|-----------|-------------|
| Amara | `var(--c-primary)` #3D5166 | Avatar.Fallback (Chakra) |
| Jean-Pierre | `var(--c-warm)` #5E5038 | Avatar.Fallback |
| Sofia | `var(--c-accent)` #9BB23B | Avatar.Fallback |

L’app ne fixe pas de couleur par participant ; le prototype oui. Pour coller au prototype, il faudrait une logique de couleur par index ou par rôle.

---

## 9. Synthèse des écarts à corriger

### Priorité haute
1. **Heure dans la bulle** : déplacer le timestamp à l’intérieur du `msg-bubble`.
2. **Sous-titre du thread** : « 3 participants » pour Équipe, rôle ou métier pour les conv privées.
3. **Avatar dans le header du thread** : ajouter l’avatar à côté du nom.
4. **Format de date dans la liste** : « Hier », « Lun », « 22/02 » au lieu de toujours « HH:mm ».

### Priorité moyenne
5. **conv-group-label** : `fontWeight="700"`, `letterSpacing` et `textTransform="uppercase"` pour coller au prototype.
6. **Largeur conv-list sur md** : 340px au lieu de 280px.
7. **Taille texte des bulles** : `fontSize="sm"` au lieu de `md`.
8. **Boutons compose** : 38×38 (attach, micro) et 40×40 (envoyer) au lieu de 44×44.
9. **Couleur bouton Envoyer** : `#3D5166` plutôt que `colorPalette="brand"`.
10. **Avatars des conv privées** : couleur de fond selon participant (primary, warm, accent).

### Priorité basse
11. **max-width des messages** : 78 % au lieu de 70 %.
12. **Texte « modifié »** : couleur adaptée pour bulles envoyées (#3D5166).

---

## 10. Ce qui est déjà bien aligné

- Titre « Messagerie » et bouton « Nouveau » en topbar.
- Structure générale : liste + thread + placeholder vide.
- Couleurs des bulles (in/out), bordure, border-radius.
- Styles des conv-item actifs et badges non lus.
- Recherche avec icône et placeholder.
- Labels « Général » et « Conversations ».
- Placeholder de la zone de saisie.
- Séparateurs de date (Hier, Aujourd’hui, jour complet).
- Indicateur de frappe et menu supprimer (fonctionnalités en plus).

---

## 11. Variables CSS prototype utiles

```css
--c-primary: #3D5166
--c-primary-hover: #2E3F50
--c-primary-soft: #EDF1F5
--c-primary-mid: #C2D2E0
--c-bg: #F3F6F9
--c-border: #D8E3ED
--c-warm: #5E5038
--c-accent: #9BB23B
--c-text: #323538
--c-text-muted: #3D5166
```
