/**
 * Générateur de fichier PAJEMPLOI
 *
 * PAJEMPLOI est le service de l'URSSAF dédié aux particuliers employeurs
 * d'assistants maternels ou de gardes d'enfants à domicile.
 *
 * Note: Unilien étant orienté vers les auxiliaires de vie pour personnes
 * en situation de handicap, PAJEMPLOI est moins fréquemment utilisé que le CESU.
 * Ce module est fourni pour la complétude.
 */

import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MonthlyDeclarationData, ExportResult } from './types'

/**
 * Génère un fichier CSV pour la déclaration PAJEMPLOI
 */
export function generatePajemploiCsv(data: MonthlyDeclarationData): ExportResult {
  try {
    const lines: string[] = []

    // En-tête
    lines.push('# DÉCLARATION PAJEMPLOI - RÉCAPITULATIF MENSUEL')
    lines.push(`# Période: ${data.periodLabel}`)
    lines.push(`# Généré le: ${format(data.generatedAt, 'dd/MM/yyyy à HH:mm', { locale: fr })}`)
    lines.push('')

    // Informations employeur
    lines.push('# EMPLOYEUR')
    lines.push(`Nom;${data.employerLastName}`)
    lines.push(`Prénom;${data.employerFirstName}`)
    lines.push(`Adresse;${data.employerAddress}`)
    lines.push('')

    // Format PAJEMPLOI - colonnes spécifiques
    lines.push('# DÉCLARATIONS')
    lines.push([
      'Nom salarié',
      'Prénom salarié',
      'Date début période',
      'Date fin période',
      'Nombre heures',
      'Salaire net',
      'Indemnités entretien',
      'Indemnités repas',
      'Salaire brut',
    ].join(';'))

    // Dates de période
    const startDate = new Date(data.year, data.month - 1, 1)
    const endDate = new Date(data.year, data.month, 0)
    const dateDebut = format(startDate, 'dd/MM/yyyy')
    const dateFin = format(endDate, 'dd/MM/yyyy')

    // Données employés
    for (const employee of data.employees) {
      // Estimation du salaire net (environ 78% du brut pour les particuliers employeurs)
      const estimatedNet = employee.totalGrossPay * 0.78

      lines.push([
        employee.lastName,
        employee.firstName,
        dateDebut,
        dateFin,
        formatNumber(employee.totalHours),
        formatCurrency(estimatedNet),
        '0,00 €', // Indemnités entretien (à renseigner si applicable)
        '0,00 €', // Indemnités repas (à renseigner si applicable)
        formatCurrency(employee.totalGrossPay),
      ].join(';'))
    }

    lines.push('')

    // Notes
    lines.push('# NOTES')
    lines.push('# - Les indemnités d\'entretien et de repas sont à 0 par défaut')
    lines.push('# - Veuillez les ajuster selon votre situation avant de déclarer')
    lines.push('# - Le salaire net est une estimation (78% du brut)')

    const content = lines.join('\n')
    const filename = `pajemploi_${data.year}_${String(data.month).padStart(2, '0')}.csv`

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
 * Génère un récapitulatif texte pour PAJEMPLOI
 */
export function generatePajemploiSummary(data: MonthlyDeclarationData): ExportResult {
  try {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════')
    lines.push(`   RÉCAPITULATIF PAJEMPLOI - ${data.periodLabel.toUpperCase()}`)
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('')

    // Employeur
    lines.push('EMPLOYEUR')
    lines.push('─────────')
    lines.push(`${data.employerFirstName} ${data.employerLastName}`)
    lines.push(data.employerAddress)
    lines.push('')

    // Pour chaque employé
    for (const employee of data.employees) {
      lines.push('───────────────────────────────────────────────────────')
      lines.push(`SALARIÉ: ${employee.firstName} ${employee.lastName}`)
      lines.push('───────────────────────────────────────────────────────')
      lines.push('')

      // Informations à reporter sur Pajemploi
      lines.push('À DÉCLARER SUR PAJEMPLOI.URSSAF.FR:')
      lines.push('')
      lines.push(`  Nombre d'heures d'accueil:  ${formatNumber(employee.totalHours)} h`)
      lines.push(`  Salaire net:                ${formatCurrency(employee.totalGrossPay * 0.78)}`)
      lines.push(`  Indemnités d'entretien:     À compléter`)
      lines.push(`  Indemnités de repas:        À compléter`)
      lines.push('')

      // Détail
      lines.push('DÉTAIL:')
      lines.push(`  • Taux horaire brut: ${formatCurrency(employee.hourlyRate)}`)
      lines.push(`  • Nombre d'interventions: ${employee.shiftsCount}`)
      lines.push(`  • Total brut: ${formatCurrency(employee.totalGrossPay)}`)
      lines.push('')
    }

    // Total
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('                    TOTAL GÉNÉRAL')
    lines.push('═══════════════════════════════════════════════════════')
    lines.push(`  Nombre de salariés:    ${data.totalEmployees}`)
    lines.push(`  Total heures:          ${formatNumber(data.totalHours)} h`)
    lines.push(`  Total salaires bruts:  ${formatCurrency(data.totalGrossPay)}`)
    lines.push('═══════════════════════════════════════════════════════')
    lines.push('')
    lines.push('Note: PAJEMPLOI est principalement utilisé pour les assistants')
    lines.push('maternels et gardes d\'enfants. Pour les auxiliaires de vie,')
    lines.push('le CESU est généralement plus approprié.')

    const content = lines.join('\n')
    const filename = `pajemploi_recap_${data.year}_${String(data.month).padStart(2, '0')}.txt`

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
