export function LandingHowItWorks() {
  return (
    <section className="how">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">En trois étapes</span>
          <h2 className="sec-title">Prêt en un <em>après-midi.</em></h2>
          <p className="sec-sub">Une mise en route simple. Vous renseignez vos interventions,
            le copilote vérifie, vous gagnez du temps.</p>
        </div>
        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <h3>Créez votre espace</h3>
            <p>Ajoutez vos auxiliaires et vos premières interventions, guidé pas à pas.
              Pas de fichier à préparer : l'interface vous accompagne du premier clic.</p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>Le copilote s'active</h3>
            <p>Unilien lit vos interventions et vous signale aussitôt les points
              à confirmer, sans jamais vous juger.</p>
          </div>
          <div className="step">
            <span className="num">3</span>
            <h3>Vous reprenez votre temps</h3>
            <p>Le copilote veille au quotidien. En moyenne, 3 heures rendues
              chaque semaine.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
