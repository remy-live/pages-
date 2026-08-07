/* Le détail d'un vœu s'ouvre dans sa carte, et la fenêtre ne doit jamais riper
   latéralement — c'est ce qui coupait le titre et rendait la lecture pénible. */
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
    document.getElementById('situation_familiale').value = 'RC';
    document.getElementById('separation').value = '2';
    updateUI(false); updateHeaderScore();
    const e = AppState.etablissementObjects.find(x => (x.groupes.GEO || []).length);
    addToWishlist('GEO', e.groupes.GEO[0].code, e.groupes.GEO[0].nom, 'Groupement', 49.9, 2.3);
    addToWishlist('ETB', e.Identifiant_de_l_etablissement, e.nom, e.ville, 49.9, 2.3);
    openWishlistModal();
  });
  await page.waitForTimeout(400);

  // --- aucune fenêtre par-dessus la fenêtre
  verifier('aucun détail ouvert au départ',
    await page.locator('.wish-detail:visible').count() === 0);

  await page.locator('.wish-deplier').first().click();
  await page.waitForTimeout(250);
  const ouvert = await page.evaluate(() => {
    const d = document.querySelector('.wish-item .wish-detail');
    return {
      visible: !d.hidden,
      texte: d.textContent,
      dansLaCarte: !!d.closest('.wish-item'),
      aria: document.querySelector('.wish-deplier').getAttribute('aria-expanded'),
      autreFenetre: getComputedStyle(document.getElementById('explication-modal')).display
    };
  });
  verifier('le détail s\'ouvre dans la carte', ouvert.visible && ouvert.dansLaCarte);
  verifier('sans ouvrir de seconde fenêtre', ouvert.autreFenetre === 'none');
  verifier('il explique les points', /Échelon/.test(ouvert.texte) && /Total pour ce vœu/.test(ouvert.texte));
  verifier('il signale ce qui est refusé sur ce type de vœu',
    /Rapprochement|refus/i.test(ouvert.texte), ouvert.texte.replace(/\s+/g,' ').slice(0, 90));
  verifier('l\'état est annoncé aux lecteurs d\'écran', ouvert.aria === 'true');

  // --- l'ouverture suit le vœu quand on réordonne
  await page.locator('.wish-descendre').first().click();
  await page.waitForTimeout(250);
  const apresOrdre = await page.evaluate(() => {
    const cartes = Array.from(document.querySelectorAll('.wish-item'));
    return {
      ouverte: cartes.findIndex(c => !c.querySelector('.wish-detail').hidden),
      types: cartes.map(c => c.className.match(/type-(\w+)/)[1]).join(',')
    };
  });
  verifier('le détail reste attaché à son vœu après réordonnancement',
    apresOrdre.ouverte === 1 && apresOrdre.types === 'ETB,GEO', `${apresOrdre.types}, ouverte en ${apresOrdre.ouverte}`);

  // --- refermer
  await page.locator('.wish-deplier').nth(1).click();
  await page.waitForTimeout(200);
  verifier('le détail se referme', await page.locator('.wish-detail:visible').count() === 0);

  // --- la fenêtre ne ripe pas
  const ripe = await page.evaluate(() => {
    const c = document.querySelector('#wishlist-modal .modal-content');
    c.scrollLeft = 400;                       // on essaie de la faire riper
    return { possible: c.scrollLeft, debord: c.scrollWidth - c.clientWidth,
             regle: getComputedStyle(c).overflowX };
  });
  verifier('la fenêtre ne peut pas riper latéralement',
    ripe.possible === 0 && ripe.regle === 'hidden', `scrollLeft=${ripe.possible}, overflow-x=${ripe.regle}`);
  verifier('et son contenu ne déborde pas', ripe.debord === 0, ripe.debord + 'px');

  // même détail ouvert
  await page.locator('.wish-deplier').first().click();
  await page.waitForTimeout(250);
  const ripe2 = await page.evaluate(() => {
    const c = document.querySelector('#wishlist-modal .modal-content');
    c.scrollLeft = 400;
    return { possible: c.scrollLeft, debord: c.scrollWidth - c.clientWidth };
  });
  verifier('même détail déplié, elle ne ripe pas', ripe2.possible === 0 && ripe2.debord === 0,
    `scrollLeft=${ripe2.possible}, débord ${ripe2.debord}px`);

  verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  await ctx.close();
}

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
