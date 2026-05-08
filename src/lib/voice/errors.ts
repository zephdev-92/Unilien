/**
 * Traduit les erreurs typiques du flow nav vocale (getUserMedia, MicVAD,
 * Whisper) en messages français actionnables. Les codes DOMException de
 * getUserMedia sont stables cross-browser ; on s'appuie dessus plutôt que
 * sur les .message qui varient (ex: Firefox renvoie "The request is not
 * allowed by the user agent or the platform in the current context" pour
 * NotAllowedError, Chrome "Permission denied").
 */
export function formatVoiceError(err: unknown): string {
  if (err instanceof DOMException || (err instanceof Error && 'name' in err)) {
    switch (err.name) {
      case 'NotAllowedError':
        return "Accès au micro refusé. Clique sur l'icône cadenas à gauche de l'URL pour autoriser le micro, puis réessaie."
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'Aucun micro détecté. Branche un micro et réessaie.'
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Micro inaccessible : il est probablement utilisé par une autre application.'
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        return "Le micro ne supporte pas la configuration requise."
      case 'SecurityError':
        return 'Le micro nécessite une connexion sécurisée (HTTPS) ou localhost.'
      case 'AbortError':
        return 'Capture annulée.'
    }
  }
  if (err instanceof Error) return err.message
  return 'Erreur inconnue'
}
