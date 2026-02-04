/**
 * Générateur de PDF pour les déclarations CESU
 *
 * Génère un document PDF professionnel avec le récapitulatif mensuel
 * des heures travaillées et des salaires pour la déclaration CESU.
 */

import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { MonthlyDeclarationData, ExportResult } from './types'

// Couleurs UniLien
const COLORS = {
  primary: [79, 70, 229] as [number, number, number], // Indigo-600
  primaryLight: [238, 242, 255] as [number, number, number], // Indigo-50
  gray: [107, 114, 128] as [number, number, number], // Gray-500
  grayLight: [249, 250, 251] as [number, number, number], // Gray-50
  black: [17, 24, 39] as [number, number, number], // Gray-900
  white: [255, 255, 255] as [number, number, number],
}

// Configuration PDF
const PAGE_WIDTH = 210 // A4
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

/**
 * Génère un fichier PDF pour la déclaration CESU
 */
export function generateCesuPdf(data: MonthlyDeclarationData): ExportResult {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // En-tête avec titre
    let y = drawHeader(doc, data)

    // Informations employeur
    y = drawEmployerSection(doc, data, y)

    // Récapitulatif par employé
    y = drawEmployeesSection(doc, data, y)

    // Total général
    drawTotalSection(doc, data, y)

    // Pied de page
    drawFooter(doc)

    // Générer le PDF en base64
    const pdfBase64 = doc.output('datauristring')
    const filename = `cesu_${data.year}_${String(data.month).padStart(2, '0')}.pdf`

    return {
      success: true,
      filename,
      content: pdfBase64,
      mimeType: 'application/pdf',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur lors de la génération du PDF',
    }
  }
}

/**
 * Dessine l'en-tête du document
 */
