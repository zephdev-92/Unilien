/* eslint-disable react-refresh/only-export-components */
/**
 * Theme partagé et composants réutilisables pour @react-pdf/renderer.
 * Reproduit le design du prototype (navy/sage green).
 */
import React from 'react'
import { StyleSheet, View, Text, Svg, Path, Circle, Font } from '@react-pdf/renderer'

// ─── Police Inter (fichiers TTF locaux) ─────────────────────────────────────

import InterRegular from '@/assets/fonts/Inter-Regular.ttf'
import InterSemiBold from '@/assets/fonts/Inter-SemiBold.ttf'
import InterBold from '@/assets/fonts/Inter-Bold.ttf'

Font.register({
  family: 'Inter',
  fonts: [
    { src: InterRegular, fontWeight: 400 },
    { src: InterSemiBold, fontWeight: 600 },
    { src: InterBold, fontWeight: 700 },
  ],
})

// ─── Couleurs ───────────────────────────────────────────────────────────────

export const colors = {
  navy: '#3D5166',
  navyLight: '#5A6B7A',
  green: '#9BB23B',
  greenDark: '#3A5210',
  greenBg: '#EFF4DC',
  bg: '#FFFFFF',
  bgAlt: '#FAFBFC',
  bgSection: '#F3F6F9',
  border: '#D8E3ED',
  borderDark: '#C2D2E0',
  text: '#323538',
  textMuted: '#5A6B7A',
  red: '#991B1B',
  pchBg: '#F0F7FF',
  pchBorder: '#B4D4F0',
  pchInfo: '#E1EEFB',
  pchText: '#2A5F8F',
  warningBg: '#FFF9E6',
  warningBorder: '#E8D48A',
  warningText: '#8B6914',
  // Shift pills
  effectiveBg: '#DCFCE7',
  effectiveText: '#16A34A',
  presenceDayBg: '#FEF3C7',
  presenceDayText: '#D97706',
  presenceNightBg: '#E0E7FF',
  presenceNightText: '#6366F1',
  guardBg: '#FEE2E2',
  guardText: '#DC2626',
  absenceBg: '#F3F4F6',
  absenceText: '#9CA3AF',
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function euro(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u202F|\u00A0/g, ' ') + ' \u20AC'
}

export function hrs(n: number): string {
  if (n === 0) return '0h'
  const hours = Math.floor(Math.abs(n))
  const mins = Math.round((Math.abs(n) - hours) * 60)
  const sign = n < 0 ? '-' : ''
  if (mins === 0) return `${sign}${hours}h`
  return `${sign}${hours}h${mins < 10 ? '0' : ''}${mins}`
}

export function pct(r: number): string {
  return (r * 100).toFixed(2) + ' %'
}

export function formatDateTime(date: Date): string {
  return `${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

// ─── Styles de base ─────────────────────────────────────────────────────────

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontWeight: 400,
    fontSize: 11,
    color: colors.text,
    backgroundColor: colors.bg,
    paddingBottom: 36,
  },
  // Header
  header: {
    backgroundColor: colors.navy,
    color: 'white',
    padding: '20px 28px 16px',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    opacity: 0.85,
    marginTop: 2,
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 11,
    opacity: 0.7,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    border: '1px solid white',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
  },
  // Body
  body: {
    padding: '20px 28px 28px',
  },
  // Section title
  sectionTitle: {
    backgroundColor: colors.bgSection,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // Total row
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDF1F5',
    border: `1px solid ${colors.borderDark}`,
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.navy,
    textTransform: 'uppercase',
  },
  totalAmount: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.navy,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '10px 28px',
    borderTop: `1px solid ${colors.border}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 9,
    color: colors.textMuted,
  },
  footerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    fontWeight: 700,
    color: colors.navy,
  },
  footerLegal: {
    textAlign: 'center',
    flex: 1,
  },
  footerPage: {
    fontWeight: 700,
  },
})

// ─── Table styles ───────────────────────────────────────────────────────────

export const tableStyles = StyleSheet.create({
  table: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.navy,
  },
  headerCell: {
    padding: '6px 10px',
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  row: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
  },
  rowAlt: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    backgroundColor: colors.bgAlt,
  },
  cell: {
    padding: '6px 10px',
    fontSize: 11,
  },
  cellRight: {
    padding: '6px 10px',
    fontSize: 11,
    textAlign: 'right',
  },
})

// ─── Composants réutilisables ───────────────────────────────────────────────

