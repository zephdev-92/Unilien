import { create } from 'zustand'

/**
 * Diagnostic vocal — store éphémère (RAM only, pas persisté).
 *
 * Garde les 10 dernières transcriptions Whisper qui n'ont pas matché
 * une commande, pour permettre à l'utilisateur (ou à un proche dev) de
 * voir ce que le moteur de reconnaissance a réellement entendu quand
 * une commande échoue. Utile pour ajuster les variantes phonétiques
 * dans `src/lib/voice/voiceCommands.ts` quand un utilisateur cible
 * (ex: Marie) reporte que "ça ne reconnaît rien".
 *
 * Pas de persistance : les données sont vidées au reload, le panneau
 * Paramètres affiche uniquement la session courante. Évite toute fuite
 * via localStorage.
 */

export interface VoiceDiagnosticEntry {
  id: string
  timestamp: number
  primary: string
  alternatives: string[]
}

interface VoiceDiagnosticsState {
  entries: VoiceDiagnosticEntry[]
  pushEntry: (entry: Omit<VoiceDiagnosticEntry, 'id' | 'timestamp'>) => void
  clear: () => void
}

const MAX_ENTRIES = 10

export const useVoiceDiagnosticsStore = create<VoiceDiagnosticsState>((set) => ({
  entries: [],
  pushEntry: ({ primary, alternatives }) =>
    set((state) => ({
      entries: [
        {
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
          primary,
          alternatives,
        },
        ...state.entries,
      ].slice(0, MAX_ENTRIES),
    })),
  clear: () => set({ entries: [] }),
}))
