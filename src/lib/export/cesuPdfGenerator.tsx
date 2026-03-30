/* eslint-disable react-refresh/only-export-components */
/**
 * Générateur PDF pour les déclarations CESU
 * Récapitulatif mensuel des heures et salaires.
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
    marginBottom: 12,
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  cardMetric: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 12,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 600,
  },
  cardTotal: {
    backgroundColor: colors.greenBg,
    borderRadius: 6,
    padding: '8px 12px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTotalLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.greenDark,
    textTransform: 'uppercase',
  },
  cardTotalAmount: {
    fontSize: 15,
    fontWeight: 600,
    color: colors.greenDark,
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
  grandTotalTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  grandTotalSub: {
    fontSize: 11,
    color: 'white',
    opacity: 0.75,
    marginTop: 2,
  },
  grandTotalAmount: {
    fontSize: 24,
    fontWeight: 600,
    color: 'white',
  },
  // How-to (exact proto sizes)
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
          </View>

          <SectionTitle>Employés ({data.totalEmployees})</SectionTitle>

          {data.employees.map((emp, i) => (
            <EmployeeCard key={i} emp={emp} />
          ))}

          {/* Grand total */}
          <View style={s.grandTotal} wrap={false}>
            <View>
              <Text style={s.grandTotalTitle}>Total général</Text>
              <Text style={s.grandTotalSub}>{hrs(data.totalHours)} travaillées</Text>
            </View>
            <Text style={s.grandTotalAmount}>{euro(data.totalGrossPay)}</Text>
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

function EmployeeCard({ emp }: { emp: EmployeeDeclarationData }) {
  const totalMajorations =
    emp.sundayMajoration +
    emp.holidayMajoration +
    emp.nightMajoration +
    emp.overtimeMajoration

  return (
    <View style={s.employeeCard} wrap={false}>
      <View style={s.cardHeader}>
        <Text style={s.empName}>{emp.firstName} {emp.lastName}</Text>
        <Text style={s.contractBadge}>{emp.contractType}</Text>
      </View>
      <View style={s.cardGrid}>
        <View style={s.cardMetric}>
          <Text style={s.metricLabel}>Heures totales</Text>
          <Text style={s.metricValue}>{hrs(emp.totalHours)}</Text>
        </View>
        <View style={s.cardMetric}>
          <Text style={s.metricLabel}>Interventions</Text>
          <Text style={s.metricValue}>{emp.shiftsCount}</Text>
        </View>
        <View style={s.cardMetric}>
          <Text style={s.metricLabel}>Salaire de base</Text>
          <Text style={s.metricValue}>{euro(emp.basePay)}</Text>
        </View>
        <View style={s.cardMetric}>
          <Text style={s.metricLabel}>Majorations</Text>
          <Text style={s.metricValue}>{euro(totalMajorations)}</Text>
        </View>
      </View>
      <View style={s.cardTotal}>
        <Text style={s.cardTotalLabel}>Total brut</Text>
        <Text style={s.cardTotalAmount}>{euro(emp.totalGrossPay)}</Text>
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
    title: 'Reportez les heures et le salaire net de ce récapitulatif',
    desc: 'Pour chaque employé, renseignez le nombre d\u2019heures totales et le salaire net versé (hors congés payés si inclus).',
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
        Date limite de déclaration : avant le 15 du mois suivant la période d{'\u2019'}emploi.
        En cas de retard, des pénalités peuvent s{'\u2019'}appliquer.
        Les cotisations sont prélevées automatiquement sur votre compte bancaire environ 2 jours ouvrés après la déclaration.
      </Text>
    </View>
  )
}
