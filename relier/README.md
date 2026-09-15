# Points à relier

Des fiches de points à relier où l'ordre ne vient pas d'une numérotation, mais
des **résultats des calculs** : chaque point porte une opération, et on relie du
plus petit au plus grand. L'élève calcule, découvre un animal, apprend son nom,
le recopie, puis le colorie.

**En ligne :** https://remy-live.github.io/pages-/relier/

## Le principe

Chaque point du dessin reçoit un calcul. L'élève calcule, trie, et relie dans
l'ordre croissant — ou décroissant. Le tracé referme la figure sur le point de
départ, marqué en jaune, et révèle le dessin.

Les résultats d'une même fiche sont **tous différents** : sans ça, deux points
seraient interchangeables et le tracé pourrait partir de travers.

## Le nombre de points, au choix

Les dessins ne sont pas des listes de points figées : ce sont des **contours**.
Le nombre de points est un réglage, **de 4 à 200**, et la figure est
rééchantillonnée dessus à chaque fois. Le même animal fait une fiche de 12
points pour un CP et de 150 points pour un CM2.

Le rééchantillonnage garde d'abord les angles (Douglas-Peucker), puis répartit
les points restants sur les plus longs arcs, et rééquilibre pour éviter les
paquets. La galerie indique pour chaque dessin à partir de combien de points il
reste lisible.

## L'intervalle des résultats

Deux champs — **« Résultats — de … à … »** — fixent l'intervalle dans lequel
tombent les résultats, 1 à 200 par défaut. Tous les générateurs le respectent :
une addition tire d'abord son résultat dans l'intervalle, puis se décompose ;
une multiplication cherche un facteur de la table qui y mène ; une division part
du quotient.

Si l'intervalle ne contient pas assez de résultats différents pour le nombre de
points demandé — 40 points dans 1 → 20, c'est impossible — il est **élargi
automatiquement** et la page le dit. Les fractions font exception : elles
dépendent du niveau, pas de l'intervalle, et c'est le niveau qui monte si le
choix est trop maigre.

## Les calculs

Onze types, chacun sur cinq niveaux :

| | |
|---|---|
| **Nombres entiers** | sans calcul, pour le tri seul — le bon choix au-delà de 80 points |
| **Additions**, **Soustractions** | décomposent un résultat pris dans l'intervalle |
| **Multiplications**, **Divisions** | tables du niveau, produit ou quotient dans l'intervalle |
| **Mélange des 4 opérations** | tire au hasard parmi les quatre |
| **Nombres relatifs** | `(−7) + 12`, et la multiplication à partir du niveau 4 |
| **Nombres décimaux** | au dixième, puis au centième |
| **Fractions** | à comparer entre elles |
| **Carrés et puissances** | carrés, cubes, puissances de 2 et de 3 |
| **Priorités opératoires** | `3 × 4 + 7`, `(2 + 5) × 6` |

## Les dessins

Quatre-vingt-quinze figures, dont **soixante animaux** rangés en quatre
familles — Animaux, Oiseaux, Mer, Petites bêtes — plus les formes, objets,
véhicules et éléments de nature d'origine.

Le choix penche vers les espèces qu'on croise peu : pangolin, tatou, okapi,
ornithorynque, échidné, binturong, ratel, capybara, wombat, fennec, coati,
narval, lamantin, raie manta, poisson-lune, murène, seiche, macareux, kiwi,
colibri, lucane, mante religieuse… Chacun porte une phrase à savoir, montrée
quand la partie est gagnée et imprimée sur la page solution.

## L'atelier

**Créer un dessin…** ouvre un atelier qui fabrique un point-à-relier sur
n'importe quel sujet, de trois façons :

- **Dessiner** — tracer le contour d'un seul trait, à la souris ou au doigt ;
  il se referme et se lisse tout seul.
- **À partir d'une image** — charger une photo ou un PNG détouré. La page
  binarise l'image (seuil réglable, ou le canal alpha si l'image est détourée),
  garde la plus grosse tache, et suit son contour en *marching squares*.
- **Coller un tracé SVG** — un attribut `d` ou un fichier SVG entier ; le plus
  long tracé est retenu et échantillonné.

Le dessin obtenu prend un nom, une phrase à savoir, et rejoint la galerie sous
**Mes dessins**. Il se règle ensuite au nombre de points voulu comme les autres.
Tout est gardé dans le `localStorage` du navigateur ; **Exporter** et
**Importer** font passer la bibliothèque d'un appareil à l'autre en JSON.

## À l'écran ou sur papier

**Jouer** rend les points cliquables : un bon point trace le segment, un mauvais
dit dans quel sens chercher (« il te faut un résultat plus petit »). *Indice*
fait clignoter le point attendu, au prix d'une erreur.

**Cacher le nom** garde la surprise : la fiche s'appelle « Dessin mystère »
jusqu'à ce que le tracé soit fini.

**Imprimer / PDF** sort deux pages — la fiche puis sa solution — avec, sous le
dessin, les lignes pour écrire le nom de l'animal, le recopier et penser à le
colorier. L'orientation suit la figure : une silhouette large s'imprime en
paysage. **SVG exercice**, **SVG solution** et **SVG à colorier** exportent le
dessin seul, vectoriel ; le dernier ne contient que le contour, sans chiffres,
prêt pour les crayons de couleur.

## Comment ça marche

Un seul fichier, `index.html` : HTML, CSS et JavaScript, aucun outil de build,
aucun appel réseau.

Les contours sont des listes de points en coordonnées 0–100, l'ordre du tableau
étant le sens du tracé ; un contour marqué `lisse` passe par un lissage de
Chaikin avant d'être densifié. Aucun ne se recoupe — un contour qui se croise
fait une figure fausse à colorier.

Le placement des étiquettes est calculé : pour chaque point, la normale
extérieure au contour donne une direction de départ, puis une trentaine de
positions candidates sont notées — chevauchement avec une autre étiquette, avec
un point, avec un segment du tracé — et la moins mauvaise est retenue. Les
candidats sont testés contre une grille d'occupation, ce qui tient encore à 200
points.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/relier/
```
