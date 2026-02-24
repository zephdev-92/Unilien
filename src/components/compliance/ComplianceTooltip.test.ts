import { describe, it, expect } from 'vitest'
import { getRuleHelp, getRuleTip } from './ComplianceTooltip'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('getRuleHelp', () => {
  it('retourne l\'aide pour DAILY_REST', () => {
    const help = getRuleHelp('DAILY_REST')
    expect(help).not.toBeNull()
    expect(help?.title).toBe('Repos quotidien')
    expect(help?.limit).toBe('11 heures consécutives')
  })

  it('retourne l\'aide pour WEEKLY_REST', () => {
    const help = getRuleHelp('WEEKLY_REST')
    expect(help?.title).toBe('Repos hebdomadaire')
  })

  it('retourne l\'aide pour MANDATORY_BREAK', () => {
    const help = getRuleHelp('MANDATORY_BREAK')
    expect(help?.title).toBe('Pause obligatoire')
    expect(help?.limit).toBe('20 min si > 6h de travail')
  })

  it('retourne l\'aide pour WEEKLY_MAX_HOURS', () => {
    const help = getRuleHelp('WEEKLY_MAX_HOURS')
    expect(help?.title).toBe('Maximum hebdomadaire')
    expect(help?.limit).toBe('48 heures maximum')
  })

  it('retourne l\'aide pour DAILY_MAX_HOURS', () => {
    const help = getRuleHelp('DAILY_MAX_HOURS')
    expect(help?.title).toBe('Maximum quotidien')
    expect(help?.limit).toBe('10 heures maximum')
  })

  it('retourne l\'aide pour SHIFT_OVERLAP', () => {
    const help = getRuleHelp('SHIFT_OVERLAP')
    expect(help?.title).toBe('Chevauchement')
  })

  it('retourne null pour une règle non définie dans le mapping', () => {
    const help = getRuleHelp('ABSENCE_CONFLICT' as Parameters<typeof getRuleHelp>[0])
    expect(help).toBeNull()
  })

  it('retourne une description pour chaque règle définie', () => {
    const rules = ['DAILY_REST', 'WEEKLY_REST', 'MANDATORY_BREAK', 'WEEKLY_MAX_HOURS', 'DAILY_MAX_HOURS', 'SHIFT_OVERLAP'] as const
    for (const rule of rules) {
      const help = getRuleHelp(rule)
      expect(help?.description).toBeTruthy()
    }
  })

  it('retourne un conseil (tip) pour chaque règle définie', () => {
    const rules = ['DAILY_REST', 'WEEKLY_REST', 'MANDATORY_BREAK', 'WEEKLY_MAX_HOURS', 'DAILY_MAX_HOURS', 'SHIFT_OVERLAP'] as const
    for (const rule of rules) {
      const help = getRuleHelp(rule)
      expect(help?.tip).toBeTruthy()
    }
  })
})

describe('getRuleTip', () => {
  it('retourne le conseil pour DAILY_REST', () => {
    const tip = getRuleTip('DAILY_REST')
    expect(tip).toContain('Décalez')
  })

  it('retourne le conseil pour WEEKLY_REST', () => {
    const tip = getRuleTip('WEEKLY_REST')
    expect(tip).toContain('repos')
  })

  it('retourne un message par défaut pour une règle sans tip', () => {
    const tip = getRuleTip('ABSENCE_CONFLICT' as Parameters<typeof getRuleTip>[0])
    expect(tip).toBe('Vérifiez les paramètres de l\'intervention')
  })
})
