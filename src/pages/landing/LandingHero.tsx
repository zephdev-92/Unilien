import { track } from '@/lib/analytics/track'
import { ASSET } from './constants'
import { Check, Clock, Search, Bell, Grid, Calendar, Users, Chat, Book, Shield, FileDoc, BarChart } from './icons'

export function LandingHero() {
  return (
    <header className="hero">
      <div className="container">
        <div className="hero-badge">
          <span className="chip">Nouveau</span>
          Votre copilote conformité IDCC 3239, en temps réel
        </div>
        <h1 className="hero-title">L'emploi à domicile, <em>enfin serein.</em></h1>
        <p className="hero-sub">
          Unilien suit votre planning, vos heures et votre conformité
          pour que vous gardiez l'esprit libre et le temps qui compte.
          Un outil pensé avec et pour les personnes en situation de handicap et leurs proches.
        </p>
        <div className="hero-actions">
          <a
            href="/inscription"
            className="btn lg"
            onClick={() => track('CTA Signup Click', { location: 'hero' })}
          >
            Essayer gratuitement
          </a>
          <a href="#produit" className="btn ghost lg">Découvrir les fonctionnalités</a>
        </div>
        <div className="hero-fineprint">
          <span>30 jours offerts</span><span className="sep"></span>
          <span>Sans carte bancaire</span><span className="sep"></span>
          <span>Restez libre à tout moment</span>
        </div>
      </div>

      {/* Product showcase */}
      <div className="hero-stage">
        <div className="float-chip tl">
          <span className="fic" style={{ background: '#fff', color: 'var(--green-deep)' }}>
            <Check size={20} sw={2.2} />
          </span>
          <span style={{ textAlign: 'left' }}>
            <span className="big">100%</span>{' '}
            <span className="big">Conforme IDCC 3239</span>
          </span>
        </div>
        <div className="float-chip br">
          <span className="fic" style={{ background: 'var(--sky)', color: 'var(--slate)' }}>
            <Clock size={20} sw={2.2} />
          </span>
          <span>
            <span className="big">3 h / sem.</span>
            <span className="lbl">récupérées en moyenne</span>
          </span>
        </div>

        <div className="container-wide">
          <div className="device">
            <div className="device-bar">
              <div className="device-dots"><span></span><span></span><span></span></div>
              <div className="device-url">app.unilien.app/planning</div>
            </div>

            <div className="app-topbar">
              <div className="tb-left">
                <img className="tb-logo" src={`${ASSET}/logo-unilien.svg`} alt="Unilien" />
                <span className="tb-divider"></span>
                <span className="tb-title">Planning</span>
              </div>
              <div className="tb-right">
                <div className="tb-search">
                  <Search />
                  Rechercher…
                  <kbd>⌘K</kbd>
                </div>
                <span className="tb-ic"><Bell /></span>
                <span className="tb-avatar">SM</span>
              </div>
            </div>

            <div className="app-shell">
              <aside className="app-side">
                <div className="side-label">Principal</div>
                <div className="nav-item"><Grid /> Tableau de bord</div>
                <div className="nav-item active"><Calendar /> Planning</div>
                <div className="nav-item"><Users /> Équipe</div>
                <div className="nav-item"><Chat /> Messagerie</div>
                <div className="nav-item"><Book /> Cahier de liaison</div>
                <div className="side-label">Gestion</div>
                <div className="nav-item"><Shield size={24} sw={2} /> Conformité</div>
                <div className="nav-item"><FileDoc /> Documents</div>
                <div className="nav-item"><BarChart /> Analytique</div>
                <div className="side-spacer"></div>
                <div className="user-pill">
                  <span className="av">SM</span>
                  <div>
                    <div className="nm">Sophie Mercier</div>
                    <div className="rl">Employeur particulier</div>
                  </div>
                </div>
              </aside>

              <main className="app-main">
                <div className="app-head">
                  <div>
                    <h4>Planning de la semaine</h4>
                    <span className="date">Lun. 12 au dim. 18 mai 2026</span>
                  </div>
                  <span className="week-pill">Conforme</span>
                </div>
                <div className="sched">
                  <div className="slot ok">
                    <span className="time">08:00<br />12:00</span>
                    <span className="who">Marie L.<br /><small>Aide au lever · toilette · repas</small></span>
                    <span className="state">+ majoration dim.</span>
                  </div>
                  <div className="slot alert">
                    <span className="time">13:00<br />19:30</span>
                    <span className="who">Karim B.<br /><small>⚠ Pause 20 min manquante</small></span>
                    <span className="state">À corriger</span>
                  </div>
                  <div className="slot ok">
                    <span className="time">20:00<br />21:00</span>
                    <span className="who">Marie L.<br /><small>Aide au coucher</small></span>
                    <span className="state">Validé</span>
                  </div>
                </div>
                <div className="shield-toast">
                  <span className="ic"><Shield size={18} sw={2.1} /></span>
                  <span className="tx">
                    <b>Votre copilote a repéré une pause manquante.</b>
                    <small>Intervention de 6h30 → ajoutez 20 min de pause avant de valider.</small>
                  </span>
                  <span className="fix">Corriger</span>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
