/**
 * Générateur PDF de bulletins de paie individuels
 * Convention Collective IDCC 3239 – salariat direct
 * Barèmes 2025 — à titre indicatif
 */

import { jsPDF } from 'jspdf'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { PayslipData, PayslipPchData, ExportResult } from './types'

// ─── Palette Unilien ─────────────────────────────────────────────────────────
const C = {
  primary:      [78,  100, 120] as [number, number, number], // #4E6478
  primaryLight: [220, 228, 235] as [number, number, number],
  green:        [155, 178,  59] as [number, number, number], // #9BB23B
  greenLight:   [236, 242, 218] as [number, number, number],
  gray:         [107, 114, 128] as [number, number, number],
  grayLight:    [245, 246, 247] as [number, number, number],
  exoBg:        [255, 250, 230] as [number, number, number], // fond jaune clair exonération
  exoText:      [180, 120,   0] as [number, number, number], // texte orange exonération
  black:        [17,   24,  39] as [number, number, number],
  white:        [255, 255, 255] as [number, number, number],
  border:       [210, 214, 220] as [number, number, number],
  red:          [220,  38,  38] as [number, number, number],
}

const W   = 210   // largeur A4
const H   = 297   // hauteur A4
const MG  = 15    // marge gauche/droite
const CW  = W - 2 * MG  // 180mm largeur contenu

function euro(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' €'
}
function hrs(n: number): string {
  return n.toFixed(2).replace('.', ',') + ' h'
}
function pct(r: number): string {
  return (r * 100).toFixed(2) + ' %'
}

// ─── Point d'entrée public ───────────────────────────────────────────────────
export function generatePayslipPdf(data: PayslipData): ExportResult {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    let y = drawHeader(doc, data)
    y = drawParties(doc, data, y)
    y = drawGrossSection(doc, data, y)
    y = drawCotisationsSection(doc, data, y)
    y = drawNetsSection(doc, data, y)
    y = drawEmployerSection(doc, data, y)
    if (data.isPchBeneficiary && data.pch) {
      drawPchSection(doc, data.pch, y)
    }
    addFooter(doc)

    const safeName = data.employeeLastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const filename = `bulletin_${safeName}_${data.year}_${String(data.month).padStart(2, '0')}.pdf`

    return {
      success: true,
      filename,
      content: doc.output('datauristring'),
      mimeType: 'application/pdf',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      content: '',
      mimeType: '',
      error: error instanceof Error ? error.message : 'Erreur génération PDF',
    }
  }
}

// ─── Sections ────────────────────────────────────────────────────────────────

function drawHeader(doc: jsPDF, data: PayslipData): number {
  // Bandeau coloré
  doc.setFillColor(...C.primary)
  doc.rect(0, 0, W, 38, 'F')

  // Titre
  doc.setTextColor(...C.white)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('BULLETIN DE PAIE', W / 2, 14, { align: 'center' })

  // Période
  doc.setFontSize(13)
  doc.setFont('helvetica', 'normal')
  doc.text(data.periodLabel.toUpperCase(), W / 2, 24, { align: 'center' })

  // Date de génération
  doc.setFontSize(8)
  doc.text(
    `Généré le ${format(data.generatedAt, "d MMMM yyyy 'à' HH:mm", { locale: fr })}`,
    W - MG, 33, { align: 'right' }
  )

  // Mention indicative
  doc.setTextColor(...C.gray)
  doc.setFontSize(7)
  doc.text('Document indicatif — barèmes IDCC 3239 / 2025', MG, 33)

  return 46
}

function drawParties(doc: jsPDF, data: PayslipData, y: number): number {
  const colW = (CW - 6) / 2
  const boxH = 30

  // ── Employeur (gauche) ──────────────────────────────────────────────────
  doc.setFillColor(...C.grayLight)
  doc.setDrawColor(...C.border)
  doc.roundedRect(MG, y, colW, boxH, 2, 2, 'FD')

  doc.setTextColor(...C.primary)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYEUR', MG + 4, y + 6)

  doc.setTextColor(...C.black)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`${data.employerFirstName} ${data.employerLastName}`, MG + 4, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  doc.text(data.employerAddress, MG + 4, y + 19, { maxWidth: colW - 8 })

  // ── Employé (droite) ─────────────────────────────────────────────────
  const ex = MG + colW + 6
  doc.setFillColor(...C.grayLight)
  doc.roundedRect(ex, y, colW, boxH, 2, 2, 'FD')

  doc.setTextColor(...C.primary)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPLOYÉ', ex + 4, y + 6)

  doc.setTextColor(...C.black)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`${data.employeeFirstName} ${data.employeeLastName}`, ex + 4, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.gray)
  doc.text(`Contrat ${data.contractType} · ${data.weeklyHours}h/sem · ${euro(data.hourlyRate)}/h`, ex + 4, y + 19)
  doc.text(`${data.shiftsCount} intervention(s) ce mois`, ex + 4, y + 25)

  return y + boxH + 7
}

