/**
 * Calcul des cotisations sociales IDCC 3239 – salariat direct
 * Barèmes 2025 (PASS mensuel = 3 925 €, SMIC mensuel brut = 1 801,80 €)
 *
 * Ces taux sont indicatifs. Consulter un expert-comptable ou l'URSSAF pour
 * les taux en vigueur et les éventuelles exonérations applicables.
 */

import type { CotisationLine, CotisationsResult } from './types'

// ─── Constantes 2025 ─────────────────────────────────────────────────────────
/** Plafond Annuel Sécurité Sociale mensuel 2025 */
export const PASS_MONTHLY_2025 = 3_925
/** SMIC mensuel brut 2025 (35h/sem) */
export const SMIC_MONTHLY_2025 = 1_801.80

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Calcule toutes les cotisations salariales et patronales.
 * @param grossPay  Salaire brut total du mois (en euros)
 * @param options   pasRate : taux PAS de 0 à 1 (défaut 0)
 *                  isExemptPatronalSS : exonération cotisations patronales SS
 *                  (employeur invalide ≥80%, ≥60 ans avec tierce personne, MTP, PCTP)
 *                  Depuis le 01/10/2006, sans limitation de durée.
 *                  Restent dues : AGIRC-ARRCO, chômage, FNAL, CSA, AT/MP.
 */
export function calculateCotisations(
  grossPay: number,
  options: { pasRate?: number; isExemptPatronalSS?: boolean } = {}
): CotisationsResult {
  const { pasRate = 0, isExemptPatronalSS = false } = options
  const pass = PASS_MONTHLY_2025
  const smic = SMIC_MONTHLY_2025

  // Assiette CSG/CRDS = 98.25% du brut
  const csgBase = round2(grossPay * 0.9825)
  // Assiette plafonnée SS = min(brut, PASS mensuel)
  const cappedBase = Math.min(grossPay, pass)

  // ── Cotisations salariales ──────────────────────────────────────────────
  const employeeCotisations: CotisationLine[] = [
    {
      label: 'CSG déductible',
      base: csgBase,
      rate: 0.068,
      amount: round2(csgBase * 0.068),
      isEmployer: false,
    },
    {
      label: 'CSG non déductible',
      base: csgBase,
      rate: 0.024,
      amount: round2(csgBase * 0.024),
      isEmployer: false,
    },
    {
      label: 'CRDS',
      base: csgBase,
      rate: 0.005,
      amount: round2(csgBase * 0.005),
      isEmployer: false,
    },
    {
      label: 'Vieillesse de base (plafonnée)',
      base: cappedBase,
      rate: 0.069,
      amount: round2(cappedBase * 0.069),
      isEmployer: false,
    },
    {
      label: 'Retraite complémentaire AGIRC-ARRCO T1',
      base: cappedBase,
      rate: 0.0315,
      amount: round2(cappedBase * 0.0315),
      isEmployer: false,
    },
  ]

  // ── Cotisations patronales ──────────────────────────────────────────────
  // Maladie : taux réduit si brut ≤ 2.5 × SMIC mensuel
  const maladieRate = grossPay <= 2.5 * smic ? 0.07 : 0.13
  // Allocations familiales : taux réduit si brut ≤ 3.5 × SMIC mensuel
  const allocFamRate = grossPay <= 3.5 * smic ? 0.0345 : 0.0525

  // Cotisations de Sécurité Sociale patronales — exonérées si isExemptPatronalSS
  // (Art. L241-10 CSS — employeur invalide ≥80%, ≥60 ans / tierce personne, MTP, PCTP)
  const exo = isExemptPatronalSS

  const employerCotisations: CotisationLine[] = [
    {
      label: 'Maladie / Maternité / Invalidité / Décès',
      base: grossPay,
      rate: maladieRate,
      amount: exo ? 0 : round2(grossPay * maladieRate),
      isEmployer: true,
      exempted: exo,
    },
    {
      label: 'Vieillesse de base (plafonnée)',
      base: cappedBase,
      rate: 0.0855,
      amount: exo ? 0 : round2(cappedBase * 0.0855),
      isEmployer: true,
      exempted: exo,
    },
    {
      label: 'Vieillesse de base (déplafonnée)',
      base: grossPay,
      rate: 0.019,
      amount: exo ? 0 : round2(grossPay * 0.019),
      isEmployer: true,
      exempted: exo,
    },
    {
      label: 'Allocations familiales',
      base: grossPay,
      rate: allocFamRate,
      amount: exo ? 0 : round2(grossPay * allocFamRate),
      isEmployer: true,
      exempted: exo,
    },
    // Les cotisations ci-dessous restent dues même en cas d'exonération SS
    {
      label: 'AT/MP (taux moyen)',
      base: grossPay,
      rate: 0.005,
      amount: round2(grossPay * 0.005),
      isEmployer: true,
    },
    {
      label: 'Assurance chômage',
      base: grossPay,
      rate: 0.0405,
      amount: round2(grossPay * 0.0405),
      isEmployer: true,
    },
    {
      label: 'FNAL',
      base: grossPay,
      rate: 0.001,
      amount: round2(grossPay * 0.001),
      isEmployer: true,
    },
    {
      label: 'CSA (Contribution solidarité autonomie)',
      base: grossPay,
      rate: 0.003,
      amount: round2(grossPay * 0.003),
      isEmployer: true,
    },
    {
      label: 'Retraite complémentaire AGIRC-ARRCO T1',
      base: cappedBase,
      rate: 0.0472,
      amount: round2(cappedBase * 0.0472),
      isEmployer: true,
    },
  ]

  const totalEmployeeDeductions = round2(
    employeeCotisations.reduce((s, c) => s + c.amount, 0)
  )
  const totalEmployerContributions = round2(
    employerCotisations.reduce((s, c) => s + c.amount, 0)
  )

  // Net imposable = brut - cotisations déductibles (hors CSG non déductible et CRDS)
  // CSG déductible (6.80%), vieillesse (6.90%), AGIRC-ARRCO T1 (3.15%) sont déductibles
  // CSG non déductible (2.40%) et CRDS (0.50%) restent dans l'assiette fiscale
  const csgNonDeduc = employeeCotisations.find(c => c.label === 'CSG non déductible')!.amount
  const crds = employeeCotisations.find(c => c.label === 'CRDS')!.amount
  const deductiblePart = round2(totalEmployeeDeductions - csgNonDeduc - crds)
  const netImposable = round2(grossPay - deductiblePart)

  // PAS appliqué sur le net imposable
  const pasAmount = round2(netImposable * pasRate)

  // Net à payer = net imposable - CSG non déductible - CRDS - PAS
  const netAPayer = round2(netImposable - csgNonDeduc - crds - pasAmount)

  return {
    passMonthly: pass,
    smicMonthly: smic,
    grossPay: round2(grossPay),
    employeeCotisations,
    totalEmployeeDeductions,
    employerCotisations,
    totalEmployerContributions,
    netImposable,
    pasAmount,
    netAPayer,
    pasRate,
    isExemptPatronalSS,
  }
}
