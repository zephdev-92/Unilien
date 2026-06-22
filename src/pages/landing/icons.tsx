/* Icônes SVG de la landing v4, portées à l'identique depuis la maquette.
   Chaque icône accepte une taille (size) et une épaisseur de trait (sw). */
import type { ReactNode } from 'react'

function Svg({ size, sw, children }: { size: number; sw: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function Check({ size = 20, sw = 2.4 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

export function Clock({ size = 20, sw = 2.2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  )
}

export function Search({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  )
}

export function Bell({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  )
}

export function Grid({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </Svg>
  )
}

export function Calendar({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  )
}

export function Users({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  )
}

export function Chat({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  )
}

export function Book({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  )
}

export function Shield({ size = 22, sw = 1.9 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M12 2L4 6v6c0 5 3.5 9.4 8 10 4.5-.6 8-5 8-10V6l-8-4z" />
    </Svg>
  )
}

export function FileDoc({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </Svg>
  )
}

export function BarChart({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </Svg>
  )
}

export function ListDoc({ size = 22, sw = 1.9 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </Svg>
  )
}

export function Menu({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  )
}

export function Close({ size = 24, sw = 2 }: { size?: number; sw?: number }) {
  return (
    <Svg size={size} sw={sw}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  )
}
