/*
 * rsst-contenu.js — récupérer le texte des signalements du RSST
 * =============================================================
 *
 * L'extraction CSV du portail donne les métadonnées d'un signalement (date,
 * risque, RNE, état, déclarant) mais pas ce qui y est écrit. Le texte n'existe
 * que sur la fiche, une page par signalement, et il y en a un millier et demi.
 *
 * Ce script ouvre chaque fiche à votre place, dans votre navigateur et avec
 * votre session, puis en tire un second CSV qui se raccorde au premier par le
 * numéro d'inscription au registre.
 *
 * LE PREMIER RELEVÉ EST LONG, LES SUIVANTS NON
 * --------------------------------------------
 * Les fiches lues sont gardées dans le navigateur. Au relevé suivant, le
 * script parcourt les pages de liste — une minute — et y lit l'état et le
 * nombre de réponses de chaque signalement. Il ne rouvre que les fiches dont
 * l'un des deux a changé, plus les nouvelles. En général : quelques dizaines
 * de pages au lieu de mille cinq cents.
 *
 * MODE D'EMPLOI
 * -------------
 * Il s'installe en favori depuis `contenu/` : on ouvre le portail, on clique
 * le favori, un panneau s'ouvre en bas à droite de la page. Pas de console.
 *
 * Pour qui préfère la console (F12) : coller ce fichier, puis
 *
 *     rsstContenu.lancer()          relever ce qui a changé
 *     rsstContenu.lancer({tout:true})      tout relire
 *     rsstContenu.lancer({pages:[1,3]})    se limiter aux pages 1 à 3
 *     rsstContenu.csv()             enregistrer ce qui est en mémoire
 *     rsstContenu.oublier()         effacer la mémoire
 *
 * CE QUE ÇA FAIT, ET CE QUE ÇA NE FAIT PAS
 * ----------------------------------------
 * Le script lit, et rien d'autre : il n'écrit, ne modifie, ne vise, ne clôt et
 * ne supprime aucun signalement. Il ne voit que ce que votre compte voit déjà
 * en cliquant. Il laisse une demi-seconde entre deux pages pour ne pas peser
 * sur le serveur. Rien ne sort de votre navigateur.
 *
 * CONFIDENTIALITÉ
 * ---------------
 * Le fichier produit — et la mémoire qui le prépare — contiennent le texte
 * intégral des signalements et des réponses, avec les noms. C'est un document
 * de travail nominatif : il se traite comme le registre lui-même. Sur un poste
 * partagé, « Tout oublier » efface la mémoire.
 */

