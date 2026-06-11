export function LandingFaq() {
  return (
    <section className="faq" id="faq">
      <div className="container">
        <div className="sec-head">
          <span className="eyebrow">Questions fréquentes</span>
          <h2 className="sec-title">Tout ce que vous<br />voulez <em>savoir.</em></h2>
        </div>
        <div className="faq-list">
          <details className="q" open>
            <summary>Qu'est-ce que la convention IDCC 3239 ? <span className="pm">+</span></summary>
            <div className="a">C'est la convention collective qui encadre l'emploi à
              domicile depuis 2022. Elle pose 17 repères clairs : durées de travail,
              majorations, congés, indemnités. Unilien les connaît et veille pour
              vous, en temps réel.</div>
          </details>
          <details className="q">
            <summary>Comment fonctionne le copilote conformité ? <span className="pm">+</span></summary>
            <div className="a">À chaque création ou modification d'intervention, Unilien
              vérifie en arrière-plan toutes les règles de la convention. Une
              violation grave bloque la validation ; une alerte mineure prévient sans
              bloquer. Les majorations sont calculées automatiquement.</div>
          </details>
          <details className="q">
            <summary>L'application est-elle vraiment accessible ? <span className="pm">+</span></summary>
            <div className="a">Conçue avec et pour des personnes en situation de handicap :
              conforme WCAG 2.1 AA, compatible lecteurs d'écran, navigation clavier
              intégrale, contraste élevé et taille de texte ajustable.</div>
          </details>
          <details className="q">
            <summary>Comment se passe la mise en route ? <span className="pm">+</span></summary>
            <div className="a">En quelques minutes : vous créez votre espace, ajoutez vos
              auxiliaires et vos interventions, guidé pas à pas. Aucun fichier à importer
              ni configuration technique. Le support reste joignable si vous avez
              la moindre question.</div>
          </details>
          <details className="q">
            <summary>Mes données sont-elles bien protégées ? <span className="pm">+</span></summary>
            <div className="a">Hébergement en France, chiffrement en transit et au repos,
              sauvegardes quotidiennes, conformité RGPD complète. Export et suppression
              possibles à tout moment, en un clic.</div>
          </details>
        </div>
      </div>
    </section>
  )
}
