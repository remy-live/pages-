/* L'assistant doit rester utilisable sur un téléphone réel : les boutons de
   navigation à portée de pouce, et rien de perdu si l'on ferme en cours de route. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();

/* Hauteurs réduites : c'est le cas d'un iPhone avec la barre d'outils affichée. */
const CIBLES = [
  ['iPhone SE', { ...devices['iPhone SE'] }],
  ['iPhone 13', { ...devices['iPhone 13'] }],
  ['iPhone 13, barre visible', { ...devices['iPhone 13'], viewport: { width: 390, height: 560 } }],
  ['très petit écran', { viewport: { width: 320, height: 480 }, isMobile: true, hasTouch: true }]
];

for (const [nom, opts] of CIBLES) {
  console.log(`\n=== ${nom} ===`);
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.route('**basemaps.cartocdn.com/**', r => r.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
  await page.click('.accueil-choix .principal');   // « Je débute » ouvre l'assistant
  await page.waitForTimeout(500);

  const visible = async () => page.evaluate(() => {
    const btn = document.getElementById('pas-suivant');
    const r = btn.getBoundingClientRect();
    return {
      dansLEcran: r.bottom <= window.innerHeight + 0.5 && r.top >= 0 && r.right <= window.innerWidth + 0.5,
      bas: Math.round(r.bottom), hauteurVue: window.innerHeight
    };
  });

  let v = await visible();
  verifier('bouton « Suivant » visible sans faire défiler', v.dansLEcran, `bas à ${v.bas}px pour ${v.hauteurVue}px de haut`);

  /* Et il doit le rester une fois l'étape parcourue jusqu'en bas. */
  await page.evaluate(() => { const m = document.querySelector('#assistant .modal-content'); m.scrollTop = m.scrollHeight; });
  await page.waitForTimeout(250);
  v = await visible();
  verifier('toujours visible en bas d\'étape', v.dansLEcran, `bas à ${v.bas}px`);

  /* Il doit être réellement cliquable là où il se trouve. */
  await page.click('#pas-suivant', { timeout: 5000 }).then(
    () => verifier('bouton cliquable', true),
    (e) => verifier('bouton cliquable', false, String(e).slice(0, 60)));
  await page.waitForTimeout(300);
  verifier('l\'étape a bien avancé',
    await page.evaluate(() => document.querySelector('.pas.actif').dataset.pas === '1'));

  verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

/* Saisie enregistrée à la volée, sans changer d'étape ni fermer. */
console.log('\n=== enregistrement à la volée ===');
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
await page.click('.accueil-choix .principal');
await page.waitForTimeout(400);
await page.selectOption('#a_corps', 'agrege');
await page.fill('#a_echelon', '9');
await page.waitForTimeout(300);

const memoire = await page.evaluate(() => JSON.parse(localStorage.getItem('mutation:bareme:v1') || '{}'));
verifier('réponses écrites en mémoire sans quitter l\'étape',
  memoire.corps === 'agrege' && memoire.echelon === '9', JSON.stringify({ corps: memoire.corps, echelon: memoire.echelon }));

/* On recharge sans jamais avoir cliqué sur « Suivant ». */
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
const apres = await page.evaluate(() => ({
  corps: document.getElementById('corps').value,
  echelon: document.getElementById('echelon').value,
  score: document.getElementById('score-display').textContent
}));
verifier('retrouvées après rechargement', apres.corps === 'agrege' && apres.echelon === '9',
  `${apres.corps}, échelon ${apres.echelon}, ${apres.score}`);
await ctx.close();

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
