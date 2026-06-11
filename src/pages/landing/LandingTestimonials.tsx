import { ASSET } from './constants'

export function LandingTestimonials() {
  return (
    <section className="testi">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Témoignages</span>
          <h2 className="sec-title">Pas des chiffres,<br />des <em>quotidiens.</em></h2>
          <p className="sec-sub">Tous ont retrouvé
            du temps avec Unilien.</p>
        </div>
        <div className="testi-grid">
          <div className="tcard">
            <p className="quote">« Pour la première fois, je sais que tout est juste et en règle. Quel soulagement. »</p>
            <div className="who">
              <img className="av" src={`${ASSET}/smile-delivery.jpg`} alt="Portrait de Sophie M." loading="lazy" decoding="async" />
              <div><div className="nm">Sophie M., 41 ans</div><div className="rl">Employeuse particulière, Lyon</div></div>
            </div>
          </div>
          <div className="tcard">
            <p className="quote">« Aujourd'hui ma déclaration Cesu tombe juste chaque mois. Je dors tranquille. »</p>
            <div className="who">
              <img className="av" src={`${ASSET}/friends-park.jpg`} alt="Portrait de Jean-Dominique M." loading="lazy" decoding="async" />
              <div><div className="nm">Jean-Dominique M., 38 ans</div><div className="rl">Bénéficiaire PCH, Paris</div></div>
            </div>
          </div>
          <div className="tcard">
            <p className="quote">« Je récupère mes dimanches. Tout se fait tout seul, je profite des miens. »</p>
            <div className="who">
              <img className="av" src={`${ASSET}/delivery-handoff.jpg`} alt="Portrait de Sébastien B." loading="lazy" decoding="async" />
              <div><div className="nm">Sébastien B., 35 ans</div><div className="rl">Accompagne sa femme, Paris</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