function drawGrossSection(doc: jsPDF, data: PayslipData, y: number): number {
  // Titre de section
  y = sectionTitle(doc, 'ÉLÉMENTS DE RÉMUNÉRATION BRUTE', y)

  // En-têtes de tableau
  const cols = [MG, MG + 95, MG + 120, MG + 148]
  y = tableHeader(doc, ['Désignation', 'Heures', 'Taux unitaire', 'Montant'], cols, y)

  // Lignes de détail
  const rows: Array<[string, string, string, string]> = [
    ['Salaire de base', hrs(data.normalHours), euro(data.hourlyRate), euro(data.basePay)],
  ]
  if (data.sundayMajoration > 0)
    rows.push(['Majoration dimanche (+30%)', hrs(data.sundayHours), euro(data.hourlyRate * 0.30), euro(data.sundayMajoration)])
  if (data.holidayMajoration > 0)
    rows.push(['Majoration jour férié', hrs(data.holidayHours), '—', euro(data.holidayMajoration)])
  if (data.nightMajoration > 0)
    rows.push(['Majoration heures de nuit (+20%)', hrs(data.nightHours), euro(data.hourlyRate * 0.20), euro(data.nightMajoration)])
  if (data.overtimeMajoration > 0)
    rows.push(['Majoration heures supplémentaires', hrs(data.overtimeHours), '—', euro(data.overtimeMajoration)])
  if (data.presenceResponsiblePay > 0)
    rows.push(['Présence responsable jour (×2/3)', '—', '—', euro(data.presenceResponsiblePay)])
  if (data.nightPresenceAllowance > 0)
    rows.push(['Indemnité présence de nuit (×1/4)', '—', '—', euro(data.nightPresenceAllowance)])

  y = tableRows(doc, rows, cols, y)

  // Total brut
  y = totalRow(doc, 'TOTAL BRUT', euro(data.totalGrossPay), y, C.primaryLight)

  return y + 5
}

function drawCotisationsSection(doc: jsPDF, data: PayslipData, y: number): number {
  y = checkPageBreak(doc, y, 60)
  y = sectionTitle(doc, 'COTISATIONS ET CONTRIBUTIONS SOCIALES', y)

  const { cotisations } = data
  const cols = [MG, MG + 80, MG + 118, MG + 148]
  y = tableHeader(doc, ['Désignation', 'Assiette', 'Taux', 'Part salariale'], cols, y)

  const rows: Array<[string, string, string, string]> = cotisations.employeeCotisations.map(c => [
    c.label,
    euro(c.base),
    pct(c.rate),
    euro(c.amount),
  ])

  y = tableRows(doc, rows, cols, y)
  y = totalRow(doc, 'TOTAL COTISATIONS SALARIALES', euro(cotisations.totalEmployeeDeductions), y, C.primaryLight)

  return y + 5
}

function drawNetsSection(doc: jsPDF, data: PayslipData, y: number): number {
  y = checkPageBreak(doc, y, 38)
  const { cotisations } = data
  const boxH = cotisations.pasRate > 0 ? 34 : 26

  doc.setFillColor(...C.greenLight)
  doc.setDrawColor(...C.green)
  doc.roundedRect(MG, y, CW, boxH, 3, 3, 'FD')

  let iy = y + 8

  // Net imposable
  doc.setTextColor(...C.black)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Net imposable', MG + 4, iy)
  doc.text(euro(cotisations.netImposable), MG + CW - 4, iy, { align: 'right' })
  iy += 7

  // PAS (uniquement si > 0)
  if (cotisations.pasRate > 0) {
    doc.setTextColor(...C.red)
    doc.setFont('helvetica', 'normal')
    doc.text(`Prélèvement à la source (${pct(cotisations.pasRate)})`, MG + 4, iy)
    doc.text(`- ${euro(cotisations.pasAmount)}`, MG + CW - 4, iy, { align: 'right' })
    iy += 7
  }

  // Ligne de séparation
  doc.setDrawColor(...C.green)
  doc.line(MG + 4, iy - 2, MG + CW - 4, iy - 2)

  // NET À PAYER
  doc.setTextColor(...C.green)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('NET À PAYER', MG + 4, iy + 5)
  doc.text(euro(cotisations.netAPayer), MG + CW - 4, iy + 5, { align: 'right' })

  return y + boxH + 7
}

