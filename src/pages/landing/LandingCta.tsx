import { track } from '@/lib/analytics/track'

interface CtaAction {
  label: string
  href: string
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
            <a
              href={primary.href}
              className="btn green lg"
              onClick={trackLocation ? () => track('CTA Signup Click', { location: trackLocation }) : undefined}
            >
              {primary.label}
            </a>
            <a href={secondary.href} className="btn ghost lg" style={ghostStyle}>{secondary.label}</a>
          </div>
          {sign && <div className="sign">{sign}</div>}
        </div>
      </div>
    </section>
  )
}