/** Logo Unilien (version couleur, footer) */
export function LogoSmall() {
  return (
    <Svg viewBox="0 0 124 124" style={{ width: 22, height: 22 }}>
      <Path
        fill={colors.green}
        d="M56.164,0.38c15.758-2.037,33.372,4.31,45.586,14.358c25.706,21.147,29.971,61.468,7.584,87.136c-10.843,12.668-26.304,20.471-42.935,21.668c-16.862,1.152-33.479-4.521-46.114-15.746C8.182,96.857,0.918,81.56,0.088,65.267c-0.906-18.178,5.17-32.665,17.137-45.996c1.579,1.506,5.807,5.064,6.174,7.078c0.091,0.506-0.567,1.138-0.949,1.648c-4.432,4.621-8.734,13.189-10.599,19.305c-4.098,13.08-2.722,27.262,3.813,39.31c6.683,12.213,17.907,21.302,31.243,25.298c13.961,4.18,27.582,2.692,40.413-4.281c12.101-6.551,21.07-17.678,24.903-30.894c3.87-13.698,2.138-28.374-4.817-40.794c-6.928-12.07-18.364-20.895-31.794-24.54c-16.813-4.583-29.603-0.512-43.977,7.711c-1.813-2.017-4.238-5.386-5.902-7.575C35.591,4.852,44.586,1.959,56.164,0.38z"
      />
      <Path
        fill={colors.navy}
        d="M42.15,37.391c5.063-0.677,10.355,1.435,14.828,3.487c-3.481,2.65-5.305,4.588-8.014,8.024c-10.284-2.526-18.64,1.408-19.4,13.253c-0.226,3.506,1.51,7.536,4.024,10.04c2.806,2.767,6.623,4.263,10.562,4.138c11.099-0.248,21.406-13.686,28.934-21.531c0.657,1.802,1.467,3.756,2.173,5.55l0.025,0.147c0.075,0.396,0.144,0.793,0.208,1.19c1.028,6.554-4.269,9.54-7.961,13.663c-9.592,10.712-26.794,16.322-39.354,6.432c-5.1-4.021-8.389-9.906-9.142-16.357C17.299,50.257,27.257,39.064,42.15,37.391z"
      />
      <Path
        fill={colors.green}
        opacity={0.7}
        d="M49.842,69.445c-2.328-4.458-2.888-9.084,0.093-13.503c5.076-7.305,13.667-15.378,22.574-17.451c15.857-3.691,28.557,3.549,32.406,19.279c-4.296-0.878-7.035-1.309-10.627,1.646c-1.425-5.971-5.203-10.324-11.557-11.265c-11.761-1.739-18.488,8.466-25.974,15.479c-2.101,1.967-4.151,3.799-6.506,5.519L49.842,69.445z"
      />
      <Path
        fill={colors.navy}
        opacity={0.8}
        d="M94.288,59.417c3.592-2.955,6.331-2.524,10.627-1.646c1.127,6.508-0.406,13.197-4.256,18.564c-7.63,10.725-22.528,13.693-33.592,6.592c3.462-2.768,5.293-4.412,8.366-7.575c8.776,2.071,16.142-0.618,18.756-10.378C94.658,63.222,94.425,61.233,94.288,59.417z"
      />
    </Svg>
  )
}

