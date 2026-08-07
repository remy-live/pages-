/* Sur tablette, la carte doit rester l'élément principal, et les filtres
   d'éducation prioritaire doivent réellement filtrer. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();

async function ouvrir(opts) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.route('**basemaps.cartocdn.com/**', r => r.abort());
  await page.goto(BASE, { waitUntil:'load' });
  await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
  await page.click('#accueil .accueil-choix button:nth-child(2)');
  return { ctx, page };
}

console.log('=== place de la carte ===');
for (const [l, h, attendu] of [[834,1112,0.9],[1024,768,0.9],[1180,820,0.9],[1280,800,0.9],[1440,900,0.5]]) {
  const { ctx, page } = await ouvrir({ viewport:{width:l,height:h} });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => ({
    carte: Math.round(document.getElementById('map').getBoundingClientRect().width),
    ancres: document.querySelectorAll('.sidebar:not(.collapsed)').length,
    debord: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  verifier(`${l}px : la carte occupe l'essentiel`, r.carte >= l * attendu,
    `${r.carte}px sur ${l} (${Math.round(100*r.carte/l)}%), ${r.ancres} panneaux ancrés`);
  verifier(`${l}px : pas de débordement`, r.debord === 0, r.debord + 'px');
  await ctx.close();
}

console.log('\n=== filtres éducation prioritaire ===');
const { ctx, page } = await ouvrir({ viewport:{width:1440,height:900} });
const compte = () => page.evaluate(() => AppState.layers.etablissements.getLayers().length);
const repartition = await page.evaluate(() => {
  let repPlus = 0, rep = 0, hors = 0;
  AppState.etablissementObjects.forEach(e => {
    const ep = e.educationPrioritaire || '';
    if (ep.includes('REP+')) repPlus++; else if (ep.includes('REP')) rep++; else hors++;
  });
  return { repPlus, rep, hors, total: AppState.etablissementObjects.length };
});
console.log(`  base : ${repartition.repPlus} REP+, ${repartition.rep} REP, ${repartition.hors} hors EP`);
verifier('la base contient bien des REP+ et des REP', repartition.repPlus > 0 && repartition.rep > 0);

const tous = await compte();
verifier('tout est affiché au départ', tous === repartition.total, `${tous}`);

await page.uncheck('#chk_ep_repplus');
await page.waitForTimeout(200);
verifier('décocher REP+ retire exactement les REP+', await compte() === tous - repartition.repPlus,
  `${await compte()} au lieu de ${tous - repartition.repPlus}`);

await page.uncheck('#chk_ep_rep');
await page.waitForTimeout(200);
verifier('décocher REP retire aussi les REP', await compte() === repartition.hors, `${await compte()}`);

await page.uncheck('#chk_ep_hors');
await page.waitForTimeout(200);
verifier('tout décocher ne laisse rien', await compte() === 0);
verifier('et le compteur le dit', /Aucun/.test(await page.textContent('#compteur-visibles')));

await page.check('#chk_ep_repplus');
await page.waitForTimeout(200);
verifier('ne garder que les REP+ fonctionne', await compte() === repartition.repPlus, `${await compte()}`);

verifier('le malentendu est prévenu sur place',
  /masque ces établissements de la carte/.test(await page.textContent('.avertissement-filtre')));

// persistance
await page.reload({ waitUntil:'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
const etat = await page.evaluate(() => ({
  repPlus: document.getElementById('chk_ep_repplus').checked,
  rep: document.getElementById('chk_ep_rep').checked,
  hors: document.getElementById('chk_ep_hors').checked
}));
verifier('les filtres sont retrouvés au retour',
  etat.repPlus === true && etat.rep === false && etat.hors === false, JSON.stringify(etat));
await ctx.close();

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
