import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { track } from '@/lib/analytics/track'

interface CtaAction {
  label: string
  href: string
}

/**
 * Route interne (commence par "/") → navigation SPA via <Link>.
 * Ancre (#…) ou lien externe → <a> classique.
 */
function CtaLink({
  href,
  className,
  style,
  onClick,
  children,
}: {
  href: string
  className: string
  style?: React.CSSProperties
  onClick?: () => void
  children: ReactNode
}) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className} style={style} onClick={onClick}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} className={className} style={style} onClick={onClick}>
      {children}
    </a>
  )
}

interface LandingCtaProps {
  /** container-wide (CTA intermédiaire) vs container (CTA final) */
  wide?: boolean
  title: string
  text: string
  primary: CtaAction
  secondary: CtaAction
  sign?: string
  /** Si défini, le bouton primaire émet l'event KPI « CTA Signup Click ». */
  trackLocation?: string
}

const ghostStyle = { boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.3)', color: '#fff' }

export function LandingCta({ wide, title, text, primary, secondary, sign, trackLocation }: LandingCtaProps) {
  return (
    <section className="cta-final">
      <div className={wide ? 'container-wide' : 'container'}>
        <div className="cta-card">
          <h2>{title}</h2>
          <p>{text}</p>
          <div className="actions">
            <CtaLink
              href={primary.href}
              className="btn green lg"
              onClick={trackLocation ? () => track('CTA Signup Click', { location: trackLocation }) : undefined}
            >
              {primary.label}
            </CtaLink>
            <CtaLink href={secondary.href} className="btn ghost lg" style={ghostStyle}>{secondary.label}</CtaLink>
          </div>
          {sign && <div className="sign">{sign}</div>}
        </div>
      </div>
    </section>
  )
}
