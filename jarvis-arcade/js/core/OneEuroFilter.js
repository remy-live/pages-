/* Filtre « 1 € » (Casiez, Roussel & Vogel, CHI 2012).
 *
 * Pourquoi celui-ci plutôt qu'une moyenne glissante : sur un curseur piloté
 * à la main, lisser fort supprime le tremblement mais ajoute de la latence,
 * et lisser peu garde la réactivité mais laisse le curseur vibrer. Le 1 €
 * adapte sa coupure à la vitesse du geste — immobile il lisse beaucoup,
 * en mouvement il lâche presque tout. On gagne donc de la stabilité au repos
 * *sans* payer de retard quand la main se déplace.
 *
 * Réglage : minCutoff pilote la stabilité au repos (baisser = plus stable,
 * plus mou), beta pilote la réactivité (monter = suit mieux les gestes
 * rapides, laisse passer plus de tremblement).
 */

const TWO_PI = Math.PI * 2;

function smoothingFactor(dt, cutoff) {
  const tau = 1 / (TWO_PI * cutoff);
  return 1 / (1 + tau / dt);
}

class Scalar1Euro {
  constructor(minCutoff, beta, dCutoff) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = null;   // valeur filtrée précédente
    this.dx = 0;     // dérivée filtrée précédente
    this.t = null;   // horodatage précédent, en secondes
  }

  reset() {
    this.x = null;
    this.dx = 0;
    this.t = null;
  }

  filter(value, timestamp) {
    if (this.x === null) {
      this.x = value;
      this.t = timestamp;
      return value;
    }

    const dt = timestamp - this.t;
    this.t = timestamp;

    // Deux images au même horodatage, ou horloge qui recule : on ne peut
    // rien dériver, on renvoie l'état courant sans le corrompre.
    if (!(dt > 0)) return this.x;

    const dValue = (value - this.x) / dt;
    const aD = smoothingFactor(dt, this.dCutoff);
    this.dx += aD * (dValue - this.dx);

    // Le cœur du filtre : la coupure monte avec la vitesse du geste.
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    const a = smoothingFactor(dt, cutoff);
    this.x += a * (value - this.x);

    return this.x;
  }
}

/** Filtre 1 € appliqué à un point 2D, les deux axes partageant les réglages. */
export class OneEuroFilter2D {
  constructor({ minCutoff = 1.7, beta = 0.035, dCutoff = 1.0 } = {}) {
    this.fx = new Scalar1Euro(minCutoff, beta, dCutoff);
    this.fy = new Scalar1Euro(minCutoff, beta, dCutoff);
    this.out = { x: 0, y: 0 };
  }

  reset() {
    this.fx.reset();
    this.fy.reset();
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} timestamp en secondes
   * @returns {{x:number,y:number}} objet réutilisé — à copier si on le garde
   */
  filter(x, y, timestamp) {
    this.out.x = this.fx.filter(x, timestamp);
    this.out.y = this.fy.filter(y, timestamp);
    return this.out;
  }
}

export { Scalar1Euro };
