import { Shield, Calendar, ListDoc, BarChart } from './icons'
import { ASSET } from './constants'

export function LandingBento() {
  return (
    <section id="produit">
      <div className="container-wide">
        <div className="sec-head">
          <span className="eyebrow">La plateforme</span>
          <h2 className="sec-title">Tout l'emploi à domicile,<br /><em>réuni au même endroit.</em></h2>
          <p className="sec-sub">Vos outils se parlent enfin. Le planning nourrit le récap d'heures,
            le récap alimente le tableau PCH. Le copilote surveille l'ensemble.</p>
        </div>

        <div className="bento">
          <div className="cell dark span-3 row-2" id="copilote">
            <span className="ico"><Shield size={22} sw={1.9} /></span>
            <h3>Le copilote conformité</h3>
            <p>Il connaît les 17 règles de la convention IDCC 3239 par cœur et vous
              guide pas à pas. Vous avancez l'esprit tranquille.</p>
            <div className="mini-list">
              <div className="ml"><span className="dot r"></span>Repos 11 h non respecté <span className="tag">Bloqué</span></div>
              <div className="ml"><span className="dot r"></span>Pause 20 min oubliée <span className="tag">Alerte</span></div>
              <div className="ml"><span className="dot g"></span>Majorations dimanche +50 % <span className="tag">Auto</span></div>
              <div className="ml"><span className="dot g"></span>Amplitude max 13 h <span className="tag">OK</span></div>
            </div>
          </div>

          <div className="cell span-3">
            <span className="ico"><Calendar size={22} sw={1.9} /></span>
            <h3>Planning intelligent</h3>
            <p>Glissez vos interventions : Unilien tient votre planning à jour
              et vous prévient dès qu'un créneau mérite votre attention.</p>
          </div>

          <div className="cell span-3">
            <span className="ico"><ListDoc size={22} sw={1.9} /></span>
            <h3>Récap des heures Cesu</h3>
            <p>Chaque mois, le total d'heures et les majorations sont calculés
              pour vous. Un récapitulatif clair, prêt pour votre déclaration Cesu.</p>
          </div>

          <div className="cell photo span-2">
            <img src={`${ASSET}/smile-delivery.jpg`} alt="" loading="lazy" decoding="async" />
            <div className="ovl">
              <h3>Cahier de liaison</h3>
              <p>Partagez l'essentiel avec vos proches.</p>
            </div>
          </div>

          <div className="cell span-2">
            <div className="bignum" style={{ color: 'var(--slate)' }}>+40%</div>
            <h3 style={{ fontSize: '17px' }}>de temps retrouvé</h3>
            <p>Dès le premier mois, les tâches administratives se font toutes seules. Vos soirées vous reviennent.</p>
          </div>

          <div className="cell span-2">
            <span className="ico"><BarChart size={22} sw={1.9} /></span>
            <h3>Tableau PCH</h3>
            <p>Heures consommées, reste à utiliser, export MDPH : tout est clair, d'un coup d'œil.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