/** Logo Unilien (version header, blanc/vert) */
export function LogoHeader() {
  return (
    <Svg viewBox="0 0 124 124" style={{ width: 40, height: 40 }}>
      <Path
        fill={colors.green}
        d="M56.164,0.38c15.758-2.037,33.372,4.31,45.586,14.358c25.706,21.147,29.971,61.468,7.584,87.136c-10.843,12.668-26.304,20.471-42.935,21.668c-16.862,1.152-33.479-4.521-46.114-15.746C8.182,96.857,0.918,81.56,0.088,65.267c-0.906-18.178,5.17-32.665,17.137-45.996c1.579,1.506,5.807,5.064,6.174,7.078c0.091,0.506-0.567,1.138-0.949,1.648c-4.432,4.621-8.734,13.189-10.599,19.305c-4.098,13.08-2.722,27.262,3.813,39.31c6.683,12.213,17.907,21.302,31.243,25.298c13.961,4.18,27.582,2.692,40.413-4.281c12.101-6.551,21.07-17.678,24.903-30.894c3.87-13.698,2.138-28.374-4.817-40.794c-6.928-12.07-18.364-20.895-31.794-24.54c-16.813-4.583-29.603-0.512-43.977,7.711c-1.813-2.017-4.238-5.386-5.902-7.575C35.591,4.852,44.586,1.959,56.164,0.38z"
      />
      <Path
        fill="white"
        d="M42.15,37.391c5.063-0.677,10.355,1.435,14.828,3.487c-3.481,2.65-5.305,4.588-8.014,8.024c-10.284-2.526-18.64,1.408-19.4,13.253c-0.226,3.506,1.51,7.536,4.024,10.04c2.806,2.767,6.623,4.263,10.562,4.138c11.099-0.248,21.406-13.686,28.934-21.531c0.657,1.802,1.467,3.756,2.173,5.55l0.025,0.147c0.075,0.396,0.144,0.793,0.208,1.19c1.028,6.554-4.269,9.54-7.961,13.663c-9.592,10.712-26.794,16.322-39.354,6.432c-5.1-4.021-8.389-9.906-9.142-16.357C17.299,50.257,27.257,39.064,42.15,37.391z"
      />
      <Path
        fill={colors.green}
        opacity={0.7}
        d="M49.842,69.445c-2.328-4.458-2.888-9.084,0.093-13.503c5.076-7.305,13.667-15.378,22.574-17.451c15.857-3.691,28.557,3.549,32.406,19.279c-4.296-0.878-7.035-1.309-10.627,1.646c-1.425-5.971-5.203-10.324-11.557-11.265c-11.761-1.739-18.488,8.466-25.974,15.479c-2.101,1.967-4.151,3.799-6.506,5.519L49.842,69.445z"
      />
      <Path
        fill="white"
        opacity={0.8}
        d="M94.288,59.417c3.592-2.955,6.331-2.524,10.627-1.646c1.127,6.508-0.406,13.197-4.256,18.564c-7.63,10.725-22.528,13.693-33.592,6.592c3.462-2.768,5.293-4.412,8.366-7.575c8.776,2.071,16.142-0.618,18.756-10.378C94.658,63.222,94.425,61.233,94.288,59.417z"
      />
    </Svg>
  )
}

/** Header PDF commun */
export function PdfHeader({ title, subtitle, rightText, badge }: {
  title: string
  subtitle: string
  rightText: string
  badge?: string
}) {
  return (
    <View style={baseStyles.header}>
      <View style={baseStyles.headerLeft}>
        <LogoHeader />
        <View>
          <Text style={baseStyles.headerTitle}>{title}</Text>
          <Text style={baseStyles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {badge && (
          <Text style={baseStyles.headerBadge}>{badge}</Text>
        )}
        <Text style={[baseStyles.headerRight, { marginTop: 4, fontSize: 9 }]}>{rightText}</Text>
      </View>
    </View>
  )
}

/** Footer PDF commun */
export function PdfFooter({ legal, page }: { legal: string; page: string }) {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerBrand}>
        <LogoSmall />
        <Text>Généré par Unilien</Text>
      </View>
      <Text style={baseStyles.footerLegal}>{legal}</Text>
      <Text style={baseStyles.footerPage}>{page}</Text>
    </View>
  )
}

/** Ligne de total (label + montant) */
export function TotalRow({ label, amount }: { label: string; amount: string }) {
  return (
    <View style={baseStyles.totalRow}>
      <Text style={baseStyles.totalLabel}>{label}</Text>
      <Text style={baseStyles.totalAmount}>{amount}</Text>
    </View>
  )
}

/** Titre de section */
export function SectionTitle({ children }: { children: string }) {
  return <Text style={baseStyles.sectionTitle}>{children}</Text>
}

/** Tableau générique */
export function PdfTable({ headers, widths, rows }: {
  headers: string[]
  widths: string[]
  rows: { cells: string[]; highlighted?: boolean }[]
}) {
  return (
    <View style={tableStyles.table}>
      <View style={tableStyles.headerRow}>
        {headers.map((h, i) => (
          <Text
            key={i}
            style={[
              tableStyles.headerCell,
              { width: widths[i] },
              i > 0 && { textAlign: 'right' },
            ]}
          >
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={ri % 2 === 1 ? tableStyles.rowAlt : tableStyles.row}>
          {row.cells.map((cell, ci) => (
            <Text
              key={ci}
              style={[
                ci === 0 ? tableStyles.cell : tableStyles.cellRight,
                { width: widths[ci] },
                row.highlighted && { color: colors.warningText, fontStyle: 'italic' },
              ]}
            >
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

/** Icone info (cercle + i) */
export function InfoIcon({ size = 14, color = colors.warningText }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M12 8 L12 8.01" stroke={color} strokeWidth={2} />
      <Path d="M12 12 L12 16" stroke={color} strokeWidth={2} />
    </Svg>
  )
}
