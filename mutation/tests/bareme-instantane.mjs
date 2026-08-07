/* Fige le comportement de calculateBreakdown avant de toucher au code.
 *
 *   node bareme-instantane.mjs ecrire    -> enregistre l'instantané de référence
 *   node bareme-instantane.mjs verifier  -> recalcule et compare, sortie non nulle si écart
 *
 * Les cas sont tirés par un générateur déterministe : les deux exécutions
 * portent exactement sur les mêmes combinaisons.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'http://127.0.0.1:8765/mutation/';
const FICHIER = new URL('bareme-instantane.json', import.meta.url).pathname;
const mode = process.argv[2];
if (!['ecrire', 'verifier'].includes(mode)) {
  console.error("usage : node bareme-instantane.mjs ecrire|verifier");
  process.exit(2);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });

const resultats = await page.evaluate(() => {
  /* Générateur congruentiel linéaire : même graine, même suite, partout. */
  let graine = 20260807;
  const suivant = () => (graine = (graine * 1103515245 + 12345) % 2147483648) / 2147483648;
  const parmi = (liste) => liste[Math.floor(suivant() * liste.length)];

  const CLASSES = ['normale', 'hors_classe', 'classe_exc'];
  const ECHELONS = [1, 2, 4, 5, 7, 11];
  const ANC_POSTE = [0, 1, 2, 3, 4, 7, 8, 12];
  const FAMILLES = ['', 'RC', 'APC', 'PI'];
  const ENFANTS = [0, 1, 3];
  const SEPARATIONS = [0, 1, 2, 3, 4];
  const VOEUX_PREF = [0, 1, 3, 5];
  const STAGIAIRES = ['', 'classique', 'ex_contractuel', 'ex_fonc'];
  const TZR = [0, 1, 3, 6];
  const CORPS = ['certifie', 'agrege'];
  const TYPES_VOEU = ['ETB', 'COM', 'GEO', 'ZR', 'DPT', 'ZRD', 'ACA'];

  /* Quatre établissements couvrant les branches liées au lieu. */
  const ETABS = [
    null,
    { educationPrioritaire: 'REP+', category: 'LYC' },
    { educationPrioritaire: 'REP', category: 'COL' },
    { educationPrioritaire: '', category: 'LYC' }
  ];

  const ecrire = (id, valeur) => { document.getElementById(id).value = valeur; };
  const cocher = (id, valeur) => { document.getElementById(id).checked = valeur; };

  const sorties = [];
  for (let i = 0; i < 2000; i++) {
    const cas = {
      classe: parmi(CLASSES),
      echelon: parmi(ECHELONS),
      anc_poste: parmi(ANC_POSTE),
      situation_familiale: parmi(FAMILLES),
      enfants: parmi(ENFANTS),
      separation: parmi(SEPARATIONS),
      voeu_pref: parmi(VOEUX_PREF),
      type_stagiaire: parmi(STAGIAIRES),
      anc_tzr: parmi(TZR),
      corps: parmi(CORPS),
      est_rqth: suivant() < 0.5,
      est_mcs: suivant() < 0.25,
      sortie_rep: suivant() < 0.4,
      iEtab: Math.floor(suivant() * ETABS.length),
      typeVoeu: parmi(TYPES_VOEU)
    };

    ['classe', 'echelon', 'anc_poste', 'situation_familiale', 'enfants',
     'separation', 'voeu_pref', 'type_stagiaire', 'anc_tzr', 'corps'].forEach(id => ecrire(id, cas[id]));
    ['est_rqth', 'est_mcs', 'sortie_rep'].forEach(id => cocher(id, cas[id]));

    const r = calculateBreakdown(ETABS[cas.iEtab], cas.typeVoeu);
    sorties.push({
      cas,
      total: r.total,
      lignes: (r.details || []).map(l => `${l.label}=${l.pts}`).join('|')
    });
  }
  return sorties;
});

await browser.close();

/* Les cas sont reproductibles à partir de la graine : le fichier ne garde que
   les résultats, ce qui le divise par quatre. La signature interdit de comparer
   des séries produites par deux générateurs différents. */
const signature = { graine: 20260807, nombre: resultats.length };

if (mode === 'ecrire') {
  writeFileSync(FICHIER, JSON.stringify({
    signature,
    resultats: resultats.map(r => [r.total, r.lignes])
  }));
  const totaux = resultats.map(r => r.total);
  console.log(`${resultats.length} cas enregistrés dans ${FICHIER}`);
  console.log(`totaux : min ${Math.min(...totaux)}, max ${Math.max(...totaux)}, ` +
              `${new Set(totaux).size} valeurs distinctes`);
  process.exit(0);
}

const reference = JSON.parse(readFileSync(FICHIER, 'utf8'));
if (JSON.stringify(reference.signature) !== JSON.stringify(signature)) {
  console.error("La série de cas a changé depuis l'enregistrement de la référence " +
                `(${JSON.stringify(reference.signature)} attendue, ${JSON.stringify(signature)} obtenue).\n` +
                "Comparer serait sans valeur : réenregistrez la référence avec « ecrire », " +
                "après vous être assuré que le calcul est bien celui que vous voulez figer.");
  process.exit(1);
}

const ecarts = [];
for (let i = 0; i < reference.resultats.length; i++) {
  const [totalAttendu, lignesAttendues] = reference.resultats[i];
  const b = resultats[i];
  if (totalAttendu !== b.total) {
    ecarts.push({ i, quoi: 'total', cas: b.cas, attendu: totalAttendu, obtenu: b.total });
  } else if (lignesAttendues !== b.lignes) {
    ecarts.push({ i, quoi: 'détail', cas: b.cas, attendu: lignesAttendues, obtenu: b.lignes });
  }
}

if (!ecarts.length) {
  console.log(`${resultats.length} cas recalculés, tous identiques à la référence.`);
  process.exit(0);
}

console.error(`${ecarts.length} écart(s) sur ${resultats.length} cas :\n`);
ecarts.slice(0, 10).forEach(e => console.error(JSON.stringify(e, null, 1)));
process.exit(1);
