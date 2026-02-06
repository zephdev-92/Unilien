/**
 * Générateur de fichier CESU
 *
 * Le CESU (Chèque Emploi Service Universel) est un dispositif permettant
 * de déclarer simplement les heures de travail d'un employé à domicile.
 *
 * Ce générateur crée un fichier CSV compatible avec la saisie sur le site CESU.
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { MAJORATION_RATES } from '@/lib/compliance/calculatePay'
import type { MonthlyDeclarationData, ExportResult } from './types'

/**
 * Génère un fichier CSV pour la déclaration CESU
 */
export function generateCesuCsv(data: MonthlyDeclarationData): ExportResult {
  try {
    const lines: string[] = []

    // En-tête du fichier
    lines.push('# DÉCLARATION CESU - RÉCAPITULATIF MENSUEL')
    lines.push(`# Période: ${data.periodLabel}`)
    lines.push(`# Généré le: ${format(data.generatedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`)
    lines.push('')

    // Informations employeur
    lines.push('# EMPLOYEUR')
    lines.push(`Nom;${data.employerLastName}`)
    lines.push(`Prénom;${data.employerFirstName}`)
    lines.push(`Adresse;${data.employerAddress}`)
    if (data.cesuNumber) {
      lines.push(`N° CESU;${data.cesuNumber}`)
    }
    lines.push('')

    // En-têtes colonnes employés
    lines.push('# DÉCLARATIONS PAR EMPLOYÉ')
    lines.push([
      'Nom',
      'Prénom',
      'Type contrat',
      'Heures totales',
      'Heures normales',
      'Heures dimanche',
      'Heures fériés',
      'Heures nuit',
      'Taux horaire',
      'Salaire brut',
      'Majorations',
      'Total brut',
    ].join(';'))

    // Données employés
    for (const employee of data.employees) {
      const majorations = employee.sundayMajoration + employee.holidayMajoration +
                          employee.nightMajoration + employee.overtimeMajoration

      lines.push([
        employee.lastName,
        employee.firstName,
        employee.contractType,
        formatNumber(employee.totalHours),
        formatNumber(employee.normalHours),
        formatNumber(employee.sundayHours),
        formatNumber(employee.holidayHours),
        formatNumber(employee.nightHours),
        formatCurrency(employee.hourlyRate),
        formatCurrency(employee.basePay),
        formatCurrency(majorations),
        formatCurrency(employee.totalGrossPay),
      ].join(';'))
    }

    lines.push('')

    // Totaux
    lines.push('# TOTAUX')
    lines.push(`Nombre d'employés;${data.totalEmployees}`)
    lines.push(`Total heures;${formatNumber(data.totalHours)}`)
    lines.push(`Total brut;${formatCurrency(data.totalGrossPay)}`)
    lines.push('')

    // Détail par employé
    lines.push('# DÉTAIL DES INTERVENTIONS')
    for (const employee of data.employees) {
      lines.push('')
      lines.push(`## ${employee.lastName} ${employee.firstName}`)
      lines.push([
        'Date',
        'Début',
        'Fin',
        'Pause (min)',
        'Heures effectives',
        'Dimanche',
        'Férié',
        'Heures nuit',
        'Montant',
      ].join(';'))

      for (const shift of employee.shiftsDetails) {
        lines.push([
          format(shift.date, 'dd/MM/yyyy'),
          shift.startTime,
          shift.endTime,
          shift.breakDuration.toString(),
          formatNumber(shift.effectiveHours),
          shift.isSunday ? 'Oui' : 'Non',
          shift.isHoliday ? 'Oui' : 'Non',
          formatNumber(shift.nightHours),
          formatCurrency(shift.pay),
        ].join(';'))
      }
    }

    const content = lines.join('\n')
    const filename = `cesu_${data.year}_${String(data.month).padStart(2, '0')}.csv`

    return {
      success: true,
      filename,
      content,
      mimeType: 'text/csv;charset=utf-8',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur lors de la génération',
    }
  }
}

/**
 * Génère un récapitulatif texte pour la déclaration CESU
 * (Pour copier-coller dans le formulaire en ligne)
 */