function drawHeader(doc: jsPDF, data: MonthlyDeclarationData): number {
  // Bandeau coloré
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, PAGE_WIDTH, 35, 'F')

  // Titre principal
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('RÉCAPITULATIF CESU', PAGE_WIDTH / 2, 15, { align: 'center' })

  // Période
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(data.periodLabel.toUpperCase(), PAGE_WIDTH / 2, 25, { align: 'center' })

  // Date de génération
  doc.setTextColor(...COLORS.black)
  doc.setFontSize(9)
  doc.text(
    `Généré le ${format(data.generatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    PAGE_WIDTH - MARGIN,
    45,
    { align: 'right' }
  )

  // Retourne la position Y suivante, le paramètre y n'est pas utilisé car l'en-tête a une hauteur fixe
  return 55
}

/**
 * Dessine la section employeur
 */
function drawEmployerSection(doc: jsPDF, data: MonthlyDeclarationData, y: number): number {
  // Titre de section
  doc.setFillColor(...COLORS.grayLight)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, 'F')
  doc.setTextColor(...COLORS.black)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEUR', MARGIN + 4, y + 5.5)

  y += 14

  // Informations employeur
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...COLORS.black)
  doc.text(`${data.employerFirstName} ${data.employerLastName}`, MARGIN, y)
  y += 5
  doc.setTextColor(...COLORS.gray)
  doc.text(data.employerAddress, MARGIN, y)
  y += 5

  if (data.cesuNumber) {
    doc.setTextColor(...COLORS.primary)
    doc.setFont('helvetica', 'bold')
    doc.text(`N° CESU: ${data.cesuNumber}`, MARGIN, y)
    y += 5
  }

  return y + 8
}

/**
 * Dessine la section des employés
 */
function drawEmployeesSection(doc: jsPDF, data: MonthlyDeclarationData, y: number): number {
  // Titre de section
  doc.setFillColor(...COLORS.grayLight)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, 'F')
  doc.setTextColor(...COLORS.black)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`EMPLOYÉS (${data.totalEmployees})`, MARGIN + 4, y + 5.5)

  y += 14

  for (const employee of data.employees) {
    // Vérifier s'il faut une nouvelle page
    if (y > PAGE_HEIGHT - 80) {
      doc.addPage()
      y = MARGIN
    }

    y = drawEmployeeCard(doc, employee, y)
  }

  return y
}

/**
 * Dessine une carte employé
 */
function drawEmployeeCard(
  doc: jsPDF,
  employee: MonthlyDeclarationData['employees'][0],
  y: number
): number {
  const cardHeight = 45
  const cardPadding = 4

  // Fond de carte
  doc.setFillColor(...COLORS.white)
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardHeight, 3, 3, 'FD')

  // Nom et badge contrat
  doc.setTextColor(...COLORS.black)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(`${employee.firstName} ${employee.lastName}`, MARGIN + cardPadding, y + 7)

  // Badge type contrat
  const badgeX = MARGIN + CONTENT_WIDTH - 20
  doc.setFillColor(...COLORS.primaryLight)
  doc.roundedRect(badgeX, y + 3, 16, 6, 2, 2, 'F')
  doc.setTextColor(...COLORS.primary)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(employee.contractType, badgeX + 8, y + 7, { align: 'center' })

  // Ligne 1: Heures et interventions
  const col1X = MARGIN + cardPadding
  const col2X = MARGIN + CONTENT_WIDTH / 2
  let lineY = y + 16

  doc.setTextColor(...COLORS.gray)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Heures totales:', col1X, lineY)
  doc.text('Interventions:', col2X, lineY)

  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text(`${formatNumber(employee.totalHours)} h`, col1X + 35, lineY)
  doc.text(`${employee.shiftsCount}`, col2X + 30, lineY)

  // Ligne 2: Salaires
  lineY += 7
  doc.setTextColor(...COLORS.gray)
  doc.setFont('helvetica', 'normal')
  doc.text('Salaire de base:', col1X, lineY)
  doc.text('Majorations:', col2X, lineY)

  const totalMajorations =
    employee.sundayMajoration +
    employee.holidayMajoration +
    employee.nightMajoration +
    employee.overtimeMajoration

  doc.setTextColor(...COLORS.black)
  doc.setFont('helvetica', 'bold')
  doc.text(`${formatCurrency(employee.basePay)}`, col1X + 35, lineY)
  doc.text(`${formatCurrency(totalMajorations)}`, col2X + 30, lineY)

  // Ligne 3: Total brut (mis en avant)
  lineY += 10
  doc.setFillColor(...COLORS.primaryLight)
  doc.roundedRect(col1X - 2, lineY - 4, CONTENT_WIDTH - cardPadding * 2 + 4, 8, 2, 2, 'F')

  doc.setTextColor(...COLORS.primary)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL BRUT:', col1X, lineY)
  doc.text(`${formatCurrency(employee.totalGrossPay)}`, MARGIN + CONTENT_WIDTH - cardPadding, lineY, {
    align: 'right',
  })

  return y + cardHeight + 6
}

/**
 * Dessine la section total général
 */
function drawTotalSection(doc: jsPDF, data: MonthlyDeclarationData, y: number): number {
  // Vérifier s'il faut une nouvelle page
  if (y > PAGE_HEIGHT - 50) {
    doc.addPage()
    y = MARGIN
  }

  const boxHeight = 25

  // Fond coloré
  doc.setFillColor(...COLORS.primary)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, boxHeight, 3, 3, 'F')

  // Titre
  doc.setTextColor(...COLORS.white)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL GÉNÉRAL', MARGIN + 8, y + 10)

  // Sous-titre
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`${formatNumber(data.totalHours)} heures travaillées`, MARGIN + 8, y + 18)

  // Montant total
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(
    `${formatCurrency(data.totalGrossPay)}`,
    MARGIN + CONTENT_WIDTH - 8,
    y + 15,
    { align: 'right' }
  )

  return y + boxHeight + 10
}

/**
 * Dessine le pied de page
 */
function drawFooter(doc: jsPDF): void {
  const footerY = PAGE_HEIGHT - 15

  // Ligne de séparation
  doc.setDrawColor(...COLORS.grayLight)
  doc.line(MARGIN, footerY - 5, PAGE_WIDTH - MARGIN, footerY - 5)

  // Texte d'aide
  doc.setTextColor(...COLORS.gray)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'Pour déclarer, rendez-vous sur cesu.urssaf.fr',
    PAGE_WIDTH / 2,
    footerY,
    { align: 'center' }
  )

  // Logo/signature UniLien
  doc.setTextColor(...COLORS.primary)
  doc.setFont('helvetica', 'bold')
  doc.text('Généré par UniLien', PAGE_WIDTH / 2, footerY + 5, { align: 'center' })
}

// Utilitaires de formatage
function formatNumber(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function formatCurrency(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €'
}
