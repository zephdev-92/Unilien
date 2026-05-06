import { describe, it, expect } from 'vitest'
import { matchCommand, normalize, listAvailableCommands, VOICE_COMMANDS } from './voiceCommands'

describe('voiceCommands.normalize', () => {
  it('lowercases, removes diacritics and punctuation', () => {
    expect(normalize('Paramètres !')).toBe('parametres')
    expect(normalize('Cahier de Liaison.')).toBe('cahier de liaison')
    expect(normalize('  Équipe  ')).toBe('equipe')
  })
})

describe('voiceCommands.matchCommand', () => {
  it('matches exact phrase', () => {
    const cmd = matchCommand('planning', 'employer')
    expect(cmd?.path).toBe('/planning')
  })

  it('matches phrase inside longer transcript', () => {
    const cmd = matchCommand("ouvre mon planning s'il te plaît", 'employer')
    expect(cmd?.path).toBe('/planning')
  })

  it('handles diacritics', () => {
    const cmd = matchCommand('équipe', 'employer')
    expect(cmd?.path).toBe('/equipe')
  })

  it('respects role gating — employee cannot access /equipe', () => {
    const cmd = matchCommand('équipe', 'employee')
    expect(cmd).toBeNull()
  })

  it('caregiver cannot access /documents (employer/employee only)', () => {
    const cmd = matchCommand('documents', 'caregiver')
    expect(cmd).toBeNull()
  })

  it('returns null when no match', () => {
    expect(matchCommand('blablabla', 'employer')).toBeNull()
    expect(matchCommand('', 'employer')).toBeNull()
  })

  it('prefers longer phrase match when multiple match', () => {
    // "cahier de liaison" should beat "cahier"
    const cmd = matchCommand('ouvrir cahier de liaison', 'employer')
    expect(cmd?.path).toBe('/cahier-de-liaison')
  })

  it('matches without a role for unrestricted commands', () => {
    const cmd = matchCommand('paramètres', null)
    expect(cmd?.path).toBe('/parametres')
  })

  it('does not match restricted commands when role is null', () => {
    expect(matchCommand('équipe', null)).toBeNull()
  })
})

describe('voiceCommands.listAvailableCommands', () => {
  it('returns all commands for employer', () => {
    const list = listAvailableCommands('employer')
    expect(list.length).toBe(VOICE_COMMANDS.length)
  })

  it('filters out employer-only commands for caregiver', () => {
    const list = listAvailableCommands('caregiver')
    expect(list.find((c) => c.path === '/equipe')).toBeUndefined()
    expect(list.find((c) => c.path === '/conformite')).toBeUndefined()
  })

  it('returns only unrestricted commands for null role', () => {
    const list = listAvailableCommands(null)
    expect(list.every((c) => !c.roles)).toBe(true)
  })
})
