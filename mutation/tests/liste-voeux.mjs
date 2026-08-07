/* La carte de vœu doit rester lisible : rien qui se coupe, rien qui déborde,
   et les quatre actions du bilan atteignables sans faire défiler. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();

for (const [nom, opts] of [['iPhone SE', devices['iPhone SE']], ['iPhone 13', devices['iPhone 13']],
                           ['ordinateur', { viewport:{width:1440,height:900} }]]) {
  console.log(`\n=== ${nom} ===`);
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  await page.route('**basemaps.cartocdn.com/**', r => r.abort());
  await page.goto(BASE, { waitUntil:'load' });
  await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
  await page.click('#accueil .accueil-choix button:nth-child(2)');

  await page.evaluate(() => {
    const e = AppState.etablissementObjects.find(x => (x.groupes.GEO || []).length && (x.groupes.COM || []).length);
    addToWishlist('GEO', e.groupes.GEO[0].code, e.groupes.GEO[0].nom, 'Groupement', 49.9, 2.3);
    addToWishlist('ETB', e.Identifiant_de_l_etablissement, e.nom, e.ville, 49.9, 2.3);
    addToWishlist('COM', e.groupes.COM[0].code, e.groupes.COM[0].nom, 'Commune', 49.9, 2.3);
    openWishlistModal();
  });
  await page.waitForTimeout(400);

  const r = await page.evaluate(() => {
    const contenu = document.querySelector('#wishlist-modal .modal-content');
    const cartes = Array.from(document.querySelectorAll('.wish-item'));
    const coupes = [];
    cartes.forEach(c => {
      const pts = c.querySelector('.wish-points');
      /* Un « 35 pts » sur deux lignes fait plus haut que sa ligne de texte. */
      if (pts.getBoundingClientRect().height > parseFloat(getComputedStyle(pts).fontSize) * 1.6) coupes.push(pts.textContent);
      if (c.scrollWidth - c.clientWidth > 1) coupes.push('débordement ' + c.querySelector('.wish-name').textContent);
    });
    const pied = document.querySelector('.bilan-actions').getBoundingClientRect();
    return {
      cartes: cartes.length, coupes,
      metas: cartes.map(c => c.querySelector('.wish-meta').textContent),
      piedVisible: pied.bottom <= window.innerHeight + 1 && pied.top >= 0,
      boutonsPied: document.querySelectorAll('.bilan-actions .btn-action').length,
      debordModale: contenu.scrollWidth - contenu.clientWidth
    };
  });

  verifier('trois vœux affichés', r.cartes === 3);
  verifier('rien ne se coupe ni ne déborde', r.coupes.length === 0, r.coupes.join(' | '));
  verifier('les libellés sont écrits correctement',
    r.metas.some(m => m.startsWith('Établissement')) && r.metas.some(m => m.startsWith('Groupement')),
    r.metas.join(' / '));
  verifier('les cinq actions restent visibles sans défiler', r.piedVisible && r.boutonsPied === 5,
    `${r.boutonsPied} boutons, pied ${r.piedVisible ? 'visible' : 'hors écran'}`);
  verifier('pas de débordement horizontal dans la fenêtre', r.debordModale === 0, r.debordModale + 'px');

  /* Les flèches restent utilisables au doigt. */
  const cible = await page.locator('.wish-descendre').first();
  const boite = await cible.boundingBox();
  verifier('les flèches sont assez grandes pour le doigt', boite.width >= 32 && boite.height >= 30,
    `${Math.round(boite.width)}×${Math.round(boite.height)}px`);
  await cible.click();
  await page.waitForTimeout(200);
  verifier('la flèche réordonne toujours',
    (await page.evaluate(() => AppState.wishlist.map(w => w.type).join(','))) === 'ETB,GEO,COM');

  verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
