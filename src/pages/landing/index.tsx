import { useEffect, useRef } from 'react'
import './landing.css'
import { LandingNav } from './LandingNav'
import { LandingHero } from './LandingHero'
import { LandingLogos } from './LandingLogos'
import { LandingBento } from './LandingBento'
import { LandingCta } from './LandingCta'
import { LandingPersonas } from './LandingPersonas'
import { LandingTestimonials } from './LandingTestimonials'
import { LandingPricing } from './LandingPricing'
import { LandingHowItWorks } from './LandingHowItWorks'
import { LandingFaq } from './LandingFaq'
import { LandingFooter } from './LandingFooter'

/**
 * Landing v4 (moderne) — portée à l'identique depuis la maquette HTML.
 * Le markup est découpé en sections (Nav, Hero, Bento…), les styles sont
 * scopés sous `.landing-v4` dans landing.css, et les deux comportements JS
 * de la maquette (état "scrolled" de la nav + reveal à l'entrée du viewport)
 * sont reproduits dans le useEffect ci-dessous.
 */
export function LandingV4() {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // 1) Nav : bordure + fond dès qu'on scrolle
    const nav = root.querySelector<HTMLElement>('nav.top')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    onScroll()

    // 2) Reveal : apparition douce des sections quand elles entrent dans le viewport
    const revealables = root.querySelectorAll('section, .logos, .hero-stage')

    // Environnements sans IntersectionObserver (jsdom, anciens navigateurs) :
    // on affiche directement le contenu plutôt que de le laisser masqué.
    if (typeof IntersectionObserver === 'undefined') {
      revealables.forEach((el) => el.classList.add('reveal', 'in'))
      return () => window.removeEventListener('scroll', onScroll)
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 },
    )
    revealables.forEach((el) => {
      el.classList.add('reveal')
      io.observe(el)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
    }
  }, [])

  return (
    <div className="landing-v4" ref={rootRef}>
      <LandingNav />
      <LandingHero />
      <LandingLogos />
      <LandingBento />
      <LandingCta
        wide
        title="Reprenez votre dimanche."
        text="30 jours pour découvrir Unilien à votre rythme. Sans carte bancaire, sans engagement, en toute liberté."
        primary={{ label: 'Commencer gratuitement', href: '/inscription' }}
        secondary={{ label: 'Découvrir les fonctionnalités', href: '#produit' }}
        trackLocation="cta_mid"
      />
      <LandingPersonas />
      <LandingTestimonials />
      <LandingPricing />
      <LandingHowItWorks />
      <LandingFaq />
      <LandingCta
        title="Prêt à reprendre du temps ?"
        text="Essayez Unilien pendant 30 jours. Pas de carte bancaire, pas d'engagement : vous décidez ensuite."
        primary={{ label: 'Commencer gratuitement', href: '/inscription' }}
        secondary={{ label: 'En parler à un proche', href: '#' }}
        sign="Fait avec attention, pour les personnes en situation de handicap et celles qui les accompagnent."
        trackLocation="cta_banner"
      />
      <LandingFooter />
    </div>
  )
}

export default LandingV4
