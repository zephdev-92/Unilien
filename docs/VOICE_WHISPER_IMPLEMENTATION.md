# Reconnaissance vocale cross-browser — Plan Whisper self-hosted

**Statut** : 📋 Planifié — en attente specs VPS

---

## Contexte

La Web Speech API (utilisée actuellement dans `useSpeechRecognition`) n'est pas supportée sur Firefox (refus de Mozilla pour raisons de vie privée — l'audio est envoyé à Google).

**État actuel** :
- Chrome / Edge / Safari : ✅ fonctionne via Web Speech API
- Firefox : ❌ bouton micro grisé + aria-label explicatif

**Objectif** : rendre la saisie vocale disponible sur tous les navigateurs via Whisper self-hosted sur VPS.

---

## Architecture cible

```
Browser (Firefox/Chrome/Safari)
  → MediaRecorder API (WebM/Opus — supporté partout)
  → POST audio blob
  → Supabase Edge Function "transcribe-audio"
  → VPS faster-whisper API
  → texte transcrit retourné
```

Le passage par une Edge Function évite les problèmes CORS et masque l'URL du VPS.

---

## Stack VPS recommandée

```bash
pip install faster-whisper fastapi uvicorn python-multipart
```

**Modèle recommandé** : `small` (bon équilibre qualité/vitesse en français sur CPU)

| Modèle | RAM requise | Qualité FR | Vitesse CPU |
|--------|-------------|------------|-------------|
| `tiny` | ~1 Go | Correct | Très rapide |
| `base` | ~1 Go | Bon | Rapide |
| `small` | ~2 Go | Très bon | Moyen |
| `medium` | ~5 Go | Excellent | Lent |
| `large` | ~10 Go | Parfait | Très lent |

> ⚠️ Specs VPS à confirmer avant de choisir le modèle.

---

## Plan d'implémentation

### Étape 1 — VPS : API faster-whisper

```python
# main.py
from fastapi import FastAPI, File, UploadFile
from faster_whisper import WhisperModel
import tempfile, os

app = FastAPI()
model = WhisperModel("small", device="cpu", compute_type="int8")

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    segments, _ = model.transcribe(tmp_path, language="fr")
    text = " ".join(s.text for s in segments).strip()
    os.unlink(tmp_path)
    return {"text": text}
```

```bash
# Lancer le serveur
uvicorn main:app --host 0.0.0.0 --port 8000
```

Sécuriser avec un token secret en header (`X-API-Key`).

### Étape 2 — Supabase Edge Function "transcribe-audio"

- Reçoit le blob audio du client
- Ajoute le `X-API-Key` et forward vers le VPS
- Retourne le texte transcrit
- Protégée par JWT Supabase (comme `send-email`)

### Étape 3 — Hook `useSpeechRecognition` — mode hybride

Adapter le hook pour détecter si la Web Speech API est disponible :
- **Disponible** (Chrome/Edge/Safari) → utiliser Web Speech API (temps réel, pas de latence)
- **Non disponible** (Firefox) → basculer sur `MediaRecorder` + Edge Function (transcription à l'arrêt)

```ts
// Logique de sélection dans le hook
const useNativeAPI = !!window.SpeechRecognition || !!window.webkitSpeechRecognition
```

### Étape 4 — MessageInput

Adapter le bouton micro pour afficher l'état selon le mode :
- Mode natif : transcription en temps réel dans le textarea
- Mode Whisper : indicateur "Enregistrement..." → transcription à l'arrêt

---

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `supabase/functions/transcribe-audio/index.ts` | Créer Edge Function |
| `src/hooks/useSpeechRecognition.ts` | Ajouter mode MediaRecorder/Whisper |
| `src/components/liaison/MessageInput.tsx` | Adapter UI selon mode |
| `supabase/secrets` | Ajouter `WHISPER_API_URL` + `WHISPER_API_KEY` |
| VPS `main.py` | Déployer API faster-whisper |

---

## Sécurité

- URL du VPS jamais exposée côté client — toujours proxié via Edge Function
- `X-API-Key` stocké dans les secrets Supabase
- Rate limiting à ajouter sur l'Edge Function (comme `send-email`)
- Audio supprimé immédiatement après transcription (pas de stockage)

---

## TODO

- [ ] Confirmer specs VPS (RAM, CPU, OS) pour choisir le modèle Whisper
- [ ] Installer faster-whisper sur VPS + tester latence
- [ ] Créer Edge Function `transcribe-audio`
- [ ] Adapter `useSpeechRecognition` en mode hybride
- [ ] Adapter `MessageInput` pour les deux modes
- [ ] Tests cross-browser (Firefox, Chrome, Safari)