function drawEmployerSection(doc: jsPDF, data: PayslipData, y: number): number {
  const { cotisations, isExemptPatronalSS } = data
  const neededH = isExemptPatronalSS ? 80 : 55
  y = checkPageBreak(doc, y, neededH)

  const title = isExemptPatronalSS
    ? 'COTISATIONS PATRONALES — EXONÉRATION SS (Art. L241-10 CSS)'
    : 'COTISATIONS PATRONALES (informatives — non déduites du salaire)'
  y = sectionTitle(doc, title, y)

  // Banderole d'exonération
  if (isExemptPatronalSS) {
    doc.setFillColor(...C.exoBg)
    doc.setDrawColor(...C.exoText)
    doc.roundedRect(MG, y, CW, 10, 2, 2, 'FD')
    doc.setTextColor(...C.exoText)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(
      'Employeur exonéré de cotisations patronales de Sécurité sociale depuis le 01/10/2006 (sans limitation de durée).',
      MG + 4, y + 6.5
    )
    y += 14
  }

  const cols = [MG, MG + 110, MG + 140]
  y = tableHeader(doc, ['Désignation', 'Taux', 'Montant employeur'], cols, y)

  // Afficher toutes les lignes ; les lignes exonérées en texte gris + "(Exo.)"
  for (let i = 0; i < cotisations.employerCotisations.length; i++) {
    const c = cotisations.employerCotisations[i]
    if (i % 2 === 0) {
      if (c.exempted) {
        doc.setFillColor(...C.exoBg)
      } else {
        doc.setFillColor(250, 251, 252)
      }
      doc.rect(MG, y, CW, 6, 'F')
    }
    doc.setDrawColor(...C.border)
    doc.line(MG, y + 6, MG + CW, y + 6)

    if (c.exempted) {
      doc.setTextColor(...C.exoText)
      doc.setFont('helvetica', 'italic')
    } else {
      doc.setTextColor(...C.black)
      doc.setFont('helvetica', 'normal')
    }
    doc.setFontSize(8)

    const label = c.exempted ? `${c.label} (Exo.)` : c.label
    doc.text(label, cols[0] + 2, y + 4)
    doc.text(pct(c.rate), cols[1] + (cols[2] - cols[1] - 2), y + 4, { align: 'right' })
    doc.text(c.exempted ? '0,00 €' : euro(c.amount), MG + CW - 2, y + 4, { align: 'right' })
    y += 6
  }

  // Total employeur
  y = totalRow(doc, 'TOTAL CHARGES PATRONALES', euro(cotisations.totalEmployerContributions), y, C.primaryLight)
  y += 3

  // Coût total employeur
  const coutTotal = cotisations.grossPay + cotisations.totalEmployerContributions
  doc.setFillColor(...C.primary)
  doc.roundedRect(MG, y, CW, 10, 2, 2, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('COÛT TOTAL EMPLOYEUR', MG + 4, y + 7)
  doc.text(euro(coutTotal), MG + CW - 4, y + 7, { align: 'right' })
  y += 13

  // Note légale exonération
  if (isExemptPatronalSS) {
    doc.setTextColor(...C.gray)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Restent dues : retraite complémentaire, chômage, FNAL, CSA, AT/MP et l\'intégralité des cotisations salariales.',
      MG, y, { maxWidth: CW }
    )
    y += 8
  }

  return y
}

// ─── Section PCH ─────────────────────────────────────────────────────────────

const PCH_TYPE_DISPLAY: Record<string, string> = {
  emploiDirect:            'Emploi direct',
  mandataire:              'Mandataire',
  prestataire:             'Prestataire',
  aidantFamilial:          'Aidant familial',
  aidantFamilialCessation: 'Aidant familial — cessation activité',
}

