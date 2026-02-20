import { describe, it, expect } from 'vitest'
import {
  calculateCotisations,
  PASS_MONTHLY_2025,
  SMIC_MONTHLY_2025,
} from './cotisationsCalculator'

// ── Helpers ───────────────────────────────────────────────────────────────────

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateCotisations', () => {
  // Salaire brut de référence : 1 500 € (< 2,5×SMIC ≈ 4 504,50 → taux réduits)
  const GROSS_1500 = 1_500
  // Salaire au-dessus de 2,5×SMIC et 3,5×SMIC pour déclencher taux pleins
  const GROSS_HIGH = 10_000

  describe('Constantes exportées', () => {
    it('PASS mensuel 2025 = 3 925 €', () => {
      expect(PASS_MONTHLY_2025).toBe(3_925)
    })

    it('SMIC mensuel 2025 = 1 801,80 €', () => {
      expect(SMIC_MONTHLY_2025).toBe(1_801.80)
    })
  })

  describe('Structure du résultat', () => {
    it('retourne les métadonnées grossPay, passMonthly, smicMonthly', () => {
      const result = calculateCotisations(GROSS_1500)
      expect(result.grossPay).toBe(GROSS_1500)
      expect(result.passMonthly).toBe(PASS_MONTHLY_2025)
      expect(result.smicMonthly).toBe(SMIC_MONTHLY_2025)
    })

    it('contient 5 lignes de cotisations salariales', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      expect(employeeCotisations).toHaveLength(5)
      expect(employeeCotisations.every((c) => !c.isEmployer)).toBe(true)
    })

    it('contient 9 lignes de cotisations patronales', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      expect(employerCotisations).toHaveLength(9)
      expect(employerCotisations.every((c) => c.isEmployer)).toBe(true)
    })
  })

  describe('Cotisations salariales (1 500 €)', () => {
    it('CSG déductible = 98,25% × 1 500 × 6,80%', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      const csg = employeeCotisations.find((c) => c.label === 'CSG déductible')!
      const csgBase = round2(GROSS_1500 * 0.9825)
      expect(csg.base).toBe(csgBase)
      expect(csg.rate).toBe(0.068)
      expect(csg.amount).toBe(round2(csgBase * 0.068))
    })

    it('CSG non déductible = 98,25% × 1 500 × 2,40%', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      const csgND = employeeCotisations.find((c) => c.label === 'CSG non déductible')!
      expect(csgND.rate).toBe(0.024)
    })

    it('CRDS = 98,25% × 1 500 × 0,50%', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      const crds = employeeCotisations.find((c) => c.label === 'CRDS')!
      expect(crds.rate).toBe(0.005)
    })

    it('Vieillesse plafonnée salariale = cappedBase × 6,90%', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      const vieux = employeeCotisations.find((c) =>
        c.label === 'Vieillesse de base (plafonnée)' && !c.isEmployer
      )!
      expect(vieux.base).toBe(Math.min(GROSS_1500, PASS_MONTHLY_2025))
      expect(vieux.rate).toBe(0.069)
    })

    it('AGIRC-ARRCO T1 salariale = cappedBase × 3,15%', () => {
      const { employeeCotisations } = calculateCotisations(GROSS_1500)
      const agirc = employeeCotisations.find((c) =>
        c.label === 'Retraite complémentaire AGIRC-ARRCO T1' && !c.isEmployer
      )!
      expect(agirc.rate).toBe(0.0315)
    })

    it('totalEmployeeDeductions est la somme des lignes salariales', () => {
      const result = calculateCotisations(GROSS_1500)
      const sum = round2(result.employeeCotisations.reduce((s, c) => s + c.amount, 0))
      expect(result.totalEmployeeDeductions).toBe(sum)
    })
  })

  describe('Cotisations patronales — taux réduits (brut ≤ 2,5×SMIC)', () => {
    it('Maladie au taux réduit 7% si brut ≤ 2,5×SMIC', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const maladie = employerCotisations.find(
        (c) => c.label === 'Maladie / Maternité / Invalidité / Décès'
      )!
      expect(maladie.rate).toBe(0.07)
      expect(maladie.amount).toBe(round2(GROSS_1500 * 0.07))
    })

    it('Allocations familiales au taux réduit 3,45% si brut ≤ 3,5×SMIC', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const alloc = employerCotisations.find(
        (c) => c.label === 'Allocations familiales'
      )!
      expect(alloc.rate).toBe(0.0345)
    })

    it('AT/MP = 0,50% toujours dû', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const atmp = employerCotisations.find((c) => c.label === 'AT/MP (taux moyen)')!
      expect(atmp.rate).toBe(0.005)
      expect(atmp.amount).toBe(round2(GROSS_1500 * 0.005))
    })

    it('Assurance chômage = 4,05%', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const chomage = employerCotisations.find((c) => c.label === 'Assurance chômage')!
      expect(chomage.rate).toBe(0.0405)
    })

    it('FNAL = 0,10%', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const fnal = employerCotisations.find((c) => c.label === 'FNAL')!
      expect(fnal.rate).toBe(0.001)
    })

    it('CSA = 0,30%', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const csa = employerCotisations.find(
        (c) => c.label === 'CSA (Contribution solidarité autonomie)'
      )!
      expect(csa.rate).toBe(0.003)
    })

    it('AGIRC-ARRCO T1 patronale = cappedBase × 4,72%', () => {
      const { employerCotisations } = calculateCotisations(GROSS_1500)
      const agirc = employerCotisations.find(
        (c) => c.label === 'Retraite complémentaire AGIRC-ARRCO T1' && c.isEmployer
      )!
      expect(agirc.rate).toBe(0.0472)
    })
  })

  describe('Cotisations patronales — taux pleins (brut élevé)', () => {
    it('Maladie au taux plein 13% si brut > 2,5×SMIC', () => {
      const { employerCotisations } = calculateCotisations(GROSS_HIGH)
      const maladie = employerCotisations.find(
        (c) => c.label === 'Maladie / Maternité / Invalidité / Décès'
      )!
      expect(maladie.rate).toBe(0.13)
    })

    it('Allocations familiales au taux plein 5,25% si brut > 3,5×SMIC', () => {
      const { employerCotisations } = calculateCotisations(GROSS_HIGH)
      const alloc = employerCotisations.find(
        (c) => c.label === 'Allocations familiales'
      )!
      expect(alloc.rate).toBe(0.0525)
    })

    it('assiette plafonnée = PASS mensuel si brut > PASS', () => {
      const { employerCotisations } = calculateCotisations(GROSS_HIGH)
      const vieux = employerCotisations.find(
        (c) => c.label === 'Vieillesse de base (plafonnée)' && c.isEmployer
      )!
      expect(vieux.base).toBe(PASS_MONTHLY_2025)
    })
  })

  describe('Exonération patronale SS (isExemptPatronalSS)', () => {
    const exemptResult = calculateCotisations(GROSS_1500, { isExemptPatronalSS: true })

    it('marque le résultat comme exonéré', () => {
      expect(exemptResult.isExemptPatronalSS).toBe(true)
    })

    it('met à zéro les cotisations SS patronales exonérées', () => {
      const ssLines = exemptResult.employerCotisations.filter((c) => c.exempted)
      expect(ssLines.length).toBeGreaterThan(0)
      ssLines.forEach((c) => expect(c.amount).toBe(0))
    })

    it('laisse AT/MP à son montant normal malgré l\'exonération', () => {
      const atmp = exemptResult.employerCotisations.find(
        (c) => c.label === 'AT/MP (taux moyen)'
      )!
      expect(atmp.amount).toBe(round2(GROSS_1500 * 0.005))
      expect(atmp.exempted).toBeUndefined()
    })

    it('laisse chômage non exonéré', () => {
      const chomage = exemptResult.employerCotisations.find(
        (c) => c.label === 'Assurance chômage'
      )!
      expect(chomage.amount).toBeGreaterThan(0)
    })

    it('réduit totalEmployerContributions par rapport au cas normal', () => {
      const normal = calculateCotisations(GROSS_1500)
      expect(exemptResult.totalEmployerContributions).toBeLessThan(
        normal.totalEmployerContributions
      )
    })
  })

  describe('Net imposable et net à payer', () => {
    it('netImposable = brut − cotisations déductibles (hors CSG-ND et CRDS)', () => {
      const result = calculateCotisations(GROSS_1500)
      // Net imposable doit être inférieur au brut mais supérieur au net à payer
      expect(result.netImposable).toBeLessThan(GROSS_1500)
      expect(result.netImposable).toBeGreaterThan(result.netAPayer)
    })

    it('netAPayer sans PAS = netImposable − CSG non déductible − CRDS', () => {
      const result = calculateCotisations(GROSS_1500)
      const csgND = result.employeeCotisations.find(
        (c) => c.label === 'CSG non déductible'
      )!.amount
      const crds = result.employeeCotisations.find(
        (c) => c.label === 'CRDS'
      )!.amount
      const expected = round2(result.netImposable - csgND - crds)
      expect(result.netAPayer).toBe(expected)
      expect(result.pasAmount).toBe(0)
    })

    it('PAS au taux 10% réduit le net à payer', () => {
      const withPAS = calculateCotisations(GROSS_1500, { pasRate: 0.1 })
      const without = calculateCotisations(GROSS_1500)
      expect(withPAS.netAPayer).toBeLessThan(without.netAPayer)
      expect(withPAS.pasAmount).toBe(round2(withPAS.netImposable * 0.1))
    })

    it('pasRate par défaut est 0', () => {
      const result = calculateCotisations(GROSS_1500)
      expect(result.pasRate).toBe(0)
      expect(result.pasAmount).toBe(0)
    })
  })

  describe('Cas limites', () => {
    it('grossPay = 0 → tous les montants à 0, netAPayer = 0', () => {
      const result = calculateCotisations(0)
      expect(result.grossPay).toBe(0)
      expect(result.totalEmployeeDeductions).toBe(0)
      expect(result.totalEmployerContributions).toBe(0)
      expect(result.netAPayer).toBe(0)
    })

    it('grossPay exactement au PASS → assiette plafonnée = PASS', () => {
      const result = calculateCotisations(PASS_MONTHLY_2025)
      const cappedLine = result.employeeCotisations.find(
        (c) => c.label === 'Vieillesse de base (plafonnée)'
      )!
      expect(cappedLine.base).toBe(PASS_MONTHLY_2025)
    })

    it('grossPay au-dessus du PASS → assiette plafonnée = PASS', () => {
      const result = calculateCotisations(PASS_MONTHLY_2025 + 1000)
      const cappedLine = result.employeeCotisations.find(
        (c) => c.label === 'Vieillesse de base (plafonnée)'
      )!
      expect(cappedLine.base).toBe(PASS_MONTHLY_2025)
    })

    it('isExemptPatronalSS false par défaut', () => {
      expect(calculateCotisations(GROSS_1500).isExemptPatronalSS).toBe(false)
    })
  })
})
