import type { UserRole } from '@/types'

export interface VoiceCommand {
  phrases: string[]
  path: string
  roles?: UserRole[]
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  { phrases: ['tableau de bord', 'accueil', 'dashboard'], path: '/tableau-de-bord' },
  { phrases: ['planning', 'agenda', 'calendrier', 'planing'], path: '/planning' },
  { phrases: ['équipe', 'equipe', 'auxiliaires', 'auxiliaire'], path: '/equipe', roles: ['employer'] },
  { phrases: ['messagerie', 'messages', 'chat'], path: '/messagerie' },
  { phrases: ['cahier de liaison', 'liaison', 'cahier'], path: '/cahier-de-liaison' },
  { phrases: ['conformité', 'conformite'], path: '/conformite', roles: ['employer'] },
  { phrases: ['documents', 'document', 'bulletins', 'bulletin'], path: '/documents', roles: ['employer', 'employee'] },
  { phrases: ['analytique', 'analytics', 'statistiques', 'stats'], path: '/analytique' },
  { phrases: ['profil', 'mon profil', 'compte'], path: '/profil' },
  { phrases: ['paramètres', 'parametres', 'réglages', 'reglages', 'settings'], path: '/parametres' },
  { phrases: ['aide', 'help', 'faq'], path: '/aide' },
  { phrases: ['contact', 'contacter'], path: '/contact' },
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

export function matchCommand(
  transcript: string,
  role?: UserRole | null,
  commands: VoiceCommand[] = VOICE_COMMANDS,
): VoiceCommand | null {
  const heard = normalize(transcript)
  if (!heard) return null

  const eligible = commands.filter((c) => !c.roles || (role && c.roles.includes(role)))

  let best: { cmd: VoiceCommand; score: number } | null = null
  for (const cmd of eligible) {
    for (const phrase of cmd.phrases) {
      const p = normalize(phrase)
      if (heard === p || heard.includes(` ${p} `) || heard.startsWith(`${p} `) || heard.endsWith(` ${p}`) || heard.includes(p)) {
        const score = p.length
        if (!best || score > best.score) best = { cmd, score }
      }
    }
  }
  return best?.cmd ?? null
}

export function listAvailableCommands(role?: UserRole | null): VoiceCommand[] {
  return VOICE_COMMANDS.filter((c) => !c.roles || (role && c.roles.includes(role)))
}
