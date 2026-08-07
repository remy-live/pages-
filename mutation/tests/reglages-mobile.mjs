/* Le panneau « Ma situation » doit rester lisible sur les petits écrans :
   pas de champ écrasé, pas de libellé désaligné de son champ. */
import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:8765/mutation/';
let echecs = 0;
const verifier = (n,c,d='') => { console.log(`${c?'  ok  ':' ÉCHEC'} ${n}${d?' — '+d:''}`); if(!c) echecs++; };
const b = await chromium.launch();

for (const nom of ['iPhone SE', 'iPhone 13', 'Pixel 5']) {
  console.log(`\n=== ${nom} ===`);
  const ctx = await b.newContext({ ...devices[nom] });
  const page = await ctx.newPage();
  await page.route('**basemaps.cartocdn.com/**', r => r.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
  await page.click('#accueil .accueil-choix button:nth-child(2)');
  await page.evaluate(() => toggleSidebar('right'));
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const pan = document.getElementById('sidebar-right');
    const interieur = pan.querySelector('.sidebar-content').clientWidth;
    /* Un champ doit remplir le bloc qui le contient : c'est ce qui n'était pas
       le cas quand deux colonnes se partageaient la largeur. */
    const champs = Array.from(pan.querySelectorAll('#calc-form select, #calc-form input[type=number]'));
    const largeurUtile = (el) => {
      const st = getComputedStyle(el);
      return el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
    };
    const etroits = champs.filter(c => {
      const dispo = largeurUtile(c.closest('.col') || c.parentElement);
      return c.getBoundingClientRect().width < dispo * 0.95;
    }).map(c => `${c.id}=${Math.round(c.getBoundingClientRect().width)}px`);
    /* Un libellé et son champ doivent partager le même bord gauche. */
    const desalignes = [];
    pan.querySelectorAll('.col').forEach(col => {
      const lab = col.querySelector('label'), ch = col.querySelector('select, input');
      if (!lab || !ch) return;
      if (Math.abs(lab.getBoundingClientRect().left - ch.getBoundingClientRect().left) > 2) {
        desalignes.push(lab.textContent.trim().slice(0, 24));
      }
    });
    /* Deux champs côte à côte sur la même ligne : c'est ce qui écrasait tout. */
    const cotesACote = [];
    pan.querySelectorAll('.row').forEach(row => {
      const cols = Array.from(row.querySelectorAll('.col'));
      for (let i = 1; i < cols.length; i++) {
        const a = cols[i-1].getBoundingClientRect(), c = cols[i].getBoundingClientRect();
        if (Math.abs(a.top - c.top) < 4) cotesACote.push(cols[i].textContent.trim().slice(0, 20));
      }
    });
    return {
      interieur, nbChamps: champs.length, etroits, desalignes, cotesACote,
      debordement: pan.scrollWidth - pan.clientWidth
    };
  });

  verifier('aucun champ écrasé', r.etroits.length === 0, r.etroits.join(', ') || `${r.nbChamps} champs, panneau ${r.interieur}px`);
  verifier('libellés alignés sur leur champ', r.desalignes.length === 0, r.desalignes.join(' | '));
  verifier('plus de deux champs sur la même ligne', r.cotesACote.length === 0, r.cotesACote.join(' | '));
  verifier('pas de débordement horizontal', r.debordement === 0, r.debordement + 'px');
  await ctx.close();
}

/* Sur grand écran le panneau fait la même largeur : le résultat doit tenir aussi. */
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.route('**basemaps.cartocdn.com/**', r => r.abort());
await page.goto(BASE, { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('splash') === null, null, { timeout: 25000 });
await page.click('#accueil .accueil-choix button:nth-child(2)');
await page.waitForTimeout(300);
const bureau = await page.evaluate(() => {
  const pan = document.getElementById('sidebar-right');
  const interieur = pan.querySelector('.sidebar-content').clientWidth;
  const el = document.getElementById('corps');
  const parent = el.closest('.col');
  const st = getComputedStyle(parent);
  const dispo = parent.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight);
  return { interieur, corps: Math.round(el.getBoundingClientRect().width), dispo: Math.round(dispo) };
});
console.log('\n=== ordinateur ===');
verifier('le menu Corps occupe toute la largeur disponible',
  bureau.corps >= bureau.dispo * 0.95, `${bureau.corps}px sur ${bureau.dispo}px disponibles`);
await ctx.close();

console.log(echecs ? `\n${echecs} vérification(s) en échec` : '\nToutes les vérifications passent');
await b.close();
process.exit(echecs ? 1 : 0);
