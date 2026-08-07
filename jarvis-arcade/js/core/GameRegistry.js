/* Catalogue des jeux de la borne.
 *
 * Un jeu se déclare ici avec une vignette et un chargeur paresseux. Le
 * module n'est importé qu'au lancement de la partie : le menu s'affiche
 * donc instantanément, même quand la borne comptera vingt jeux, et un jeu
 * qui embarque three.js ne pèse rien tant que personne n'y joue.
 *
 * Ajouter un jeu = un fichier dans js/games/ + une entrée dans ce tableau.
 */

/**
 * @typedef {object} GameEntry
 * @property {string}  id        identifiant stable (sert aux scores)
 * @property {string}  title     nom affiché dans le menu
 * @property {string}  tagline   une ligne de description
 * @property {string}  [badge]   pastille facultative : « nouveau », « 2 joueurs »…
 * @property {boolean} [needsHand] refuse le lancement sans suivi de main
 * @property {() => Promise<{default: typeof import('./Screen.js').Screen}>} load
 */

/** @type {GameEntry[]} */
export const GAMES = [
  {
    id: 'balloon-pop',
    title: 'Éclate-Ballons',
    tagline: 'Crève un maximum de ballons avant la fin du chrono',
    badge: 'démo',
    needsHand: false,
    load: () => import('../games/BalloonPop.js'),
  },
];

export function findGame(id) {
  return GAMES.find((game) => game.id === id) || null;
}

/** Charge et instancie un jeu. Le module est mis en cache par l'import(). */
export async function loadGame(id, app) {
  const entry = findGame(id);
  if (!entry) throw new Error(`Jeu inconnu : ${id}`);

  const module = await entry.load();
  const GameClass = module.default;
  if (!GameClass) throw new Error(`${id} n'exporte pas de classe par défaut.`);

  const instance = new GameClass(app);
  instance.id = entry.id;
  instance.entry = entry;
  return instance;
}