(function () {
  'use strict';

  const BASE = './?module=rsst&action=';
  const DELAI_DEFAUT = 500;

  /* Relancé une seconde fois (on reclique le favori), on se contente de
     rouvrir le panneau : la mémoire et la lecture en cours sont intactes. */
  if (window.rsstContenu) {
    window.rsstContenu.panneau();
    return;
  }

  const etat = {
    fiches: new Map(), // identifiant de fiche -> contenu lu
    releve: null,      // date du dernier relevé complet
    arret: false,
    encours: false,
  };

  /* ---------------------------------------------------------------- outils */

  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Récupère une page du portail et la rend sous forme de document. */
  async function page(url) {
    const rep = await fetch(url, { credentials: 'same-origin' });
    if (!rep.ok) throw new Error('HTTP ' + rep.status);
    const html = await rep.text();
    // Une session expirée renvoie une page de connexion avec un code 200 :
    // sans ce garde-fou, on enregistrerait mille fiches vides.
    if (!/module=rsst/.test(html)) {
      throw new Error('session expirée — reconnectez-vous, puis relancez');
    }
    return new DOMParser().parseFromString(html, 'text/html');
  }

  /** Texte d'un élément, les <br> rendus par des retours à la ligne. */
  function texte(el) {
    if (!el) return '';
    const copie = el.cloneNode(true);
    copie.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
    return copie.textContent.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').trim();
  }

  /* --------------------------------------------------------------- mémoire */

  /**
   * Les fiches déjà lues, gardées d'une visite à l'autre.
   *
   * Dans IndexedDB plutôt que localStorage : mille cinq cents fiches de texte
   * dépassent le mégaoctet, et localStorage lèverait une erreur de quota en
   * milieu de parcours, après vingt minutes de lecture.
   */
  const Memoire = {
    _db: null,
    ouvrir() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((ok, non) => {
        const rq = indexedDB.open('rsst-contenu', 1);
        // Une suppression de base en cours, ou un autre onglet qui retient
        // une version antérieure, laisse la demande en attente sans jamais
        // ni réussir ni échouer.
        rq.onblocked = () => non(new Error('stockage occupé'));
        rq.onupgradeneeded = () => {
          const db = rq.result;
          if (!db.objectStoreNames.contains('fiches')) db.createObjectStore('fiches');
          if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
        };
        rq.onsuccess = () => { this._db = rq.result; ok(rq.result); };
        rq.onerror = () => non(rq.error);
      });
    },
    async _tx(magasin, mode, fn) {
      try {
        const db = await this.ouvrir();
        return await new Promise((ok, non) => {
          const tx = db.transaction(magasin, mode);
          const rq = fn(tx.objectStore(magasin));
          tx.oncomplete = () => ok(rq ? rq.result : undefined);
          tx.onerror = () => non(tx.error);
        });
      } catch { return undefined; }  // navigation privée, quota, stockage refusé
    },
    async charger() {
      const [cles, valeurs, releve] = await Promise.all([
        this._tx('fiches', 'readonly', (s) => s.getAllKeys()),
        this._tx('fiches', 'readonly', (s) => s.getAll()),
        this._tx('meta', 'readonly', (s) => s.get('releve')),
      ]);
      if (!cles || !valeurs) return;
      cles.forEach((k, i) => etat.fiches.set(String(k), valeurs[i]));
      etat.releve = releve || null;
    },
    ecrire(lot) {
      return this._tx('fiches', 'readwrite', (s) => {
        for (const [id, f] of lot) s.put(f, id);
      });
    },
    marquerReleve(d) { return this._tx('meta', 'readwrite', (s) => s.put(d, 'releve')); },
    async vider() {
      await this._tx('fiches', 'readwrite', (s) => s.clear());
      await this._tx('meta', 'readwrite', (s) => s.clear());
      etat.fiches.clear();
      etat.releve = null;
    },
  };

  /* --------------------------------------------------- lecture d'une fiche */

  /**
   * Lit une fiche de signalement.
   *
   * La page n'a pas de structure balisée : ses sections sont séparées par des
   * <h3>. On parcourt donc les enfants dans l'ordre en retenant le dernier
   * titre vu, plutôt que de se fier à des positions qui bougeraient au moindre
   * changement de gabarit.
   */
  function lireFiche(doc, id) {
    const racine = doc.querySelector('span.rsst');
    if (!racine) throw new Error('page inattendue (fiche absente ou accès refusé)');

    const f = {
      numero: '', risque: '', observation: '', suggestion: '', pj: [],
      caviarde: false, closePar: '', visas: [], reponses: [],
      url: location.pathname + '?module=rsst&action=declaration&id=' + id,
      erreur: '',
    };

    // Le bandeau rouge signale un texte dont des mentions ont été retirées.
    const rouge = racine.querySelector('.alert-error');
    if (rouge && /mentions interdites/i.test(rouge.textContent)) f.caviarde = true;

    const entete = racine.querySelector('.thumbnail.box');
    if (entete) {
      f.risque = texte(entete.querySelector('h3'));
      for (const p of entete.querySelectorAll('p')) {
        const t = texte(p);
        if (/^N°\s*d'inscription/i.test(t)) {
          f.numero = texte(p.querySelector('strong'));
          continue;
        }
        const fort = p.querySelector('strong');
        if (!fort || p.firstElementChild !== fort) continue;
        const etiquette = texte(fort).replace(/\s*:\s*$/, '').toLowerCase();
        const valeur = t.slice(texte(fort).length).replace(/^\s*:?\s*/, '').trim();
        if (/^observation/.test(etiquette)) f.observation = valeur;
        else if (/^suggestion/.test(etiquette)) f.suggestion = valeur;
        else if (/^pi[eè]ces/.test(etiquette)) {
          f.pj = [...p.querySelectorAll('li')].map(texte).filter(Boolean);
        }
      }
      // Les pièces jointes sont parfois dans un <ul> frère du paragraphe.
      if (!f.pj.length) {
        f.pj = [...entete.querySelectorAll('ul li')].map(texte).filter(Boolean);
      }
    }

    const jaune = racine.querySelector('.alert-warning');
    if (jaune) {
      const m = texte(jaune).match(/clotur[ée]e?\s+par\s+([^.\n]+)/i);
      if (m) f.closePar = m[1].trim();
    }

    // Parcours à plat : chaque <h3> ouvre une section, les encadrés qui
    // suivent lui appartiennent.
    let section = '';
    for (const el of racine.children) {
      if (el.tagName === 'H3') {
        const t = texte(el).toLowerCase();
        section = /^visas/.test(t) ? 'visas'
          : /^observations/.test(t) ? 'reponses' : '';
        continue;
      }
      if (!el.classList.contains('alert') || el.classList.contains('alert-warning')) continue;

      if (section === 'visas') {
        const m = texte(el).match(/Vu par\s+(.+?)\s+le\s+([\d/]+)/i);
        if (m) f.visas.push({ par: m[1].trim(), le: m[2] });
      } else if (section === 'reponses') {
        const copie = el.cloneNode(true);
        const titre = copie.querySelector('p strong');
        const m = titre ? texte(titre).match(/^(.+?)\s+a\s+écrit\s+le\s+([\d/]+)/i) : null;
        if (titre) titre.closest('p').remove();
        // On retire l'intitulé « Pièces jointes » et sa liste du corps.
        copie.querySelectorAll('h4').forEach((h) => {
          const n = h.nextElementSibling;
          if (n && n.tagName === 'UL') n.remove();
          h.remove();
        });
        f.reponses.push({
          par: m ? m[1].trim() : '',
          le: m ? m[2] : '',
          texte: texte(copie),
        });
      }
    }

    if (!f.numero) f.numero = String(id);
    return f;
  }

  /* ----------------------------------------------- repérage des signalements */

  /** Dernier numéro de page de la pagination, pour savoir jusqu'où aller. */
  async function dernierePage() {
    const doc = await page(BASE + 'declarations');
    const nums = [...doc.querySelectorAll('.pagination a, .pagination span')]
      .map((a) => parseInt(a.textContent.trim(), 10))
      .filter((n) => Number.isFinite(n));
    return nums.length ? Math.max(...nums) : 1;
  }

  const sansAccent = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  /**
   * Les signalements listés sur une page, avec leur signature.
   *
   * On relève les liens plutôt que de supposer que les identifiants se suivent
   * de 1 à N : votre compte ne voit qu'un périmètre, et numéroter à l'aveugle
   * produirait des centaines de requêtes refusées.
   *
   * La signature — état du traitement et nombre de réponses — vient de la
   * liste elle-même. C'est elle qui dit, sans ouvrir la fiche, si son contenu
   * a pu changer depuis le dernier relevé.
   */
  async function lignesDeLaPage(n) {
    const doc = await page(BASE + 'declarations&page=' + n);

    // Les colonnes sont repérées par leur intitulé : leur ordre peut changer,
    // leur nom beaucoup moins.
    const colonnes = {};
    const entetes = doc.querySelectorAll('table th');
    entetes.forEach((th, i) => {
      const t = sansAccent(th.textContent);
      if (t.startsWith('etat')) colonnes.etat = i;
      else if (t.startsWith('reponse')) colonnes.reponses = i;
    });

    const sorties = [];
    for (const tr of doc.querySelectorAll('tr')) {
      const a = tr.querySelector('a[href*="action=declaration"]');
      if (!a) continue;
      const m = a.getAttribute('href').match(/[?&]id=(\d+)/);
      if (!m) continue;
      const cells = tr.querySelectorAll('td');
      const lire = (i) => (i != null && cells[i] ? cells[i].textContent.trim() : '');
      sorties.push({
        id: m[1],
        // Faute d'en-têtes reconnus, la signature reste vide : on relit tout
        // plutôt que de croire à tort qu'une fiche n'a pas bougé.
        sig: colonnes.etat == null && colonnes.reponses == null
          ? '' : lire(colonnes.etat) + '|' + lire(colonnes.reponses),
      });
    }
    return sorties;
  }

  /* ------------------------------------------------------------------- CSV */

  const COLONNES = [
    ['numero', (f) => f.numero],
    ['risque', (f) => f.risque],
    ['observation', (f) => f.observation],
    ['suggestion', (f) => f.suggestion],
    ['pieces_jointes', (f) => f.pj.join(' | ')],
    ['caviarde', (f) => (f.caviarde ? 'oui' : '')],
    ['cloture_par', (f) => f.closePar],
    ['nb_visas', (f) => String(f.visas.length)],
    ['visas', (f) => f.visas.map((v) => v.le + ' — ' + v.par).join(' | ')],
    ['nb_reponses', (f) => String(f.reponses.length)],
    ['premiere_reponse', (f) => (f.reponses[0] ? f.reponses[0].le : '')],
    ['derniere_reponse', (f) => (f.reponses.length ? f.reponses[f.reponses.length - 1].le : '')],
    ['reponses', (f) => f.reponses
      .map((r) => [r.le, r.par].filter(Boolean).join(' — ') + (r.texte ? '\n' + r.texte : ''))
      .join('\n\n')],
    ['url', (f) => f.url],
    ['erreur', (f) => f.erreur],
    // Le repère qui permettra, au prochain relevé, de savoir sans ouvrir la
    // fiche si son contenu a pu changer.
    ['etat_liste', (f) => f.sig || ''],
  ];

  /** Lecture d'un CSV à point-virgule, guillemets compris. */
  function lireCsv(t) {
    const out = [];
    let champ = '', ligne = [], q = false;
    t = t.replace(/^\ufeff/, '');
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) {
        if (c === '"' && t[i + 1] === '"') { champ += '"'; i++; }
        else if (c === '"') q = false;
        else champ += c;
      } else if (c === '"') q = true;
      else if (c === ';') { ligne.push(champ); champ = ''; }
      else if (c === '\r' || c === '\n') {
        if (c === '\r' && t[i + 1] === '\n') i++;
        ligne.push(champ); out.push(ligne); ligne = []; champ = '';
      } else champ += c;
    }
    if (champ !== '' || ligne.length) { ligne.push(champ); out.push(ligne); }
    return out.filter((l) => l.length > 1 || l[0] !== '');
  }

  /**
   * Réamorce la mémoire avec un CSV déjà enregistré.
   *
   * Les valeurs sont gardées telles quelles plutôt que reconstruites : on ne
   * peut pas redécouper fidèlement des réponses mises bout à bout, et un
   * fichier repris doit ressortir identique à ce qu'il était.
   */
  async function importerCsv(texte) {
    const lignes = lireCsv(texte);
    if (lignes.length < 2) return dire('Fichier vide ou illisible.');
    const entetes = lignes[0].map((h) => h.trim().toLowerCase());
    const iNum = entetes.indexOf('numero');
    if (iNum < 0) return dire('Ce fichier n\'a pas de colonne « numero ».');
    const iUrl = entetes.indexOf('url');
    const iSig = entetes.indexOf('etat_liste');

    const lot = [];
    let sansRepere = 0;
    for (const l of lignes.slice(1)) {
      const numero = (l[iNum] || '').trim();
      if (!numero) continue;
      // L'identifiant de la fiche est celui de son adresse ; à défaut, le
      // numéro d'inscription, qui lui est égal dans tous les cas observés.
      const m = iUrl >= 0 ? String(l[iUrl] || '').match(/[?&]id=(\d+)/) : null;
      const id = m ? m[1] : numero;
      const brut = {};
      entetes.forEach((h, k) => { brut[h] = l[k] == null ? '' : l[k]; });
      const sig = iSig >= 0 ? (l[iSig] || '') : '';
      if (!sig) sansRepere++;
      const f = { numero, brut, sig, erreur: brut.erreur || '' };
      etat.fiches.set(id, f);
      lot.push([id, f]);
    }
    if (!lot.length) return dire('Aucune ligne exploitable dans ce fichier.');
    await Memoire.ecrire(lot);
    if (ui) ui.boutons(false);
    dire(lot.length + ' fiche' + (lot.length > 1 ? 's' : '') + ' reprise'
      + (lot.length > 1 ? 's' : '') + '.'
      + (sansRepere
        ? ' ' + sansRepere + ' sans repère d\'état : elles seront relues une fois,'
          + ' puis suivies comme les autres.'
        : ' La mise à jour ne rouvrira que ce qui a changé.'));
  }

  function cellule(v) {
    const s = String(v == null ? '' : v);
    return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function fabriquerCsv() {
    const lignes = [COLONNES.map(([h]) => h).join(';')];
    const tri = [...etat.fiches.values()]
      .sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0));
    for (const f of tri) {
      lignes.push(COLONNES.map(([nom, get]) =>
        cellule(f.brut ? (f.brut[nom] != null ? f.brut[nom] : '') : get(f))).join(';'));
    }
    // Le BOM fait ouvrir le fichier en UTF-8 par Excel, accents compris.
    return '﻿' + lignes.join('\r\n') + '\r\n';
  }

  function telecharger() {
    if (!etat.fiches.size) return dire('Rien à enregistrer pour le moment.');
    const d = new Date();
    const jour = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const blob = new Blob([fabriquerCsv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rsst_contenu_' + jour + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    dire(a.download + ' — ' + etat.fiches.size + ' fiches.');
  }

  /* --------------------------------------------------------------- panneau */

  let ui = null;

  function construirePanneau() {
    const hote = document.createElement('div');
    hote.id = 'rsst-contenu-panneau';
    hote.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647';
    const racine = hote.attachShadow({ mode: 'open' });
    racine.innerHTML = [
      '<style>',
      ':host,*{box-sizing:border-box}',
      // Une règle d'affichage explicite l'emporte sur le display:none que
      // le navigateur attache à [hidden] : sans ceci, « Tout oublier »
      // resterait visible alors qu'il n'y a rien à oublier.
      '[hidden]{display:none !important}',
      '.p{width:330px;max-width:calc(100vw - 32px);background:#fff;color:#1a1d21;',
      ' border:1px solid #d7dbe0;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.22);',
      ' font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}',
      '.t{display:flex;align-items:center;gap:8px;padding:11px 12px;background:#f5f7f9;',
      ' border-bottom:1px solid #e4e8ec}',
      '.t b{font-size:13px;flex:1}',
      '.x{border:0;background:none;font-size:17px;line-height:1;cursor:pointer;color:#6b7480;padding:2px 4px}',
      '.c{padding:12px}',
      'p{margin:0 0 9px}',
      '.m{color:#5a6472;font-size:12px}',
      '.etat{font-size:12px;color:#1a1d21;background:#f0f4f8;border:1px solid #e0e6ec;',
      ' border-radius:7px;padding:7px 9px;margin-bottom:10px}',
      '.etat b{font-variant-numeric:tabular-nums}',
      '.r{display:flex;gap:7px;margin-top:10px}',
      'button.a{flex:1;padding:8px 10px;border-radius:8px;border:1px solid #c8cdd4;',
      ' background:#fff;font:inherit;font-weight:600;cursor:pointer;color:#1a1d21}',
      'button.a:hover:not(:disabled){background:#f2f5f8}',
      'button.a:disabled{opacity:.45;cursor:default}',
      'button.go{background:#2a78d6;border-color:#2a78d6;color:#fff}',
      'button.go:hover:not(:disabled){background:#1f66bd}',
      '.j{height:5px;border-radius:3px;background:#e7ebf0;overflow:hidden;margin:10px 0 7px;display:none}',
      '.j i{display:block;height:100%;width:0;background:#2a78d6;transition:width .25s}',
      '.s{font-size:12px;color:#5a6472;min-height:17px}',
      '.w{margin-top:10px;padding:8px 9px;border-radius:7px;background:#fdf4e6;',
      ' border:1px solid #f0d9ae;font-size:11.5px;color:#6b4e18}',
      '.oubli{display:block;width:100%;margin-top:8px;border:0;background:none;',
      ' font:inherit;font-size:11.5px;color:#6b7480;text-decoration:underline;cursor:pointer;padding:2px}',
      '</style>',
      '<div class="p">',
      '  <div class="t"><b>Contenu des signalements</b><button class="x" title="Fermer">✕</button></div>',
      '  <div class="c">',
      '    <div class="etat" data-etat>Mémoire vide.</div>',
      '    <div class="j"><i></i></div>',
      '    <div class="s">Prêt.</div>',
      '    <div class="r">',
      '      <button class="a go" data-go>Lancer</button>',
      '      <button class="a" data-stop disabled>Arrêter</button>',
      '      <button class="a" data-csv disabled>Enregistrer</button>',
      '    </div>',
      '    <div class="w">Le fichier produit — et la mémoire qui le prépare —',
      '      sont nominatifs : texte des signalements et noms. À traiter comme',
      '      le registre lui-même.</div>',
      '    <button class="oubli" data-reprise>Reprendre un fichier déjà enregistré</button>',
      '    <input type="file" accept=".csv,text/csv" data-fichier hidden>',
      '    <button class="oubli" data-oubli hidden>Tout oublier</button>',
      '  </div>',
      '</div>',
    ].join('\n');
    document.body.appendChild(hote);

    const $ = (s) => racine.querySelector(s);
    const jauge = $('.j'), barre = $('.j i'), statut = $('.s'), resume = $('[data-etat]');
    const bGo = $('[data-go]'), bStop = $('[data-stop]'), bCsv = $('[data-csv]'), bOubli = $('[data-oubli]');
    const bReprise = $('[data-reprise]'), fichier = $('[data-fichier]');

    $('.x').onclick = () => hote.remove();
    bGo.onclick = () => lancer();
    bStop.onclick = () => { etat.arret = true; statut.textContent = 'Arrêt en cours…'; };
    bCsv.onclick = telecharger;
    bReprise.onclick = () => fichier.click();
    fichier.onchange = async () => {
      const f = fichier.files && fichier.files[0];
      fichier.value = '';
      if (!f) return;
      dire('Lecture de ' + f.name + '…');
      try { await importerCsv(await f.text()); }
      catch (e) { dire('Fichier illisible : ' + e.message); }
    };
    bOubli.onclick = async () => {
      if (!confirm('Effacer les ' + etat.fiches.size + ' fiches gardées dans ce navigateur ?\n\n'
        + 'Le prochain relevé repartira de zéro et demandera une vingtaine de minutes.')) return;
      await Memoire.vider();
      ui.boutons(false);
      dire('Mémoire effacée.');
    };

    ui = {
      hote,
      dire(t) { statut.textContent = t; },
      avancer(fait, total) {
        jauge.style.display = total ? 'block' : 'none';
        barre.style.width = total ? Math.round((fait / total) * 100) + '%' : '0';
      },
      boutons(encours) {
        const n = etat.fiches.size;
        bGo.disabled = encours;
        bStop.disabled = !encours;
        bCsv.disabled = !n;
        bOubli.hidden = !n;
        bGo.textContent = n ? 'Mettre à jour' : 'Lancer';
        resume.innerHTML = n
          ? '<b>' + n + '</b> fiche' + (n > 1 ? 's' : '') + ' en mémoire'
            + (etat.releve ? ', relevées le ' + etat.releve : '')
            + '.<br>La mise à jour ne rouvre que ce qui a changé.'
          : 'Mémoire vide. Le premier relevé demande une vingtaine de minutes ; '
            + 'les suivants, une ou deux.';
      },
    };
    ui.boutons(etat.encours);
    return ui;
  }

  function panneau() {
    if (ui && document.body.contains(ui.hote)) return ui;
    return (ui = construirePanneau());
  }

  /** Dit la même chose au panneau et à la console. */
  function dire(t) {
    if (ui && document.body.contains(ui.hote)) ui.dire(t);
    console.log('[rsst-contenu] ' + t);
  }

  /* ------------------------------------------------------------- lancement */

  async function lancer(opts) {
    if (etat.encours) return dire('Lecture déjà en cours.');
    const o = opts || {};
    const delai = Number.isFinite(o.delai) ? o.delai : DELAI_DEFAUT;
    etat.arret = false;
    etat.encours = true;
    if (ui) ui.boutons(true);
    const debut = Date.now();

    try {
      dire('Parcours des pages de liste…');
      const derniere = await dernierePage();
      const [p1, p2] = o.pages || [1, derniere];

      // 1. relever les signalements et leur signature
      const lignes = [];
      const vus = new Set();
      for (let n = p1; n <= p2 && !etat.arret; n++) {
        try {
          for (const l of await lignesDeLaPage(n)) {
            if (vus.has(l.id)) continue;
            vus.add(l.id);
            lignes.push(l);
          }
        } catch (e) {
          console.warn('[rsst-contenu] page ' + n + ' : ' + e.message);
        }
        dire('Page ' + n + ' sur ' + p2 + ' — ' + lignes.length + ' signalements repérés');
        if (ui) ui.avancer(n - p1 + 1, p2 - p1 + 1);
        await attendre(delai);
      }

      // 2. ne retenir que ce qui a bougé
      const nouveaux = [], changes = [];
      for (const l of lignes) {
        const connue = etat.fiches.get(l.id);
        if (!connue) nouveaux.push(l);
        else if (o.tout || !l.sig || connue.sig !== l.sig) changes.push(l);
      }
      const aLire = nouveaux.concat(changes);

      if (!aLire.length && !etat.arret) {
        await Memoire.marquerReleve(new Date().toLocaleDateString('fr-FR'));
        etat.releve = new Date().toLocaleDateString('fr-FR');
        dire('Rien de nouveau : les ' + etat.fiches.size + ' fiches sont à jour.');
        return;
      }
      if (!etat.arret) {
        dire(nouveaux.length + ' nouvelle' + (nouveaux.length > 1 ? 's' : '')
          + ', ' + changes.length + ' mise' + (changes.length > 1 ? 's' : '') + ' à jour'
          + ' — ' + Math.ceil(aLire.length * (delai + 150) / 60000) + ' min environ.');
        await attendre(900);
      }

      // 3. lire les fiches retenues
      let lus = 0, rates = 0, lot = [];
      for (const l of aLire) {
        if (etat.arret) break;
        let f;
        try {
          f = lireFiche(await page(BASE + 'declaration&id=' + l.id), l.id);
        } catch (e) {
          // On garde une ligne pour la fiche en échec : un signalement
          // silencieusement absent vaut moins qu'un signalement signalé absent.
          rates++;
          f = {
            numero: String(l.id), risque: '', observation: '', suggestion: '',
            pj: [], caviarde: false, closePar: '', visas: [], reponses: [],
            url: location.pathname + '?module=rsst&action=declaration&id=' + l.id,
            erreur: e.message,
          };
        }
        f.sig = l.sig;
        etat.fiches.set(l.id, f);
        lot.push([l.id, f]);
        // On écrit par paquets : une interruption à la vingtième minute ne
        // doit pas emporter ce qui a été lu avant.
        if (lot.length >= 25) { await Memoire.ecrire(lot); lot = []; }
        lus++;
        if (ui) ui.avancer(lus, aLire.length);
        if (lus % 5 === 0 || lus === aLire.length) {
          const reste = Math.ceil((aLire.length - lus) * (delai + 150) / 60000);
          dire(lus + ' / ' + aLire.length + ' fiches'
            + (rates ? ' · ' + rates + ' en échec' : '')
            + (reste > 0 ? ' · encore ~' + reste + ' min' : ''));
        }
        await attendre(delai);
      }
      if (lot.length) await Memoire.ecrire(lot);

      if (!etat.arret) {
        etat.releve = new Date().toLocaleDateString('fr-FR');
        await Memoire.marquerReleve(etat.releve);
      }

      const min = Math.max(1, Math.round((Date.now() - debut) / 60000));
      dire(lus + ' fiche' + (lus > 1 ? 's' : '') + ' lue' + (lus > 1 ? 's' : '')
        + ' en ' + min + ' min' + (rates ? ', dont ' + rates + ' en échec' : '')
        + (etat.arret ? ' — arrêté, « Mettre à jour » reprend' : '') + '.');
      if (!etat.arret) telecharger();
    } catch (e) {
      dire('Interrompu : ' + e.message
        + (etat.fiches.size ? ' — les ' + etat.fiches.size + ' fiches en mémoire sont gardées.' : ''));
    } finally {
      etat.encours = false;
      if (ui) { ui.boutons(false); ui.avancer(0, 0); }
    }
  }

  window.rsstContenu = {
    lancer,
    csv: telecharger,
    stop() { etat.arret = true; dire('Arrêt demandé…'); },
    oublier: () => Memoire.vider().then(() => { if (ui) ui.boutons(false); }),
    panneau,
    fiches: etat.fiches,
  };

  // Hors du portail, le script n'a rien à lire : mieux vaut le dire tout de
  // suite que de laisser un panneau qui échouerait à la première requête.
  if (!/module=rsst|registre-sante-securite/.test(location.href + document.body.innerHTML.slice(0, 4000))) {
    alert('Contenu des signalements\n\n' +
      'Ouvrez d\'abord le registre, puis cliquez de nouveau ce favori :\n' +
      'https://portail.ac-amiens.fr/registre-sante-securite/');
    return;
  }

  // Le panneau s'ouvre quoi qu'il arrive : sans stockage — navigation privée,
  // écriture refusée, base occupée — on travaille en mémoire vive, ce qui
  // vaut toujours mieux qu'une page où il ne se passe rien.
  const delai = new Promise((ok) => setTimeout(ok, 3000));
  Promise.race([Memoire.charger(), delai])
    .catch(() => {})
    .then(() => {
      panneau();
      if (!etat.fiches.size && etat.releve === null) return;
    });
  console.log('%crsst-contenu prêt.', 'color:#2a78d6;font-weight:bold');
})();
