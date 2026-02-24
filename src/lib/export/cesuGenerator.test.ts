import { describe, it, expect } from 'vitest'
import { generateCesuCsv, generateCesuSummary } from './cesuGenerator'
import type { MonthlyDeclarationData } from './types'

// ── Fixtures ───────────────────────────────────────────────────────────────────

function makeShiftDetail(overrides: Partial<MonthlyDeclarationData['employees'][0]['shiftsDetails'][0]> = {}) {
  return {
    date: new Date('2026-02-01'),
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    effectiveHours: 7,
    isSunday: false,
    isHoliday: false,
    nightHours: 0,
    pay: 87.5,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<MonthlyDeclarationData['employees'][0]> = {}) {
  return {
    employeeId: 'emp-1',
    firstName: 'Sophie',
    lastName: 'Martin',
    contractId: 'contract-1',
    contractType: 'CDI' as const,
    hourlyRate: 12.5,
    totalHours: 80,
    normalHours: 72,
    sundayHours: 8,
    holidayHours: 0,
    nightHours: 4,
    overtimeHours: 0,
    basePay: 900,
    sundayMajoration: 30,
    holidayMajoration: 0,
    nightMajoration: 10,
    overtimeMajoration: 0,
    totalGrossPay: 940,
    shiftsCount: 1,
    shiftsDetails: [makeShiftDetail()],
    ...overrides,
  }
}

const baseData: MonthlyDeclarationData = {
  year: 2026,
  month: 2,
  periodLabel: 'Février 2026',
  employerId: 'employer-1',
  employerFirstName: 'Marie',
  employerLastName: 'Dupont',
  employerAddress: '1 rue de Test, Paris 75001',
  cesuNumber: 'CESU-12345',
  employees: [makeEmployee()],
  totalHours: 80,
  totalGrossPay: 940,
  totalEmployees: 1,
  generatedAt: new Date('2026-02-20T10:00:00'),
}

const dataNoCesu: MonthlyDeclarationData = {
  ...baseData,
  cesuNumber: undefined,
}

const dataMultiEmployees: MonthlyDeclarationData = {
  ...baseData,
  employees: [
    makeEmployee({ employeeId: 'emp-1', firstName: 'Sophie', lastName: 'Martin', totalGrossPay: 940 }),
    makeEmployee({
      employeeId: 'emp-2',
      firstName: 'Luc',
      lastName: 'Bernard',
      totalGrossPay: 600,
      shiftsDetails: [makeShiftDetail({ date: new Date('2026-02-05'), isSunday: true })],
    }),
  ],
  totalHours: 160,
  totalGrossPay: 1540,
  totalEmployees: 2,
}

// ── generateCesuCsv ────────────────────────────────────────────────────────────

describe('generateCesuCsv', () => {
  describe('Résultat succès', () => {
    it('retourne success=true', () => {
      expect(generateCesuCsv(baseData).success).toBe(true)
    })

    it('retourne un nom de fichier CSV pour le mois', () => {
      const { filename } = generateCesuCsv(baseData)
      expect(filename).toBe('cesu_2026_02.csv')
    })

    it('retourne le bon mimeType CSV', () => {
      expect(generateCesuCsv(baseData).mimeType).toBe('text/csv;charset=utf-8')
    })
  })

  describe('En-tête du fichier', () => {
    it('contient la mention "DÉCLARATION CESU"', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('DÉCLARATION CESU')
    })

    it('contient la période (Février 2026)', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('Février 2026')
    })

    it('contient le nom et prénom de l\'employeur', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('Dupont')
      expect(content).toContain('Marie')
    })

    it('contient l\'adresse de l\'employeur', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('1 rue de Test, Paris 75001')
    })

    it('contient le numéro CESU si fourni', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('CESU-12345')
    })

    it('n\'inclut pas la ligne N° CESU si absent', () => {
      const { content } = generateCesuCsv(dataNoCesu)
      expect(content).not.toContain('N° CESU')
    })
  })

  describe('Données des employés (CSV)', () => {
    it('contient le nom de l\'employé', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('Martin')
      expect(content).toContain('Sophie')
    })

    it('contient le type de contrat', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('CDI')
    })

    it('contient les colonnes d\'en-tête CSV', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('Heures totales')
      expect(content).toContain('Taux horaire')
      expect(content).toContain('Total brut')
    })
  })

  describe('Section totaux', () => {
    it('affiche le nombre d\'employés', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain("Nombre d'employés;1")
    })

    it('affiche le total heures', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('Total heures')
    })
  })

  describe('Détail des interventions', () => {
    it('affiche la section détail', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('DÉTAIL DES INTERVENTIONS')
    })

    it('contient la date formatée de l\'intervention (01/02/2026)', () => {
      const { content } = generateCesuCsv(baseData)
      expect(content).toContain('01/02/2026')
    })

    it('marque "Oui" pour un dimanche', () => {
      const sundayData = {
        ...baseData,
        employees: [makeEmployee({ shiftsDetails: [makeShiftDetail({ isSunday: true })] })],
      }
      const { content } = generateCesuCsv(sundayData)
      expect(content).toContain('Oui')
    })

    it('marque "Non" pour un jour normal', () => {
      const { content } = generateCesuCsv(baseData)
      // isSunday=false → "Non"
      expect(content).toContain('Non')
    })
  })

  describe('Plusieurs employés', () => {
    it('inclut les noms des deux employés', () => {
      const { content } = generateCesuCsv(dataMultiEmployees)
      expect(content).toContain('Martin')
      expect(content).toContain('Bernard')
    })

    it('affiche le bon nombre total d\'employés', () => {
      const { content } = generateCesuCsv(dataMultiEmployees)
      expect(content).toContain("Nombre d'employés;2")
    })
  })
})

