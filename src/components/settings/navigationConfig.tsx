/**
 * Configuration de la navigation latérale Paramètres :
 * types, sections, helpers de routing par hash.
 *
 * Fichier de config statique — pas de HMR utile (relance suffit).
 */
/* eslint-disable react-refresh/only-export-components */

import React from 'react'

export type PanelId =
  | 'profil'
  | 'securite'
  | 'abonnement'
  | 'notifications'
  | 'interventions'
  | 'convention'
  | 'pch'
  | 'apparence'
  | 'accessibilite'
  | 'donnees'

export interface NavItem {
  id: PanelId
  label: string
  icon: React.ReactNode
  roles?: string[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={16} height={16} aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  )
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Compte',
    items: [
      { id: 'profil', label: 'Informations', icon: <NavIcon><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></NavIcon> },
      { id: 'securite', label: 'Sécurité', icon: <NavIcon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></NavIcon> },
      { id: 'abonnement', label: 'Abonnement', icon: <NavIcon><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></NavIcon>, roles: ['employer'] },
    ],
  },
  {
    label: 'Application',
    items: [
      { id: 'notifications', label: 'Notifications', icon: <NavIcon><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /></NavIcon> },
      { id: 'interventions', label: 'Interventions', icon: <NavIcon><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></NavIcon>, roles: ['employer'] },
      { id: 'convention', label: 'Convention', icon: <NavIcon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></NavIcon>, roles: ['employer'] },
      { id: 'pch', label: 'PCH', icon: <NavIcon><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></NavIcon>, roles: ['caregiver'] },
      { id: 'apparence', label: 'Apparence', icon: <NavIcon><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></NavIcon> },
      { id: 'accessibilite', label: 'Accessibilité', icon: <NavIcon><circle cx="12" cy="7" r="4" /><path d="M1 21v-2a7 7 0 0114 0v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></NavIcon> },
    ],
  },
  {
    label: 'Avancé',
    items: [{ id: 'donnees', label: 'Données', icon: <NavIcon><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></NavIcon> }],
  },
]

const VALID_PANELS: PanelId[] = ['profil', 'securite', 'abonnement', 'notifications', 'convention', 'pch', 'apparence', 'accessibilite', 'donnees']

export function panelFromHash(): PanelId | null {
  const hash = window.location.hash.replace('#', '') as PanelId
  return VALID_PANELS.includes(hash) ? hash : null
}
