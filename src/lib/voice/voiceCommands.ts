import type { UserRole } from '@/types'

export interface VoiceCommand {
  phrases: string[]
  path: string
  roles?: UserRole[]
}

// Les variantes "phonétiques" listent les transcriptions courantes mal segmentées
// par Whisper (liaisons cassées, homophones) — elles permettent un match exact
// sans dépendre du fuzzy.
export const VOICE_COMMANDS: VoiceCommand[] = [
  { phrases: ['tableau de bord', 'accueil', 'dashboard', 'tableau bord', "t'as pris le debout", "t'a pris le debout", 'tableau du bord', 'tablo de bord'], path: '/tableau-de-bord' },
  { phrases: ['planning', 'agenda', 'calendrier', 'planing', 'plannings'], path: '/planning' },
  { phrases: ['équipe', 'equipe', 'auxiliaires', 'auxiliaire', 'et quitte', 'et quipe', 'équipée', 'équipes'], path: '/equipe', roles: ['employer'] },
  { phrases: ['messagerie', 'messages', 'chat', 'messagère', 'messagerit'], path: '/messagerie' },
  { phrases: ['cahier de liaison', 'liaison', 'cahier', 'cayer'], path: '/cahier-de-liaison' },
  { phrases: ['conformité', 'conformite', 'conformités'], path: '/conformite', roles: ['employer'] },
  { phrases: ['documents', 'document', 'bulletins', 'bulletin', 'documan'], path: '/documents', roles: ['employer', 'employee'] },
  { phrases: ['analytique', 'analytics', 'statistiques', 'stats', 'analyse', 'annelitique', 'analitique'], path: '/analytique' },
  { phrases: ['profil', 'mon profil', 'compte', 'profile'], path: '/profil' },
  { phrases: ['paramètres', 'parametres', 'réglages', 'reglages', 'settings', 'paramètre'], path: '/parametres' },
  { phrases: ['aide', 'help', 'faq'], path: '/aide' },
  { phrases: ['contact', 'contacter', 'contacts'], path: '/contact' },

  // Sous-menus paramètres — le matcher choisit la phrase la plus longue, donc
  // "paramètres apparence" l'emporte sur "paramètres" seul.
  { phrases: ['paramètres profil', 'parametres profil', 'paramètres informations', 'parametres informations'], path: '/parametres#profil' },
  { phrases: ['paramètres sécurité', 'parametres securite', 'paramètres securite'], path: '/parametres#securite' },
  { phrases: ['paramètres notifications', 'parametres notifications', 'paramètres notification', 'parametres notification'], path: '/parametres#notifications' },
  { phrases: ['paramètres apparence', 'parametres apparence', 'apparence paramètres', 'paramètres thème', 'parametres theme'], path: '/parametres#apparence' },
  { phrases: ['paramètres accessibilité', 'parametres accessibilite', 'paramètres accessibilite', 'accessibilité paramètres'], path: '/parametres#accessibilite' },

  // Actions — pattern URL intent (?action=...). La page cible lit le query au
  // mount, ouvre la modale, puis efface le param. Marche cross-page (nav + open).
  { phrases: ['ajouter intervention', 'nouvelle intervention', 'créer intervention', 'creer intervention', 'ajouter une intervention', 'ajouter shift'], path: '/planning?action=new-shift', roles: ['employer'] },
  { phrases: ['demander congé', 'demander conge', 'demander absence', 'demande absence', 'demande congé', 'demande conge', 'nouvelle absence'], path: '/planning?action=absence', roles: ['employee'] },
]

const DIACRITICS = /[̀-ͯ]/g

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[.,!?;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let prev = new Array(b.length + 1)
  let curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

// Tolérance de typos proportionnelle à la longueur (mots courts = 0 erreur autorisée).
function fuzzyThreshold(len: number): number {
  if (len <= 4) return 0
  if (len <= 8) return 1
  return 2
}

function fuzzyContains(transcript: string, phrase: string): boolean {
  const threshold = fuzzyThreshold(phrase.length)
  if (threshold === 0) return false
  const min = Math.max(1, phrase.length - threshold)
  const max = phrase.length + threshold
  for (let i = 0; i + min <= transcript.length; i++) {
    for (let len = min; len <= max && i + len <= transcript.length; len++) {
      const window = transcript.slice(i, i + len)
      if (levenshtein(window, phrase) <= threshold) return true
    }
  }
  return false
}

export function matchCommand(
  transcript: string,
  role?: UserRole | null,
  commands: VoiceCommand[] = VOICE_COMMANDS,
): VoiceCommand | null {
  const heard = normalize(transcript)
  if (!heard) return null
  // Whisper segmente parfois mal les liaisons (ex: "équipe" → "et quitte").
  // On compare aussi sans espaces pour rattraper ces cas.
  const heardCompact = heard.replace(/\s+/g, '')

  const eligible = commands.filter((c) => !c.roles || (role && c.roles.includes(role)))

  let best: { cmd: VoiceCommand; score: number } | null = null
  for (const cmd of eligible) {
    for (const phrase of cmd.phrases) {
      const p = normalize(phrase)
      const pCompact = p.replace(/\s+/g, '')

      // 1. Match exact (substring) — score boosté
      if (heard === p || heard.includes(p) || heardCompact.includes(pCompact)) {
        const score = p.length * 10
        if (!best || score > best.score) best = { cmd, score }
        continue
      }

      // 2. Fuzzy (typos Whisper) — score moindre, ne batte pas un exact.
      //    Tente d'abord la version segmentée puis la version compacte.
      if (fuzzyContains(heard, p) || fuzzyContains(heardCompact, pCompact)) {
        const score = p.length * 5
        if (!best || score > best.score) best = { cmd, score }
      }
    }
  }
  return best?.cmd ?? null
}

export function listAvailableCommands(role?: UserRole | null): VoiceCommand[] {
  return VOICE_COMMANDS.filter((c) => !c.roles || (role && c.roles.includes(role)))
}