// ── generateCesuSummary ────────────────────────────────────────────────────────

describe('generateCesuSummary', () => {
  describe('Résultat succès', () => {
    it('retourne success=true', () => {
      expect(generateCesuSummary(baseData).success).toBe(true)
    })

    it('retourne un nom de fichier .txt pour le mois', () => {
      const { filename } = generateCesuSummary(baseData)
      expect(filename).toBe('cesu_recap_2026_02.txt')
    })

    it('retourne le mimeType text/plain', () => {
      expect(generateCesuSummary(baseData).mimeType).toBe('text/plain;charset=utf-8')
    })
  })

  describe('Contenu du récapitulatif', () => {
    it('contient "RÉCAPITULATIF CESU"', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('RÉCAPITULATIF CESU')
    })

    it('contient la période en majuscules', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('FÉVRIER 2026')
    })

    it('contient les informations employeur', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('Marie Dupont')
      expect(content).toContain('1 rue de Test, Paris 75001')
    })

    it('affiche N° CESU si fourni', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('N° CESU: CESU-12345')
    })

    it('n\'affiche pas N° CESU si absent', () => {
      const { content } = generateCesuSummary(dataNoCesu)
      expect(content).not.toContain('N° CESU')
    })

    it('contient le nom de l\'employé', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('EMPLOYÉ: Sophie Martin')
    })

    it('affiche "HEURES À DÉCLARER"', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('HEURES À DÉCLARER')
    })

    it('affiche les heures dimanche si > 0', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('Heures dimanche')
    })

    it('affiche les heures de nuit si > 0', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('Heures de nuit')
    })

    it('n\'affiche pas les heures jours fériés si = 0', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).not.toContain('Heures jours fériés')
    })

    it('affiche le salaire de base', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('Salaire de base')
    })

    it('affiche les majorations dimanche', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('Dimanche')
    })

    it('affiche "TOTAL GÉNÉRAL"', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('TOTAL GÉNÉRAL')
    })

    it('affiche le nombre d\'employés dans le total', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain("Nombre d'employés")
    })
  })

  describe('Formatage des interventions', () => {
    it('affiche la date au format dd/MM', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('01/02')
    })

    it('affiche les horaires de l\'intervention', () => {
      const { content } = generateCesuSummary(baseData)
      expect(content).toContain('09:00-17:00')
    })

    it('affiche le flag [DIM] pour un dimanche', () => {
      const sundayData = {
        ...baseData,
        employees: [makeEmployee({ shiftsDetails: [makeShiftDetail({ date: new Date('2026-02-01'), isSunday: true })] })],
      }
      const { content } = generateCesuSummary(sundayData)
      expect(content).toContain('[DIM]')
    })

    it('affiche le flag [FÉR] pour un jour férié', () => {
      const holidayData = {
        ...baseData,
        employees: [makeEmployee({ shiftsDetails: [makeShiftDetail({ isHoliday: true })] })],
      }
      const { content } = generateCesuSummary(holidayData)
      expect(content).toContain('[FÉR]')
    })

    it('affiche le flag [NUIT] pour des heures de nuit', () => {
      const nightData = {
        ...baseData,
        employees: [makeEmployee({ shiftsDetails: [makeShiftDetail({ nightHours: 2 })] })],
      }
      const { content } = generateCesuSummary(nightData)
      expect(content).toContain('[NUIT]')
    })

    it('n\'affiche pas de flag si aucune condition spéciale', () => {
      const { content } = generateCesuSummary(baseData)
      // Pas de [DIM], [FÉR], [NUIT] pour un shift normal sans ces conditions
      expect(content).not.toContain('[DIM]')
      expect(content).not.toContain('[FÉR]')
      expect(content).not.toContain('[NUIT]')
    })
  })
})