export function generateCesuSummary(data: MonthlyDeclarationData): ExportResult {
  try {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════')
    lines.push(`     RÉCAPITULATIF CESU - ${data.periodLabel.toUpperCase()}`)
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('')

    // Employeur
    lines.push('EMPLOYEUR')
    lines.push('─────────')
    lines.push(`${data.employerFirstName} ${data.employerLastName}`)
    lines.push(data.employerAddress)
    if (data.cesuNumber) {
      lines.push(`N° CESU: ${data.cesuNumber}`)
    }
    lines.push('')

    // Pour chaque employé
    for (const employee of data.employees) {
      lines.push('───────────────────────────────────────────────────────')
      lines.push(`EMPLOYÉ: ${employee.firstName} ${employee.lastName}`)
      lines.push('───────────────────────────────────────────────────────')
      lines.push('')

      // Heures à déclarer
      lines.push('HEURES À DÉCLARER SUR CESU.URSSAF.FR:')
      lines.push(`  • Nombre d'heures: ${formatNumber(employee.totalHours)} h`)
      lines.push(`  • Salaire net à payer: ${formatCurrency(employee.totalGrossPay * 0.78)}`) // Estimation net
      lines.push('')

      // Détail des heures
      lines.push('DÉTAIL DES HEURES:')
      lines.push(`  • Heures normales:     ${formatNumber(employee.normalHours)} h`)
      if (employee.sundayHours > 0) {
        lines.push(`  • Heures dimanche:     ${formatNumber(employee.sundayHours)} h (+${MAJORATION_RATES.SUNDAY * 100}%)`)
      }
      if (employee.holidayHours > 0) {
        lines.push(`  • Heures jours fériés: ${formatNumber(employee.holidayHours)} h (+${MAJORATION_RATES.PUBLIC_HOLIDAY_WORKED * 100}%)`)
      }
      if (employee.nightHours > 0) {
        lines.push(`  • Heures de nuit:      ${formatNumber(employee.nightHours)} h (+${MAJORATION_RATES.NIGHT * 100}%)`)
      }
      if (employee.overtimeHours > 0) {
        lines.push(`  • Heures sup:          ${formatNumber(employee.overtimeHours)} h (+${MAJORATION_RATES.OVERTIME_FIRST_8H * 100}%/+${MAJORATION_RATES.OVERTIME_BEYOND_8H * 100}%)`)
      }
      lines.push('')

      // Rémunération
      lines.push('RÉMUNÉRATION:')
      lines.push(`  • Salaire de base:     ${formatCurrency(employee.basePay)}`)
      const totalMaj = employee.sundayMajoration + employee.holidayMajoration +
                       employee.nightMajoration + employee.overtimeMajoration
      if (totalMaj > 0) {
        lines.push(`  • Majorations:         ${formatCurrency(totalMaj)}`)
        if (employee.sundayMajoration > 0) {
          lines.push(`      - Dimanche:        ${formatCurrency(employee.sundayMajoration)}`)
        }
        if (employee.holidayMajoration > 0) {
          lines.push(`      - Jours fériés:    ${formatCurrency(employee.holidayMajoration)}`)
        }
        if (employee.nightMajoration > 0) {
          lines.push(`      - Heures de nuit:  ${formatCurrency(employee.nightMajoration)}`)
        }
      }
      lines.push(`  ──────────────────────────`)
      lines.push(`  • TOTAL BRUT:          ${formatCurrency(employee.totalGrossPay)}`)
      lines.push('')

      // Interventions
      lines.push(`INTERVENTIONS (${employee.shiftsCount}):`)
      for (const shift of employee.shiftsDetails) {
        const dayName = format(shift.date, 'EEEE', { locale: fr })
        const flags = []
        if (shift.isSunday) flags.push('DIM')
        if (shift.isHoliday) flags.push('FÉR')
        if (shift.nightHours > 0) flags.push('NUIT')
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : ''

        lines.push(`  ${format(shift.date, 'dd/MM')} (${dayName.slice(0, 3)}): ${shift.startTime}-${shift.endTime} = ${formatNumber(shift.effectiveHours)}h${flagStr}`)
      }
      lines.push('')
    }

    // Total général
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('                    TOTAL GÉNÉRAL')
    lines.push('═══════════════════════════════════════════════════════')
    lines.push(`  Nombre d'employés:     ${data.totalEmployees}`)
    lines.push(`  Total heures:          ${formatNumber(data.totalHours)} h`)
    lines.push(`  Total salaires bruts:  ${formatCurrency(data.totalGrossPay)}`)
    lines.push('═══════════════════════════════════════════════════════')

    const content = lines.join('\n')
    const filename = `cesu_recap_${data.year}_${String(data.month).padStart(2, '0')}.txt`

    return {
      success: true,
      filename,
      content,
      mimeType: 'text/plain;charset=utf-8',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur lors de la génération',
    }
  }
}

// Utilitaires de formatage
function formatNumber(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function formatCurrency(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €'
}
