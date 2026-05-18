import { create } from 'zustand'

/**
 * Diagnostic vocal — store éphémère (RAM only, pas persisté).
 *
 * Deux flux :
 *  - `entries` : les 10 dernières transcriptions Whisper qui n'ont pas matché
 *    une commande, pour voir ce que le moteur a réellement entendu.
 *  - `classifications` : les 5 derniers classements du classifier acoustique
 *    (forced-decoding Whisper), pour calibrer le scoring sans la console
 *    devtools — chaque commande candidate avec sa log-probabilité moyenne.
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

/** Score d'une commande candidate — miroir léger de `CommandScore`. */
export interface VoiceClassificationScore {
  phrase: string
  avgLogProb: number
}

export interface VoiceClassificationEntry {
  id: string
  timestamp: number
  /** Scores triés (meilleur d'abord, tel que renvoyé par le classifier). */
  scores: VoiceClassificationScore[]
}

interface VoiceDiagnosticsState {
  entries: VoiceDiagnosticEntry[]
  classifications: VoiceClassificationEntry[]
  pushEntry: (entry: Omit<VoiceDiagnosticEntry, 'id' | 'timestamp'>) => void
  pushClassification: (scores: VoiceClassificationScore[]) => void
  clear: () => void
}

const MAX_ENTRIES = 10
const MAX_CLASSIFICATIONS = 5

function makeId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useVoiceDiagnosticsStore = create<VoiceDiagnosticsState>((set) => ({
  entries: [],
  classifications: [],
  pushEntry: ({ primary, alternatives }) =>
    set((state) => ({
      entries: [
        { id: makeId(), timestamp: Date.now(), primary, alternatives },
        ...state.entries,
      ].slice(0, MAX_ENTRIES),
    })),
  pushClassification: (scores) =>
    set((state) => {
      if (scores.length === 0) return state
      return {
        classifications: [
          { id: makeId(), timestamp: Date.now(), scores },
          ...state.classifications,
        ].slice(0, MAX_CLASSIFICATIONS),
      }
    }),
  clear: () => set({ entries: [], classifications: [] }),
}))
