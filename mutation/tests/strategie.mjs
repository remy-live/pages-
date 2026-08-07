/* Le guide doit détecter les pièges réels d'une liste de vœux, pas réciter des généralités. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
await page.click('#accueil .accueil-choix button:nth-child(2)');

/* On choisit un établissement réel et le groupement qui le contient. */
const cas = await page.evaluate(() => {
  const etab = AppState.etablissementObjects.find(e => (e.groupes.GEO || []).length && (e.groupes.COM || []).length);
  const geo = etab.groupes.GEO[0], com = etab.groupes.COM[0];
  const freres = AppState.etablissementObjects.filter(e => (e.groupes.GEO || []).some(g => g.code === geo.code));
  return { uai: etab.Identifiant_de_l_etablissement, nom: etab.nom, ville: etab.ville,
           geoCode: geo.code, geoNom: geo.nom, comCode: com.code, comNom: com.nom,
           tailleGeo: freres.length,
           autre: freres.find(e => e.Identifiant_de_l_etablissement !== etab.Identifiant_de_l_etablissement)?.Identifiant_de_l_etablissement };
});
console.log(`cas d'essai : ${cas.nom} (${cas.ville}), groupement « ${cas.geoNom} » de ${cas.tailleGeo} établissements`);

const texteGuide = async () => {
  await page.evaluate(() => ouvrirStrategie());
  await page.waitForTimeout(200);
  const t = await page.textContent('#strat-conseils');
  await page.evaluate(() => { document.getElementById('strategie').style.display = 'none'; });
  return t;
};

// --- 1. vœu précis placé APRÈS le groupement qui le contient : inopérant
await page.evaluate(c => {
  AppState.wishlist = [];
  addToWishlist('GEO', c.geoCode, c.geoNom, 'Groupement', 49.9, 2.3);
  addToWishlist('ETB', c.uai, c.nom, c.ville, 49.9, 2.3);
}, cas);
let t = await texteGuide();
verifier('détecte le vœu précis rendu inopérant', /sans effet/i.test(t) && t.includes(cas.nom));
verifier('explique le mécanisme du vœu indicatif', /indicatif/i.test(t));

// --- 2. ordre correct : plus d'alerte
await page.evaluate(c => {
  AppState.wishlist = [];
  addToWishlist('ETB', c.uai, c.nom, c.ville, 49.9, 2.3);
  addToWishlist('GEO', c.geoCode, c.geoNom, 'Groupement', 49.9, 2.3);
}, cas);
t = await texteGuide();
verifier('ordre correct : plus d\'alerte d\'inopérance', !/sans effet/i.test(t));

// --- 3. exposition d'un vœu large
verifier('annonce ce que le vœu large recouvre',
  new RegExp(`${cas.tailleGeo} établissement`).test(t), `${cas.tailleGeo} attendus`);

// --- 4. établissement écarté atteint par un vœu large
if (cas.autre) {
  await page.evaluate(c => basculerEviter(c.autre, 'Test'), cas);
  t = await texteGuide();
  verifier('signale l\'établissement écarté joignable par le vœu large',
    /ne voulez pas/i.test(t) && /retrancher/i.test(t));
  await page.evaluate(c => basculerEviter(c.autre, 'Test'), cas);
}

// --- 5. points familiaux perdus faute de vœu large
await page.evaluate(c => {
  document.getElementById('situation_familiale').value = 'RC';
  document.getElementById('separation').value = '2';
  document.getElementById('enfants').value = '1';
  updateUI(false); updateHeaderScore();
  AppState.wishlist = [];
  addToWishlist('ETB', c.uai, c.nom, c.ville, 49.9, 2.3);
}, cas);
t = await texteGuide();
verifier('chiffre les points laissés de côté', /laisse [\d.,]+ points de côté/g.test(t), (t.match(/laisse \d+ points de côté/) || [''])[0]);
verifier('rappelle la règle du premier vœu en rapprochement de conjoint', /conjoint/i.test(t) && /ordre/i.test(t));

// --- 6. commune du conjoint renseignée et respectée
await page.evaluate(c => {
  document.getElementById('objectif_commune').value = c.comNom;
  enregistrerObjectif();
  AppState.wishlist = [];
  addToWishlist('COM', c.comCode, c.comNom, 'Commune', 49.9, 2.3);
}, cas);
t = await texteGuide();
verifier('valide l\'ordre quand la commune du conjoint est en tête', /correspond bien/i.test(t));

// --- 7. mutation simultanée
await page.evaluate(() => { document.getElementById('voeu_simultane').checked = true; enregistrerObjectif(); });
t = await texteGuide();
verifier('rappelle la contrainte de la mutation simultanée', /identiques/i.test(t) && /même ordre/i.test(t));

// --- 8. persistance de l'objectif
await page.reload({ waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
const apres = await page.evaluate(() => ({
  commune: document.getElementById('objectif_commune').value,
  simultane: document.getElementById('voeu_simultane').checked,
  communesProposees: document.getElementById('liste-communes').children.length
}));
verifier('objectif conservé au rechargement', apres.commune === cas.comNom && apres.simultane === true,
  `${apres.commune}, simultané ${apres.simultane}`);
verifier('la liste des communes est proposée à la saisie', apres.communesProposees > 50, apres.communesProposees + ' communes');

// --- 9. le vœu simultané n'invente aucun point
const points = await page.evaluate(() => ({
  bareme: BAREME.mutation_simultanee.points,
  avant: (document.getElementById('voeu_simultane').checked = false, calculateBreakdown(null, 'GEO').total),
  apres: (document.getElementById('voeu_simultane').checked = true, calculateBreakdown(null, 'GEO').total)
}));
verifier('le vœu simultané n\'ajoute aucun point tant que la valeur n\'est pas établie',
  points.bareme === null && points.avant === points.apres, `${points.avant} = ${points.apres}`);

verifier('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
