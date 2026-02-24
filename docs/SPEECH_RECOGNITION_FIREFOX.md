# Reconnaissance Vocale — Compatibilité Firefox & Fallback STT

**Date** : 24 février 2026
**Contexte** : `useSpeechRecognition.ts` — fallback navigateurs sans Web Speech API

---

## Situation actuelle

Le hook `useSpeechRecognition` utilise la **Web Speech API** (`window.SpeechRecognition` / `window.webkitSpeechRecognition`).

| Navigateur | Web Speech API | Statut |
|------------|---------------|--------|
| Chrome / Edge | ✅ | Natif |
| Safari | ✅ | Natif (webkit) |
| Firefox | ❌ | Non supporté |
| Firefox Mobile | ❌ | Non supporté |

Depuis le fix du 24/02/2026, `startListening()` affiche un message d'erreur explicite au lieu de retourner silencieusement. Mais Firefox reste sans reconnaissance vocale.

---

## Solutions envisagées

### Option A — Whisper via Supabase Edge Function ⭐ Recommandée

**Principe** : `MediaRecorder API` (supporté par tous les navigateurs) enregistre l'audio en local, puis envoie le blob audio à une Edge Function Supabase qui appelle OpenAI Whisper.

```
Utilisateur parle
  → MediaRecorder enregistre (WebM/Opus)
  → Bouton "Stop" → blob envoyé à Edge Function
  → Edge Function → OpenAI Whisper API
  → Transcription retournée au hook
  → setFinalTranscript(transcription)
```

**Avantages** :
- Compatible **tous navigateurs** (Chrome, Firefox, Safari, mobile)
- Cohérent avec la stack existante (Supabase Edge Functions déjà utilisées)
- Qualité de transcription excellente (Whisper large-v3)
- Supporte le français nativement

**Inconvénients** :
- Résultat **en différé** (pas de temps réel / pas d'interim results)
- Nécessite une connexion internet active pendant l'envoi
- Coût variable selon usage

**Coût** : ~0,006 $/min audio — négligeable pour un usage métier (notes courtes)

**Plan d'implémentation** :
```
[ ] Créer Edge Function supabase/functions/speech-to-text/index.ts
    → Reçoit un fichier audio (multipart/form-data)
    → Appelle OpenAI Whisper API (model: whisper-1, language: fr)
    → Retourne { transcript: string }
[ ] Ajouter OPENAI_API_KEY dans les secrets Supabase
[ ] Modifier useSpeechRecognition :
    → Si isSupported → comportement actuel (Web Speech API, temps réel)
    → Sinon → mode MediaRecorder + Whisper (différé)
[ ] Exposer isUsingFallback: boolean dans le return du hook
[ ] Mettre à jour les composants qui utilisent le hook (VoiceInput, NewLogEntryModal)
[ ] Tests : mock Edge Function + MediaRecorder
```

---

### Option B — Azure Cognitive Services Speech SDK

**Principe** : SDK JavaScript officiel Microsoft, reconnaisance temps réel sur tous les navigateurs.

```
npm install microsoft-cognitiveservices-speech-sdk
```

**Avantages** :
- Temps réel avec interim results (même UX que Web Speech API)
- Support multilingue complet
- 5 heures gratuites/mois

**Inconvénients** :
- SDK lourd (~500 KB)
- Dépendance externe forte (Microsoft)
- Configuration plus complexe (région, clé API, token)
- Coût : **1 $/heure audio** au-delà du quota gratuit

**Effort** : 2-3 jours

---

### Option C — Deepgram / AssemblyAI (WebSocket temps réel)

**Principe** : API WebSocket temps réel, compatible tous navigateurs via `MediaRecorder`.

**Avantages** :
- Temps réel avec streaming
- Qualité comparable à Whisper
- Compatible Firefox

**Inconvénients** :
- Nouvelle dépendance externe
- Coût : ~0,006 $/min (Deepgram) à 0,01 $/min (AssemblyAI)
- Clé API supplémentaire à gérer

**Effort** : 2-3 jours

---

## Comparatif

| Critère | Option A (Whisper) | Option B (Azure) | Option C (Deepgram) |
|---------|-------------------|-----------------|---------------------|
| Compatibilité | ✅ Tous | ✅ Tous | ✅ Tous |
| Temps réel | ❌ Différé | ✅ Oui | ✅ Oui |
| Cohérence stack | ✅ Edge Functions | ❌ SDK externe | ❌ SDK externe |
| Coût/min | ~0,006 $ | ~0,017 $ | ~0,006 $ |
| Effort | 1 jour | 2-3 jours | 2-3 jours |
| Qualité FR | ✅ Excellent | ✅ Excellent | ✅ Bon |

---

## Recommandation

**Option A (Whisper)** pour Unilien :

La reconnaissance vocale est utilisée pour saisir des **notes courtes** (cahier de liaison, annotations de shifts). Le temps réel n'est pas critique — l'utilisateur dicte puis valide. Le fallback différé est acceptable dans ce contexte.

L'intégration via Edge Function est naturelle dans la stack et n'ajoute aucune dépendance côté client.

---

## Fichiers concernés

- `src/hooks/useSpeechRecognition.ts` — hook principal à modifier
- `src/components/ui/VoiceInput.tsx` — composant UI (si existant)
- `src/components/logbook/NewLogEntryModal.tsx` — utilise la reconnaissance vocale
- `supabase/functions/speech-to-text/index.ts` — Edge Function à créer

---

## Références

- [OpenAI Whisper API](https://platform.openai.com/docs/guides/speech-to-text)
- [MediaRecorder API — MDN](https://developer.mozilla.org/fr/docs/Web/API/MediaRecorder)
- [Web Speech API — Compatibilité](https://caniuse.com/speech-recognition)
