/* La page de vérification doit produire un fichier réellement utilisable. */
import { chromium, devices } from 'playwright';
import { readFileSync } from 'fs';
const BASE = 'http://127.0.0.1:8765/mutation/verifier-bareme.html';
const REEL = JSON.parse(readFileSync('/home/user/pages-/mutation/data/bareme-intra-2026.json', 'utf8'));
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1280,height:950}, acceptDownloads:true });
const page = await ctx.newPage();
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
await page.goto(BASE, { waitUntil:'networkidle' });

const nbRegles = await page.locator('.regle').count();
verifier('toutes les règles sont présentées', nbRegles === 20, nbRegles + ' règles');
verifier('avancement à zéro au départ', (await page.textContent('#compte')).startsWith('0 /'));

// les valeurs affichées viennent bien du fichier
const mcs = await page.inputValue('#c-mesure_de_carte_scolaire\\.points');
verifier('les valeurs affichées sont celles du fichier',
  Number(mcs) === REEL.mesure_de_carte_scolaire.points, `carte scolaire = ${mcs}`);

// les deux trous connus sont signalés
const alertes = await page.locator('.regle h2:has-text("⚠️")').count();
verifier('les valeurs manquantes sont signalées', alertes === 2, alertes + ' règles en alerte');

// corriger une valeur
await page.fill('#c-mesure_de_carte_scolaire\\.points', '1600');
await page.waitForTimeout(150);
verifier('la valeur corrigée est mise en évidence',
  await page.locator('#c-mesure_de_carte_scolaire\\.points').evaluate(e => e.classList.contains('change')));
verifier('l\'ancienne valeur reste visible',
  /avant : 1500/.test(await page.textContent('#r-mcs')));

// le récapitulatif liste le changement
await page.click('.b-recap');
await page.waitForTimeout(200);
const recap = await page.textContent('#recap-corps');
verifier('le récapitulatif liste le changement', /1500/.test(recap) && /1600/.test(recap));

// cocher tout
await page.evaluate(() => {
  document.querySelectorAll('.pied input[type=checkbox]').forEach(c => { c.checked = true; c.dispatchEvent(new Event('change')); });
});
await page.fill('#r-mcs .ref input', 'LDG 2026, annexe 2, page 4');
await page.waitForTimeout(200);
verifier('avancement complet', (await page.textContent('#compte')).startsWith('20 / 20'));

// télécharger et relire le fichier produit
const dl = page.waitForEvent('download', { timeout: 15000 });
await page.click('.b-telecharger');
const fichier = await dl;
const produit = JSON.parse(readFileSync(await fichier.path(), 'utf8'));
verifier('le fichier produit s\'appelle bien comme l\'original', fichier.suggestedFilename() === 'bareme-intra-2026.json');
verifier('la correction est dans le fichier', produit.mesure_de_carte_scolaire.points === 1600);
verifier('la référence est rangée près de la règle',
  produit.mesure_de_carte_scolaire._reference === 'LDG 2026, annexe 2, page 4');
verifier('le fichier se déclare vérifié', produit.verifie_contre_les_ldg === true, JSON.stringify(produit.verifie_contre_les_ldg));
verifier('la date de vérification est portée', /^\d{4}-\d{2}-\d{2}$/.test(produit._verifie_le || ''), produit._verifie_le);
verifier('rien d\'autre n\'a bougé',
  JSON.stringify(produit.echelon) === JSON.stringify(REEL.echelon) &&
  produit.situation_familiale.separation.paliers[3].points === 600);

// vérification partielle : le fichier ne doit pas se déclarer vérifié
await page.evaluate(() => {
  const c = document.querySelectorAll('.pied input[type=checkbox]')[0];
  c.checked = false; c.dispatchEvent(new Event('change'));
});
const dl2 = page.waitForEvent('download', { timeout: 15000 });
await page.click('.b-telecharger');
const partiel = JSON.parse(readFileSync(await (await dl2).path(), 'utf8'));
verifier('une vérification partielle ne se déclare pas complète',
  partiel.verifie_contre_les_ldg === false && /19 règles sur 20/.test(partiel._verification_partielle || ''),
  partiel._verification_partielle);

// le travail survit au rechargement
await page.reload({ waitUntil:'networkidle' });
verifier('le travail est retrouvé au retour',
  (await page.inputValue('#c-mesure_de_carte_scolaire\\.points')) === '1600' &&
  (await page.textContent('#compte')).startsWith('19 / 20'));

// le fichier produit reste lisible par l'application
const bon = await page.evaluate(async () => {
  const r = await fetch('./data/bareme-intra-2026.json');
  const d = await r.json();
  return typeof d.echelon.classe_normale.base === 'number';
});
verifier('le barème servi reste intact sur le disque', bon);

verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

// et au téléphone
const ctxm = await b.newContext({ ...devices['iPhone 13'] });
const pm = await ctxm.newPage();
await pm.goto(BASE, { waitUntil:'networkidle' });
const debord = await pm.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
verifier('lisible au téléphone sans débordement', debord === 0, debord + 'px');
await ctxm.close();

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
