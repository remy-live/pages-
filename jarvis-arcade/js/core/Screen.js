/* Contrat commun à tous les écrans et à tous les jeux.
 *
 * Le cycle de vie est volontairement minimal : entrer, mettre à jour,
 * dessiner, sortir. Un jeu est un écran comme un autre — c'est ce qui
 * permet au registre de les traiter sans cas particulier.
 *
 * `update` reçoit le contexte de l'application (curseur, audio, navigation),
 * `draw` reçoit l'interface en mode immédiat. La séparation n'est pas
 * décorative : elle laisse la porte ouverte à un pas de simulation fixe
 * pour les jeux à physique, sans toucher au rendu.
 */

export class Screen {
  constructor(app) {
    this.app = app;
    /** Renseigné par le registre pour les jeux. */
    this.id = this.constructor.id || this.constructor.name;
  }

  /** Appelé une fois à l'affichage. Peut être asynchrone (chargement). */
  async enter(_params = {}) {}

  /** @param {number} dt millisecondes écoulées depuis l'image précédente */
  update(_dt) {}

  /** @param {import('../ui/UI.js').UI} _ui */
  draw(_ui) {}

  /** Appelé une fois au retrait. Libérer ici timers, sons, objets 3D. */
  exit() {}
}
