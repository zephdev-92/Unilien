/* eslint-disable react-refresh/only-export-components */
/**
 * Générateur PDF pour les déclarations CESU
 * Récapitulatif mensuel détaillé : heures, décomposition de la rémunération
 * (présence jour/nuit, majorations) et net estimé.
 *
 * Conçu pour que Marie puisse reporter directement chaque ligne dans CESU
 * (rubrique « heures travaillées » + sous-rubrique « compléments de salaire »).
 *
 * Utilise @react-pdf/renderer pour un rendu vectoriel net.
 */
import React from 'react'
import { Document, Page, View, Text, StyleSheet, Link } from '@react-pdf/renderer'
import type { MonthlyDeclarationData, EmployeeDeclarationData, ExportResult } from './types'
import { renderReactPdf } from './pdfReactRenderer'
import {
  colors,
  baseStyles,
  euro,
  hrs,
  formatDateTime,
  PdfHeader,
  PdfFooter,
  SectionTitle,
  InfoIcon,
} from './pdfReactTheme'

const s = StyleSheet.create({
  body: {
    padding: '20px 28px 20px',
  },
  // Employer section
  employerSection: {
    backgroundColor: colors.bgSection,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '14px 16px',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  employerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  employerName: {
    fontSize: 13,
    fontWeight: 600,
  },
  employerAddress: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cesuNumber: {
    backgroundColor: '#EDF1F5',
    color: colors.navy,
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 4,
  },
  periodLine: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  // Employee card
  employeeCard: {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  empName: {
    fontSize: 14,
    fontWeight: 600,
  },
  contractBadge: {
    backgroundColor: '#EDF1F5',
    color: colors.navy,
    fontSize: 10,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  cardSubline: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginBottom: 12,
  },
  // Décomposition (table)
  breakdown: {
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottom: `1px solid ${colors.border}`,
  },
  breakdownRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 10.5,
    color: colors.text,
  },
  breakdownDetail: {
    fontSize: 9,
    color: colors.textMuted,
  },
  breakdownAmount: {
    fontSize: 10.5,
    fontWeight: 600,
  },
  breakdownSubLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
    paddingLeft: 12,
  },
  breakdownSubAmount: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  // Totaux
  totalBlock: {
    marginTop: 8,
  },
  totalGrossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDF1F5',
    padding: '6px 10px',
    borderRadius: 5,
    marginBottom: 4,
  },
  totalGrossLabel: {
    fontSize: 10.5,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalGrossAmount: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.navy,
  },
  totalNetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.greenBg,
    padding: '8px 12px',
    borderRadius: 6,
  },
  totalNetLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.greenDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  totalNetAmount: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.greenDark,
  },
  totalNetSub: {
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Grand total
  grandTotal: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    padding: '16px 20px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  grandTotalLeft: {
    flex: 1,
  },
  grandTotalTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  grandTotalSub: {
    fontSize: 10,
    color: 'white',
    opacity: 0.75,
    marginTop: 2,
  },
  grandTotalAmounts: {
    alignItems: 'flex-end',
  },
  grandTotalNet: {
    fontSize: 20,
    fontWeight: 600,
    color: 'white',
  },
  grandTotalNetLabel: {
    fontSize: 9,
    color: 'white',
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  grandTotalGross: {
    fontSize: 11,
    color: 'white',
    opacity: 0.85,
    marginTop: 2,
  },
  // How-to
  howto: {
    backgroundColor: '#EDF1F5',
    border: `1px solid ${colors.borderDark}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginTop: 16,
  },
  howtoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  howtoTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  howtoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  stepNumber: {
    width: 18,
    height: 18,
    backgroundColor: colors.navy,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 9,
    fontWeight: 600,
    color: 'white',
  },
  stepTitle: {
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  stepDesc: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 1.4,
  },
  howtoLink: {
    backgroundColor: colors.navy,
    borderRadius: 5,
    padding: '4px 10px',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  howtoLinkText: {
    fontSize: 9,
    fontWeight: 600,
    color: 'white',
  },
  howtoNote: {
    fontSize: 7.5,
    color: colors.textMuted,
    marginTop: 8,
    paddingTop: 6,
    borderTop: `1px solid ${colors.borderDark}`,
    lineHeight: 1.5,
  },
})

export async function generateCesuPdf(data: MonthlyDeclarationData): Promise<ExportResult> {
  try {
    const content = await renderReactPdf(<CesuDocument data={data} />)
    const filename = `cesu_${data.year}_${String(data.month).padStart(2, '0')}.pdf`
    return { success: true, filename, content, mimeType: 'application/pdf' }
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

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function CesuDocument({ data }: { data: MonthlyDeclarationData }) {
  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PdfHeader
          title="RÉCAPITULATIF CESU"
          subtitle={data.periodLabel}
          rightText={`Généré le ${formatDateTime(data.generatedAt)}`}
        />

        <View style={s.body}>
          {/* Employer */}
          <View style={s.employerSection} wrap={false}>
            <Text style={s.sectionLabel}>Employeur</Text>
            <View style={s.employerInfo}>
              <View>
                <Text style={s.employerName}>{data.employerFirstName} {data.employerLastName}</Text>
                <Text style={s.employerAddress}>{data.employerAddress}</Text>
              </View>
              {data.cesuNumber && (
                <Text style={s.cesuNumber}>N° CESU : {data.cesuNumber}</Text>
              )}
            </View>
            <Text style={s.periodLine}>
              Période d{'’'}emploi : du {formatShortDate(data.periodStartDate)} au {formatShortDate(data.periodEndDate)}
            </Text>
          </View>

          <SectionTitle>Employés ({data.totalEmployees})</SectionTitle>

          {data.employees.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} />
          ))}

          {/* Grand total */}
          <View style={s.grandTotal} wrap={false}>
            <View style={s.grandTotalLeft}>
              <Text style={s.grandTotalTitle}>Total général</Text>
              <Text style={s.grandTotalSub}>{hrs(data.totalHours)} travaillées sur la période</Text>
            </View>
            <View style={s.grandTotalAmounts}>
              <Text style={s.grandTotalNetLabel}>Net à verser</Text>
              <Text style={s.grandTotalNet}>{euro(data.totalNetPay)}</Text>
              <Text style={s.grandTotalGross}>Brut : {euro(data.totalGrossPay)}</Text>
            </View>
          </View>

          {/* How-to */}
          <HowToSection periodLabel={data.periodLabel} />
        </View>

        <PdfFooter
          legal="Pour déclarer, rendez-vous sur cesu.urssaf.fr"
          page="Page 1/1"
        />
      </Page>
    </Document>
  )
}

interface BreakdownLine {
  label: string
  detail?: string
  amount: number
}

function buildBreakdown(emp: EmployeeDeclarationData): BreakdownLine[] {
  const lines: BreakdownLine[] = []

  if (emp.basePay > 0) {
    lines.push({
      label: 'Travail effectif',
      detail: `${hrs(emp.effectiveWorkHours)} × ${euro(emp.hourlyRate)}/h`,
      amount: emp.basePay,
    })
  }
  if (emp.presenceResponsiblePay > 0) {
    lines.push({
      label: 'Présence responsable jour',
      detail: `${hrs(emp.presenceDayHours)} × 2/3 (Art. 137.1)`,
      amount: emp.presenceResponsiblePay,
    })
  }
  if (emp.nightPresenceAllowance > 0) {
    lines.push({
      label: 'Présence responsable nuit',
      detail: `${hrs(emp.presenceNightHours)} (forfait ×1/4 ou requalif. Art. 148)`,
      amount: emp.nightPresenceAllowance,
    })
  }
  if (emp.sundayMajoration > 0) {
    lines.push({
      label: 'Majoration dimanche (+30%)',
      detail: `${hrs(emp.sundayHours)} le dimanche`,
      amount: emp.sundayMajoration,
    })
  }
  if (emp.holidayMajoration > 0) {
    lines.push({
      label: 'Majoration jour férié',
      detail: `${hrs(emp.holidayHours)} sur jour férié`,
      amount: emp.holidayMajoration,
    })
  }
  if (emp.nightMajoration > 0) {
    lines.push({
      label: 'Majoration heures de nuit (+20%)',
      detail: `${hrs(emp.nightHours)} entre 21h et 6h`,
      amount: emp.nightMajoration,
    })
  }
  if (emp.overtimeMajoration > 0) {
    lines.push({
      label: 'Heures supplémentaires (+25% / +50%)',
      detail: `${hrs(emp.overtimeHours)} au-delà de l{'’'}horaire contractuel`,
      amount: emp.overtimeMajoration,
    })
  }
  return lines
}

function EmployeeCard({ emp }: { emp: EmployeeDeclarationData }) {
  const lines = buildBreakdown(emp)
  const contractLine = (() => {
    const parts: string[] = [`${euro(emp.hourlyRate)}/h`]
    if (emp.contractStartDate) {
      const start = formatShortDate(emp.contractStartDate)
      if (emp.contractEndDate) {
        parts.push(`du ${start} au ${formatShortDate(emp.contractEndDate)}`)
      } else {
        parts.push(`depuis le ${start}`)
      }
    }
    parts.push(`${emp.shiftsCount} intervention${emp.shiftsCount > 1 ? 's' : ''}`)
    return parts.join(' · ')
  })()

  return (
    <View style={s.employeeCard} wrap={false}>
      <View style={s.cardHeader}>
        <Text style={s.empName}>{emp.firstName} {emp.lastName}</Text>
        <Text style={s.contractBadge}>{emp.contractType}</Text>
      </View>
      <Text style={s.cardSubline}>{contractLine}</Text>

      {/* Décomposition de la rémunération */}
      <View style={s.breakdown}>
        {lines.map((line, i) => {
          const isLast = i === lines.length - 1
          return (
            <View key={i} style={isLast ? s.breakdownRowLast : s.breakdownRow}>
              <View style={s.breakdownLabelGroup}>
                <Text style={s.breakdownLabel}>{line.label}</Text>
                {line.detail && <Text style={s.breakdownDetail}>{line.detail}</Text>}
              </View>
              <Text style={s.breakdownAmount}>{euro(line.amount)}</Text>
            </View>
          )
        })}
      </View>

      {/* Totaux brut + net */}
      <View style={s.totalBlock}>
        <View style={s.totalGrossRow}>
          <Text style={s.totalGrossLabel}>Total brut</Text>
          <Text style={s.totalGrossAmount}>{euro(emp.totalGrossPay)}</Text>
        </View>
        <View style={s.totalNetRow}>
          <View>
            <Text style={s.totalNetLabel}>Net à verser</Text>
            <Text style={s.totalNetSub}>
              Cotisations salariales déduites ({euro(emp.totalEmployeeDeductions)})
            </Text>
          </View>
          <Text style={s.totalNetAmount}>{euro(emp.netPay)}</Text>
        </View>
      </View>
    </View>
  )
}

const HOWTO_STEPS = [
  {
    title: 'Connectez-vous à votre espace employeur CESU',
    desc: 'Rendez-vous sur cesu.urssaf.fr et accédez à votre tableau de bord.',
  },
  {
    title: 'Sélectionnez "Déclarer" puis le mois concerné',
    desc: null, // filled dynamically
  },
  {
    title: 'Reportez les heures totales et le salaire net à verser',
    desc: 'Saisissez le nombre d’heures et le total NET à verser. Pour les compléments (présence responsable, heures de nuit), utilisez la rubrique « compléments de salaire ».',
  },
  {
    title: 'Validez la déclaration',
    desc: 'Le CESU calcule automatiquement les cotisations sociales et édite le bulletin de paie officiel.',
  },
  {
    title: 'Conservez ce récapitulatif et le volet social',
    desc: 'Archivez ce document avec le volet social CESU pour vos obligations légales.',
  },
]

function HowToSection({ periodLabel }: { periodLabel: string }) {
  return (
    <View style={s.howto} wrap={false}>
      <View style={s.howtoHeader}>
        <InfoIcon size={18} color={colors.navy} />
        <Text style={s.howtoTitle}>Comment déclarer sur le CESU ?</Text>
      </View>

      {HOWTO_STEPS.map((step, i) => (
        <View key={i} style={s.howtoStep}>
          <View style={s.stepNumber}>
            <Text style={s.stepNumberText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.stepTitle}>{step.title}</Text>
            <Text style={s.stepDesc}>
              {i === 1
                ? `Choisissez le salarié et la période de ${periodLabel.toLowerCase()}.`
                : step.desc}
            </Text>
          </View>
        </View>
      ))}

      <Link src="https://www.cesu.urssaf.fr" style={s.howtoLink}>
        <Text style={s.howtoLinkText}>Accéder à cesu.urssaf.fr</Text>
      </Link>

      <Text style={s.howtoNote}>
        Date limite de déclaration : avant le 5 du mois suivant la période d{'’'}emploi.
        En cas de retard, des pénalités peuvent s{'’'}appliquer.
        Les cotisations sont prélevées automatiquement sur votre compte bancaire environ 2 jours ouvrés après la déclaration.
        {'\n'}
        Le net affiché est une estimation IDCC 3239 (taux 2025) ; le montant exact figure sur le bulletin officiel CESU.
      </Text>
    </View>
  )
}
