/* Prouve que le fichier pilote réellement le calcul : on sert un barème modifié
   et le total doit bouger d'exactement ce qu'on a changé. */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const BASE = 'http://127.0.0.1:8765/mutation/';
const REEL = JSON.parse(readFileSync(new URL('../data/bareme-intra-2026.json', import.meta.url), 'utf8'));
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };

const b = await chromium.launch();

async function totalAvec(bareme) {
  const ctx = await b.newContext({ viewport:{width:1280,height:900} });
  const page = await ctx.newPage();
  await page.route('**basemaps.cartocdn.com/**', r => r.abort());
  if (bareme) {
    await page.route('**/data/bareme-intra-2026.json', r =>
      r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(bareme) }));
  }
  await page.goto(BASE, { waitUntil:'load' });
  await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout:25000 });
  const t = await page.evaluate(() => {
    document.getElementById('classe').value = 'normale';
    document.getElementById('echelon').value = '5';
    document.getElementById('anc_poste').value = '0';
    document.getElementById('situation_familiale').value = '';
    document.getElementById('type_stagiaire').value = '';
    document.getElementById('anc_tzr').value = '0';
    document.getElementById('voeu_pref').value = '0';
    ['est_rqth','est_mcs','sortie_rep'].forEach(i => document.getElementById(i).checked = false);
    return calculateBreakdown(null, 'GEO').total;
  });
  await ctx.close();
  return t;
}

const reference = await totalAvec(null);
// échelon 5, classe normale : base + pas*4
verifier('total de référence cohérent avec le fichier',
  reference === REEL.echelon.classe_normale.base + REEL.echelon.classe_normale.pas * 4,
  `${reference} pts`);

const modifie = JSON.parse(JSON.stringify(REEL));
modifie.echelon.classe_normale.pas = 10;   // 7 -> 10, soit +3 par échelon au-delà du premier
const attendu = REEL.echelon.classe_normale.base + 10 * 4;
const obtenu = await totalAvec(modifie);
verifier('changer le fichier change le résultat', obtenu === attendu, `${obtenu} pts, attendu ${attendu}`);

// Un barème absent ne doit pas afficher de points inventés
const ctx = await b.newContext({ viewport:{width:1280,height:900} });
const page = await ctx.newPage();
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.route('**/data/bareme-intra-2026.json', r => r.fulfill({ status:404, body:'' }));
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
await page.goto(BASE, { waitUntil:'load' });
await page.waitForTimeout(2500);
const secours = await page.evaluate(() => ({
  score: document.getElementById('score-display').textContent,
  message: document.getElementById('status-global').textContent.trim(),
  total: calculateBreakdown(null, 'GEO').total
}));
verifier('barème manquant : aucun point annoncé', secours.total === 0 && /0 pts|--/.test(secours.score), secours.score);
verifier('barème manquant : l\'utilisateur est prévenu', /introuvable/i.test(secours.message), secours.message.slice(0,70));
verifier('barème manquant : pas de plantage', erreurs.length === 0, erreurs.join(' | '));
await ctx.close();

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
