/**
 * Tarifs PCH (Prestation de Compensation du Handicap)
 * Référence : Art. L245-12 CASF — tarifs en vigueur au 01/01/2026
 * Indexés sur IDCC 3239 + SMIC
 */

export type PchType =
  | 'emploiDirect'
  | 'mandataire'
  | 'prestataire'
  | 'aidantFamilial'
  | 'aidantFamilialCessation'

/** Tarifs horaires PCH Élément 1 au 01/01/2026 (€/h) */
export const PCH_TARIFFS_2026: Record<PchType, number> = {
  emploiDirect:            19.34,
  mandataire:              21.27,
  prestataire:             25.00,
  aidantFamilial:           4.78,
  aidantFamilialCessation:  7.16,
}

/** Labels affichés dans l'interface */
export const PCH_TYPE_LABELS: Record<PchType, string> = {
  emploiDirect:            'Emploi direct — 19,34 €/h',
  mandataire:              'Mandataire — 21,27 €/h',
  prestataire:             'Prestataire — 25,00 €/h',
  aidantFamilial:          'Aidant familial — 4,78 €/h',
  aidantFamilialCessation: 'Aidant familial (cessation activité) — 7,16 €/h',
}

/** Retourne le tarif horaire PCH pour un type donné */
export function getPchElementRate(pchType: PchType): number {
  return PCH_TARIFFS_2026[pchType]
}

/** Calcule l'enveloppe PCH mensuelle (€) */
export function calcEnveloppePch(pchMonthlyHours: number, pchType: PchType): number {
  return pchMonthlyHours * getPchElementRate(pchType)
}
