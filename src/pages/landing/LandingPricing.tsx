import { track } from '@/lib/analytics/track'
import { Check, Shield } from './icons'

const noteStyle = {
  fontSize: '11.5px',
  fontWeight: 500,
  textAlign: 'left' as const,
  marginLeft: '3px',
  padding: 0,
}

export function LandingPricing() {
  return (
    <section id="tarifs">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Tarif unique</span>
          <h2 className="sec-title">Un seul prix. <em>Tout</em> compris.</h2>
          <p className="sec-sub">Un tarif clair, quel que soit le nombre d'auxiliaires.
            Aucune option cachée, sans engagement.</p>
        </div>
        <div className="price-layout">
          <div className="price-box">
            <div className="price-top">
              <div className="tier">Essentiel</div>
              <div className="price-amt"><span className="n">9,90</span><span className="u">€</span><span className="per">/ mois TTC</span></div>
              <div className="price-note">après 30 jours offerts · sans engagement</div>
            </div>
            <ul className="price-feats">
              <li><Check size={19} sw={2.4} /> Auxiliaires illimités</li>
              <li><Check size={19} sw={2.4} /> Copilote conformité IDCC 3239 inclus</li>
              <li><Check size={19} sw={2.4} /> Récap d'heures Cesu exportable, chaque mois</li>
              <li><Check size={19} sw={2.4} /> Cahier de liaison &amp; tableau PCH</li>
              <li><Check size={19} sw={2.4} /> Des réponses sous 24h <span style={noteStyle}>(* hors jours fériés et week-ends)</span></li>
            </ul>
            <div className="price-cta">
              <a
                href="/inscription"
                className="btn green lg"
                onClick={() => track('CTA Signup Click', { location: 'pricing' })}
              >
                Commencer gratuitement
              </a>
            </div>
          </div>

          <div className="roadmap">
            <div className="roadmap-head">
              <h3>Mises à jour</h3>
              <span className="rm-pill">Inclus dans l'abonnement</span>
            </div>
            <p>Déjà inclus dans
              votre abonnement, chaque nouveauté est déployée sans surcoût.</p>
            <ul className="timeline">
              <li className="tl-item done">
                <span className="node"><Check size={13} sw={3} /></span>
                <div className="when">Aujourd'hui</div>
                <h4>Copilote conformité &amp; récap des heures</h4>
                <p>17 règles IDCC 3239 connues par cœur, récap d'heures prêt pour votre déclaration Cesu.</p>
              </li>
              <li className="tl-item">
                <span className="node"></span>
                <div className="when">À venir · T3 2027</div>
                <h4>Rappels &amp; alertes par SMS</h4>
                <p>Un rappel avant chaque intervention, une alerte par SMS dès qu'un point mérite votre attention.</p>
              </li>
              <li className="tl-item">
                <span className="node"></span>
                <div className="when">À venir · T4 2027</div>
                <h4>Application mobile iOS &amp; Android</h4>
                <p>Cahier de liaison et planning dans votre poche, même hors-ligne.</p>
              </li>
              <li className="tl-item">
                <span className="node"></span>
                <div className="when">À venir · 2027</div>
                <h4>Assistant déclaratif PCH</h4>
                <p>Renseignement et justificatifs MDPH pré-remplis automatiquement.</p>
              </li>
            </ul>
            <div className="rm-foot">
              <Shield size={16} sw={2.2} />
              Une idée pour la suite ? Écrivez-nous, on lit tout.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