function drawPchSection(doc: jsPDF, pch: PayslipPchData, y: number): void {
  y = checkPageBreak(doc, y, 52)

  // Titre de section
  y = sectionTitle(doc, 'RÉCAPITULATIF PCH — PRESTATION DE COMPENSATION DU HANDICAP', y)

  // Bandeau informatif
  doc.setFillColor(240, 247, 255)
  doc.setDrawColor(180, 210, 240)
  doc.roundedRect(MG, y, CW, 10, 2, 2, 'FD')
  doc.setTextColor(50, 100, 160)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  const typeLabel = PCH_TYPE_DISPLAY[pch.pchType] ?? pch.pchType
  doc.text(
    `Dispositif : ${typeLabel} · Tarif Élément 1 : ${pch.pchElement1Rate.toFixed(2).replace('.', ',')} €/h · Heures allouées : ${pch.pchMonthlyHours}h/mois`,
    MG + 4, y + 6.5
  )
  y += 14

  // Lignes récapitulatif
  const cols = [MG, MG + 130]

  const rows: Array<[string, string, boolean]> = [
    ['Enveloppe PCH allouée (Élément 1)', euro(pch.pchEnvelopePch), false],
    ['Coût total employeur (brut + charges patronales)', euro(pch.pchTotalCost), false],
    ['Reste à charge estimé', euro(pch.pchResteACharge), pch.pchResteACharge > 0],
  ]

  for (let i = 0; i < rows.length; i++) {
    const [label, amount, isRed] = rows[i]
    const isLast = i === rows.length - 1

    if (isLast) {
      doc.setFillColor(...C.primaryLight)
    } else if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252)
    } else {
      doc.setFillColor(...C.white)
    }
    doc.rect(MG, y, CW, 7, 'F')
    doc.setDrawColor(...C.border)
    doc.line(MG, y + 7, MG + CW, y + 7)

    doc.setFontSize(8)
    doc.setFont('helvetica', isLast ? 'bold' : 'normal')
    if (isRed) { doc.setTextColor(...C.red) } else { doc.setTextColor(...C.black) }
    doc.text(label, cols[0] + 2, y + 5)
    if (isRed) { doc.setTextColor(...C.red) } else if (isLast) { doc.setTextColor(...C.primary) } else { doc.setTextColor(...C.black) }
    doc.text(amount, MG + CW - 2, y + 5, { align: 'right' })
    y += 7
  }

  y += 4

  // Note légale
  doc.setTextColor(...C.gray)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'PCH versée par le Conseil Départemental. Les montants indiqués sont estimatifs — consulter votre référent PCH.',
    MG, y, { maxWidth: CW }
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...C.grayLight)
  doc.setDrawColor(...C.border)
  doc.roundedRect(MG, y, CW, 7, 1, 1, 'FD')
  doc.setTextColor(...C.primary)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(title, MG + 3, y + 5)
  return y + 11
}

function tableHeader(doc: jsPDF, labels: string[], cols: number[], y: number): number {
  doc.setFillColor(...C.primary)
  doc.rect(MG, y, CW, 6, 'F')
  doc.setTextColor(...C.white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  labels.forEach((lbl, i) => {
    const align = i === 0 ? 'left' : 'right'
    const x = i === 0 ? cols[i] + 2 : cols[i] + (i < cols.length - 1 ? (cols[i + 1] - cols[i] - 2) : (MG + CW - cols[i] - 2))
    doc.text(lbl, align === 'left' ? x : x + (i < cols.length - 1 ? (cols[i + 1] - cols[i] - 4) : (MG + CW - cols[i] - 4)), y + 4, { align })
  })
  return y + 6
}

function tableRows(
  doc: jsPDF,
  rows: Array<[string, string, string, string?]>,
  cols: number[],
  y: number
): number {
  doc.setFontSize(8)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Fond alterné
    if (i % 2 === 0) {
      doc.setFillColor(250, 251, 252)
      doc.rect(MG, y, CW, 6, 'F')
    }
    doc.setDrawColor(...C.border)
    doc.line(MG, y + 6, MG + CW, y + 6)

    doc.setTextColor(...C.black)
    doc.setFont('helvetica', 'normal')

    // Colonne 0 : texte gauche
    doc.text(row[0], cols[0] + 2, y + 4)

    // Colonnes suivantes : aligné droite
    for (let j = 1; j < row.length; j++) {
      const val = row[j]
      if (val === undefined) continue
      const rightEdge = j < cols.length - 1 ? cols[j + 1] - 2 : MG + CW - 2
      doc.text(val, rightEdge, y + 4, { align: 'right' })
    }

    y += 6
  }
  return y
}

function totalRow(
  doc: jsPDF,
  label: string,
  amount: string,
  y: number,
  bgColor: [number, number, number]
): number {
  doc.setFillColor(...bgColor)
  doc.rect(MG, y, CW, 7, 'F')
  doc.setTextColor(...C.primary)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(label, MG + 3, y + 5)
  doc.text(amount, MG + CW - 3, y + 5, { align: 'right' })
  return y + 7
}

function checkPageBreak(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight > H - 20) {
    doc.addPage()
    addFooter(doc)
    return MG
  }
  return y
}

function addFooter(doc: jsPDF): void {
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const fy = H - 12
    doc.setDrawColor(...C.border)
    doc.line(MG, fy - 3, W - MG, fy - 3)
    doc.setTextColor(...C.gray)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Document établi à titre indicatif — taux IDCC 3239 2025 — consulter un expert-comptable', W / 2, fy + 1, { align: 'center' })
    doc.setTextColor(...C.primary)
    doc.setFont('helvetica', 'bold')
    doc.text('Généré par UniLien', MG, fy + 1)
    doc.setTextColor(...C.gray)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i}/${pages}`, W - MG, fy + 1, { align: 'right' })
  }
}
