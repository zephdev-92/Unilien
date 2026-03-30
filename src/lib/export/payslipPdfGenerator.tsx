/* eslint-disable react-refresh/only-export-components */
/**
 * Générateur PDF de bulletins de paie individuels
 * Convention Collective IDCC 3239 - salariat direct
 * Barèmes 2025 - à titre indicatif
 *
 * Utilise @react-pdf/renderer pour un rendu vectoriel net.
 */
import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { PayslipData, ExportResult, PayslipPchData } from './types'
import { renderReactPdf } from './pdfReactRenderer'
import {
  colors,
  baseStyles,
  euro,
  hrs,
  pct,
  formatDateTime,
  PdfHeader,
  PdfFooter,
  PdfTable,
  TotalRow,
  SectionTitle,
  InfoIcon,
} from './pdfReactTheme'

const PCH_TYPE_DISPLAY: Record<string, string> = {
  emploiDirect: 'Emploi direct',
  mandataire: 'Mandataire',
  prestataire: 'Prestataire',
  aidantFamilial: 'Aidant familial',
  aidantFamilialCessation: 'Aidant familial — cessation activité',
}

const s = StyleSheet.create({
  parties: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  partyCard: {
    flex: 1,
    backgroundColor: colors.bgSection,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '12px 14px',
  },
  partyLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 1.5,
  },
  partyTag: {
    backgroundColor: '#EDF1F5',
    color: colors.navy,
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  // Net box
  netBox: {
    backgroundColor: colors.greenBg,
    border: `2px solid ${colors.green}`,
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 16,
  },
  netLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  netLabel: {
    fontSize: 11,
    fontWeight: 600,
  },
  netAmount: {
    fontSize: 12,
    fontWeight: 600,
  },
  netSeparator: {
    borderTop: `1px solid ${colors.green}`,
    opacity: 0.5,
    marginVertical: 8,
  },
  netFinalLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.greenDark,
  },
  netFinalAmount: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.greenDark,
  },
  pasLabel: {
    fontSize: 11,
    color: colors.red,
  },
  pasAmount: {
    fontSize: 11,
    color: colors.red,
    fontWeight: 600,
  },
  // Employer cost
  employerCost: {
    backgroundColor: colors.navy,
    borderRadius: 6,
    padding: '10px 14px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  costLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  costAmount: {
    fontSize: 16,
    fontWeight: 600,
    color: 'white',
  },
  // Exemption banner
  exemptionBanner: {
    backgroundColor: colors.warningBg,
    border: `1px solid ${colors.warningBorder}`,
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 10,
    fontWeight: 600,
    color: colors.warningText,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // PCH
  pchBox: {
    backgroundColor: colors.pchBg,
    border: `1px solid ${colors.pchBorder}`,
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 16,
  },
  pchInfoBar: {
    backgroundColor: colors.pchInfo,
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 10,
    color: colors.pchText,
    fontWeight: 600,
    marginBottom: 10,
  },
  pchLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: 11,
    borderBottom: `1px solid #D4E6F5`,
  },
  pchLineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#EDF1F5',
    padding: '8px 8px',
    borderRadius: 6,
    marginTop: 6,
    fontWeight: 600,
    color: colors.navy,
  },
})

