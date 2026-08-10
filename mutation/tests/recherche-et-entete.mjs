/* La recherche doit trouver les zones autant que les établissements, et
   l'en-tête ne doit pas se réorganiser quand le barème gagne des chiffres. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();

console.log('=== recherche ===');
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
const page = await ctx.newPage();
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.goto(BASE, { waitUntil:'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
await page.click('#accueil .accueil-choix button:nth-child(2)');

const chercher = async (q) => {
  await page.fill('#etab-search', q);
  await page.waitForTimeout(300);
  return page.evaluate(() => Array.from(document.querySelectorAll('.sr-item')).map(el => ({
    nom: el.querySelector('b').textContent,
    genre: (el.querySelector('.sr-genre') || {}).textContent || ''
  })));
};

const laon = await chercher('laon');
verifier('« laon » propose la commune elle-même',
  laon.some(r => r.genre === 'Commune' && /LAON/i.test(r.nom)), laon.slice(0,3).map(r=>`${r.nom} [${r.genre}]`).join(' | '));
verifier('et le groupement qui la contient', laon.some(r => r.genre === 'Groupement'));
verifier('et toujours les établissements', laon.some(r => r.genre === 'Établissement'));
verifier('les zones passent avant les établissements',
  laon.findIndex(r => r.genre !== 'Établissement') < laon.findIndex(r => r.genre === 'Établissement'));

const zr = await chercher('ZR');
verifier('les zones de remplacement sont cherchables',
  zr.some(r => r.genre === 'Zone de remplacement'), zr.slice(0,2).map(r=>`${r.nom} [${r.genre}]`).join(' | '));

verifier('rien trouvé se dit clairement',
  /ni établissement ni commune/.test(await (async () => { await chercher('zzzzzz'); return page.textContent('#search-results'); })()));

// cliquer une commune depuis le mode Groupements doit changer de mode et y aller
await page.evaluate(() => { document.getElementById('mode_geo').checked = true; switchMode('GEO'); });
await chercher('laon');
const avant = await page.evaluate(() => AppState.map.getZoom());
await page.evaluate(() => {
  const item = Array.from(document.querySelectorAll('.sr-item'))
    .find(el => el.querySelector('.sr-genre').textContent === 'Commune');
  item.click();
});
await page.waitForTimeout(900);
const apres = await page.evaluate(() => ({
  mode: AppState.currentMode, zoom: AppState.map.getZoom(),
  popup: !!document.querySelector('.leaflet-popup')
}));
verifier('choisir une commune bascule en mode Communes', apres.mode === 'COM', apres.mode);
verifier('et la carte s\'y rend', apres.zoom > avant, `zoom ${avant} → ${apres.zoom}`);
verifier('avec sa bulle « Ajouter ce vœu » ouverte', apres.popup);

verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
await ctx.close();

console.log('\n=== en-tête selon le barème ===');
for (const [nom, opts] of [['iPhone SE', devices['iPhone SE']], ['iPhone 13', devices['iPhone 13']]]) {
  const c = await b.newContext(opts);
  const p = await c.newPage();
  await p.route('**basemaps.cartocdn.com/**', r => r.abort());
  await p.goto(BASE, { waitUntil:'load' });
  await p.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
  await p.click('#accueil .accueil-choix button:nth-child(2)');

  const mesures = [];
  for (const v of ['0', '35', '485', '1535', '3179.2']) {
    await p.evaluate(x => { document.getElementById('score-display').textContent = x + ' pts'; }, v);
    await p.waitForTimeout(150);
    mesures.push(await p.evaluate(() => ({
      entete: Math.round(document.querySelector('header').getBoundingClientRect().height),
      debord: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      titreCoupe: (() => { const t = document.querySelector('.header-title'); return t.scrollWidth > t.clientWidth + 1; })()
    })));
  }
  const hauteurs = mesures.map(m => m.entete);
  verifier(`${nom} : l'en-tête garde la même hauteur`, new Set(hauteurs).size === 1, hauteurs.join(' / ') + ' px');
  verifier(`${nom} : aucun débordement`, mesures.every(m => m.debord === 0));
  await c.close();
}

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
