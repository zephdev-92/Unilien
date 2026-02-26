import { describe, it, expect } from 'vitest'
import {
  getPchElementRate,
  calcEnveloppePch,
  PCH_TARIFFS_2026,
  PCH_TYPE_LABELS,
  type PchType,
} from './pchTariffs'

describe('pchTariffs', () => {
  describe('PCH_TARIFFS_2026', () => {
    it('définit 5 types de dispositif', () => {
      expect(Object.keys(PCH_TARIFFS_2026)).toHaveLength(5)
    })

    it('emploiDirect = 19,34 €/h (tarif 2026)', () => {
      expect(PCH_TARIFFS_2026.emploiDirect).toBe(19.34)
    })

    it('mandataire = 21,27 €/h', () => {
      expect(PCH_TARIFFS_2026.mandataire).toBe(21.27)
    })

    it('prestataire = 25,00 €/h', () => {
      expect(PCH_TARIFFS_2026.prestataire).toBe(25.00)
    })

    it('aidantFamilial = 4,78 €/h', () => {
      expect(PCH_TARIFFS_2026.aidantFamilial).toBe(4.78)
    })

    it('aidantFamilialCessation = 7,16 €/h', () => {
      expect(PCH_TARIFFS_2026.aidantFamilialCessation).toBe(7.16)
    })
  })

  describe('PCH_TYPE_LABELS', () => {
    it('fournit un label pour chaque type', () => {
      const types: PchType[] = [
        'emploiDirect',
        'mandataire',
        'prestataire',
        'aidantFamilial',
        'aidantFamilialCessation',
      ]
      types.forEach((t) => {
        expect(PCH_TYPE_LABELS[t]).toBeDefined()
        expect(PCH_TYPE_LABELS[t].length).toBeGreaterThan(0)
      })
    })

    it('les labels incluent le tarif horaire', () => {
      expect(PCH_TYPE_LABELS.emploiDirect).toContain('19,34')
      expect(PCH_TYPE_LABELS.mandataire).toContain('21,27')
      expect(PCH_TYPE_LABELS.prestataire).toContain('25,00')
    })
  })

  describe('getPchElementRate', () => {
    it('retourne le tarif correct pour emploiDirect', () => {
      expect(getPchElementRate('emploiDirect')).toBe(19.34)
    })

    it('retourne le tarif correct pour mandataire', () => {
      expect(getPchElementRate('mandataire')).toBe(21.27)
    })

    it('retourne le tarif correct pour prestataire', () => {
      expect(getPchElementRate('prestataire')).toBe(25.00)
    })

    it('retourne le tarif correct pour aidantFamilial', () => {
      expect(getPchElementRate('aidantFamilial')).toBe(4.78)
    })

    it('retourne le tarif correct pour aidantFamilialCessation', () => {
      expect(getPchElementRate('aidantFamilialCessation')).toBe(7.16)
    })
  })

  describe('calcEnveloppePch', () => {
    it('calcule correctement l\'enveloppe pour emploiDirect (60h)', () => {
      // 60h × 19,34 = 1160,40
      expect(calcEnveloppePch(60, 'emploiDirect')).toBeCloseTo(1160.40, 2)
    })

    it('calcule correctement l\'enveloppe pour mandataire (40h)', () => {
      // 40h × 21,27 = 850,80
      expect(calcEnveloppePch(40, 'mandataire')).toBeCloseTo(850.80, 2)
    })

    it('retourne 0 pour 0 heures', () => {
      expect(calcEnveloppePch(0, 'emploiDirect')).toBe(0)
    })

    it('calcule l\'enveloppe pour aidantFamilial (100h)', () => {
      // 100h × 4,78 = 478
      expect(calcEnveloppePch(100, 'aidantFamilial')).toBeCloseTo(478, 2)
    })
  })
})
