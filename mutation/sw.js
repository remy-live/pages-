/* Service worker d'Aide Mutation.
 *
 * Objectif : que la page s'ouvre le jour de la saisie même si le réseau de
 * l'établissement est capricieux, et que les allers-retours ne re-téléchargent
 * pas les mêmes fichiers.
 *
 * Trois régimes :
 *   - la coquille (page, bibliothèques, petites données) est mise en cache à
 *     l'installation, et servie depuis le cache en priorité ;
 *   - les gros fichiers optionnels (transport, bibliothèque PDF) entrent en
 *     cache la première fois qu'on s'en sert ;
 *   - les tuiles de carte sont conservées au fil de la navigation, dans un
 *     cache plafonné, pour que les zones déjà consultées restent lisibles
 *     hors connexion.
 *
 * Pour forcer la mise à jour chez tout le monde : incrémenter VERSION.
 */

const VERSION = 'v4';
const CACHE_COQUILLE = `mutation-coquille-${VERSION}`;
const CACHE_ANNEXES = `mutation-annexes-${VERSION}`;
const CACHE_TUILES = `mutation-tuiles-${VERSION}`;
const MAX_TUILES = 500;

/* Tout ce qu'il faut pour afficher une carte utilisable : ~500 Ko. */
const COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone-192.png',
  './icone-512.png',
  './vendor/leaflet.js',
  './vendor/leaflet.css',
  './vendor/papaparse.min.js',
  './vendor/images/marker-icon.png',
  './vendor/images/marker-icon-2x.png',
  './vendor/images/marker-shadow.png',
  './vendor/images/layers.png',
  './vendor/images/layers-2x.png',
  './data/bareme-intra-2026.json',
  './data/etablissements.csv',
  './data/regroupements.json',
  './data/zones_remplacement.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_COQUILLE);
    /* addAll échoue en bloc si une seule ressource manque : on les prend une par
       une pour qu'un fichier absent ne prive pas l'utilisateur de tout le reste. */
    await Promise.all(COQUILLE.map(url =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
    ));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const noms = await caches.keys();
    const garder = [CACHE_COQUILLE, CACHE_ANNEXES, CACHE_TUILES];
    await Promise.all(noms
      .filter(nom => nom.startsWith('mutation-') && !garder.includes(nom))
      .map(nom => caches.delete(nom)));
    await self.clients.claim();
  })());
});

/* La page peut demander l'activation immédiate d'une version en attente. */
self.addEventListener('message', event => {
  if (event.data === 'activer-maintenant') self.skipWaiting();
});

async function plafonner(nomCache, maximum) {
  const cache = await caches.open(nomCache);
  const cles = await cache.keys();
  /* Les entrées sont rendues dans leur ordre d'insertion : on retire les plus anciennes. */
  for (let i = 0; i < cles.length - maximum; i++) await cache.delete(cles[i]);
}

async function reseauPuisCache(requete, nomCache, plafond) {
  const cache = await caches.open(nomCache);
  try {
    const reponse = await fetch(requete);
    if (reponse && reponse.ok) {
      cache.put(requete, reponse.clone());
      if (plafond) plafonner(nomCache, plafond);
    }
    return reponse;
  } catch (err) {
    const enCache = await cache.match(requete);
    if (enCache) return enCache;
    throw err;
  }
}

async function cachePuisReseau(requete, nomCache) {
  const cache = await caches.open(nomCache);
  const enCache = await cache.match(requete);
  if (enCache) {
    /* Rafraîchissement en tâche de fond : la visite suivante aura la version à jour. */
    fetch(requete).then(reponse => {
      if (reponse && reponse.ok) cache.put(requete, reponse.clone());
    }).catch(() => null);
    return enCache;
  }
  const reponse = await fetch(requete);
  if (reponse && reponse.ok) cache.put(requete, reponse.clone());
  return reponse;
}

self.addEventListener('fetch', event => {
  const requete = event.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);

  /* Tuiles de fond de carte : d'abord le réseau, le cache sert de filet. */
  if (url.hostname.endsWith('basemaps.cartocdn.com')) {
    event.respondWith(reseauPuisCache(requete, CACHE_TUILES, MAX_TUILES));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Navigation : la page en cache si le réseau ne répond pas. */
  if (requete.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(requete);
      } catch (err) {
        const cache = await caches.open(CACHE_COQUILLE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  const dansLaCoquille = COQUILLE.some(chemin =>
    url.pathname.endsWith(chemin.replace('./', '/')) || url.pathname.endsWith(chemin.replace('./', '')));

  event.respondWith(cachePuisReseau(requete, dansLaCoquille ? CACHE_COQUILLE : CACHE_ANNEXES));
});