export async function generatePayslipPdf(data: PayslipData): Promise<ExportResult> {
  try {
    const content = await renderReactPdf(<PayslipDocument data={data} />)
    const safeName = data.employeeLastName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const filename = `bulletin_${safeName}_${data.year}_${String(data.month).padStart(2, '0')}.pdf`
    return { success: true, filename, content, mimeType: 'application/pdf' }
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

function PayslipDocument({ data }: { data: PayslipData }) {
  const { cotisations } = data
  const coutTotal = cotisations.grossPay + cotisations.totalEmployerContributions

  const grossRows = buildGrossRows(data)

  const employeeCotisRows = cotisations.employeeCotisations.map(c => ({
    cells: [c.label, euro(c.base), pct(c.rate), euro(c.amount)],
  }))

  const employerCotisRows = cotisations.employerCotisations.map(c => ({
    cells: [
      c.exempted ? `${c.label} (Exo.)` : c.label,
      pct(c.rate),
      c.exempted ? '0,00 €' : euro(c.amount),
    ],
    highlighted: c.exempted,
  }))

  const sectionTitlePatronal = data.isExemptPatronalSS
    ? 'Cotisations patronales — Exonération SS (Art. L241-10 CSS)'
    : 'Cotisations patronales (informatives — non déduites du salaire)'

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title="BULLETIN DE PAIE"
          subtitle={data.periodLabel}
          rightText={`Généré le ${formatDateTime(data.generatedAt)}`}
          badge="IDCC 3239 · Barèmes 2025"
        />

        <View style={baseStyles.body}>
          {/* Parties */}
          <View style={s.parties} wrap={false}>
            <View style={s.partyCard}>
              <Text style={s.partyLabel}>Employeur</Text>
              <Text style={s.partyName}>{data.employerFirstName} {data.employerLastName}</Text>
              <Text style={s.partyDetail}>{data.employerAddress}</Text>
            </View>
            <View style={s.partyCard}>
              <Text style={s.partyLabel}>Employé</Text>
              <Text style={s.partyName}>{data.employeeFirstName} {data.employeeLastName}</Text>
              <Text style={s.partyDetail}>{data.contractType} · {data.weeklyHours}h/sem · {euro(data.hourlyRate)}/h</Text>
              <Text style={s.partyTag}>{data.shiftsCount} intervention(s) ce mois</Text>
            </View>
          </View>

          {/* Rémunération brute */}
          <SectionTitle>Éléments de rémunération brute</SectionTitle>
          <PdfTable
            headers={['Désignation', 'Heures', 'Taux unitaire', 'Montant']}
            widths={['40%', '20%', '20%', '20%']}
            rows={grossRows}
          />
          <TotalRow label="Total brut" amount={euro(data.totalGrossPay)} />

          {/* Cotisations salariales */}
          <SectionTitle>Cotisations et contributions sociales</SectionTitle>
          <PdfTable
            headers={['Désignation', 'Assiette', 'Taux', 'Part salariale']}
            widths={['40%', '20%', '20%', '20%']}
            rows={employeeCotisRows}
          />
          <TotalRow label="Total cotisations salariales" amount={euro(cotisations.totalEmployeeDeductions)} />

          {/* Net */}
          <View style={s.netBox} wrap={false}>
            <View style={s.netLine}>
              <Text style={s.netLabel}>Net imposable</Text>
              <Text style={s.netAmount}>{euro(cotisations.netImposable)}</Text>
            </View>
            {cotisations.pasRate > 0 && (
              <View style={s.netLine}>
                <Text style={s.pasLabel}>Prélèvement à la source ({pct(cotisations.pasRate)})</Text>
                <Text style={s.pasAmount}>- {euro(cotisations.pasAmount)}</Text>
              </View>
            )}
            <View style={s.netSeparator} />
            <View style={[s.netLine, { marginBottom: 0 }]}>
              <Text style={s.netFinalLabel}>NET À PAYER</Text>
              <Text style={s.netFinalAmount}>{euro(cotisations.netAPayer)}</Text>
            </View>
          </View>

          {/* Cotisations patronales */}
          <SectionTitle>{sectionTitlePatronal}</SectionTitle>
          {data.isExemptPatronalSS && (
            <View style={s.exemptionBanner} wrap={false}>
              <InfoIcon />
              <Text style={{ flex: 1 }}>
                Employeur exonéré de cotisations patronales de Sécurité sociale depuis le 01/10/2006 (sans limitation de durée).
              </Text>
            </View>
          )}
          <PdfTable
            headers={['Désignation', 'Taux', 'Montant employeur']}
            widths={['50%', '25%', '25%']}
            rows={employerCotisRows}
          />
          <TotalRow label="Total charges patronales" amount={euro(cotisations.totalEmployerContributions)} />

          {/* Coût total employeur */}
          <View style={s.employerCost} wrap={false}>
            <Text style={s.costLabel}>Coût total employeur</Text>
            <Text style={s.costAmount}>{euro(coutTotal)}</Text>
          </View>

          {/* PCH */}
          {data.isPchBeneficiary && data.pch && <PchSection pch={data.pch} />}
        </View>

        <PdfFooter
          legal="Document indicatif — taux IDCC 3239 / 2025 — consulter un expert-comptable"
          page="Page 1/1"
        />
      </Page>
    </Document>
  )
}

function PchSection({ pch }: { pch: PayslipPchData }) {
  const typeLabel = PCH_TYPE_DISPLAY[pch.pchType] ?? pch.pchType

  return (
    <>
      <SectionTitle>Récapitulatif PCH — Prestation de Compensation du Handicap</SectionTitle>
      <View style={s.pchBox} wrap={false}>
        <Text style={s.pchInfoBar}>
          Dispositif : {typeLabel} · Tarif Élément 1 : {pch.pchElement1Rate.toFixed(2).replace('.', ',')} €/h · Heures allouées : {pch.pchMonthlyHours}h/mois
        </Text>
        <View style={s.pchLine}>
          <Text>Enveloppe PCH allouée (Élément 1)</Text>
          <Text style={{ fontWeight: 600 }}>{euro(pch.pchEnvelopePch)}</Text>
        </View>
        <View style={s.pchLine}>
          <Text>Coût total employeur (brut + charges patronales)</Text>
          <Text style={{ fontWeight: 600 }}>{euro(pch.pchTotalCost)}</Text>
        </View>
        <View style={s.pchLineTotal}>
          <Text>Reste à charge estimé</Text>
          <Text>{euro(pch.pchResteACharge)}</Text>
        </View>
      </View>
    </>
  )
}

function buildGrossRows(data: PayslipData): { cells: string[] }[] {
  const rows: { cells: string[] }[] = []

  rows.push({ cells: ['Salaire de base', hrs(data.normalHours), euro(data.hourlyRate), euro(data.basePay)] })

  if (data.sundayMajoration > 0)
    rows.push({ cells: ['Majoration dimanche (+30%)', hrs(data.sundayHours), euro(data.hourlyRate * 0.30), euro(data.sundayMajoration)] })
  if (data.holidayMajoration > 0)
    rows.push({ cells: ['Majoration jour férié', hrs(data.holidayHours), '—', euro(data.holidayMajoration)] })
  if (data.nightMajoration > 0)
    rows.push({ cells: ['Majoration heures de nuit (+20%)', hrs(data.nightHours), euro(data.hourlyRate * 0.20), euro(data.nightMajoration)] })
  if (data.overtimeMajoration > 0)
    rows.push({ cells: ['Majoration heures supplémentaires', hrs(data.overtimeHours), '—', euro(data.overtimeMajoration)] })
  if (data.presenceResponsiblePay > 0)
    rows.push({ cells: ['Présence responsable jour (×2/3)', '—', '—', euro(data.presenceResponsiblePay)] })
  if (data.nightPresenceAllowance > 0)
    rows.push({ cells: ['Indemnité présence de nuit (×1/4)', '—', '—', euro(data.nightPresenceAllowance)] })

  return rows
}
