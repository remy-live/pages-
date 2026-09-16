# Points à relier

Des fiches de points à relier où l'ordre ne vient pas d'une numérotation, mais
des **résultats des calculs** : chaque point porte une opération, et on relie du
plus petit au plus grand. L'élève calcule, découvre un animal, apprend son nom,
le recopie, puis le colorie.

**En ligne :** https://remy-live.github.io/pages-/relier/

## Deux façons d'entrer

La page s'ouvre sur un choix :

- **Pas à pas** — trois questions (le dessin, les calculs, le nombre de points) et
  la fiche est prête à jouer, à imprimer ou à partager. Une question par écran,
  de grands boutons : c'est le mode à l'aise sur téléphone.
- **Interface complète** — tous les réglages sous les yeux, la galerie entière et
  l'atelier.

On passe de l'une à l'autre par le bouton **Mode**, en haut. Le choix est retenu
d'une visite à l'autre.

## Partager une fiche par lien

**Partager le lien** donne une adresse qui rouvre *exactement* la même fiche :
même dessin, mêmes calculs, même ordre. Le tirage passe par une graine écrite
dans l'adresse — rien n'est envoyé nulle part, tout tient dans l'URL. Le lien
s'ouvre directement en mode jeu, ce qui permet d'envoyer un exercice à un élève
qui n'a qu'à cliquer. Un dessin fait à l'atelier voyage avec le lien : son
contour y est encodé, et celui qui le reçoit peut l'ajouter à sa bibliothèque.

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

Douze types, chacun sur cinq niveaux :

| | |
|---|---|
| **Nombres entiers** | sans calcul, pour le tri seul — le bon choix au-delà de 80 points |
| **Compter de n en n** | une suite régulière : de 7 en 7, de 25 en 25 selon le niveau |
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

La **recherche** au-dessus de la galerie cherche dans les quatre-vingt-quinze
dessins, sans se soucier des accents ni des majuscules, et par famille aussi :
taper « oiseau » les montre tous.

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
jusqu'à ce que le tracé soit fini. Décochée, la fiche imprimée porte le nom
**en lettres creuses à repasser** au crayon, puis une ligne pour le recopier
seul — c'est le même texte, dessiné en trait pointillé au lieu d'être rempli,
donc aucune police particulière n'est nécessaire.

Quand la partie est gagnée, la page affiche un **code de fin** : trois lettres
du nom et quatre caractères calculés sur la fiche elle-même (dessin, graine,
nombre de points, type de calcul). L'élève le recopie sur son cahier ou
l'envoie ; celui qui a partagé le lien voit le même code dans la boîte de
partage et sait de quelle fiche il s'agit. Le temps et les erreurs sont
affichés à côté, mais ils sont déclarés : le code dit de quelle fiche on
parle, pas que personne n'a aidé.

**Imprimer / PDF** sort deux pages — la fiche puis sa solution — avec, sous le
dessin, les lignes pour écrire le nom de l'animal, le recopier et penser à le
colorier. **Imprimer une série** en sort une par élève : mêmes réglages, mais
des calculs différents à chaque fiche, numérotées « fiche 7 sur 25 », les
solutions groupées à la fin, et l'option d'un dessin différent à chaque fois.
Vingt-cinq fiches se fabriquent en un quart de seconde. L'orientation suit la figure : une silhouette large s'imprime en
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

Les deux interfaces pilotent les mêmes champs : le panneau de l'interface
complète reste la source de vérité, le mode guidé ne fait que l'actionner. Il n'y
a donc qu'un seul état, et une seule galerie, rendue à deux endroits.

Les calculs sont tirés par un générateur à graine (*mulberry32* amorcé par un
hachage FNV du texte de la graine) : c'est ce qui rend un lien reproductible.

Le placement des étiquettes est calculé : pour chaque point, la normale
extérieure au contour donne une direction de départ, puis une cinquantaine de
positions candidates sont notées — chevauchement avec une autre étiquette, avec
un point, avec un segment du tracé — et la moins mauvaise est retenue. Les
candidats sont testés contre une grille d'occupation, ce qui tient encore à 200
points.

Avec des résultats à trois chiffres, une étiquette est plus large que l'écart
entre deux points : il faut pouvoir la sortir loin, et un **trait de rappel**
dit alors à quel point elle appartient. Il apparaît quand un autre point la
revendique d'aussi près que le sien, ou quand elle s'en est éloignée de plus
d'une hauteur de texte — pas quand elle est collée à son point, où il ne
servirait à rien. Sur les quatre-vingt-quinze dessins à 16, 24 et 36 points,
cela fait zéro étiquette qui en recouvre une autre, et zéro étiquette ambiguë
sans son trait.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/relier/
```
