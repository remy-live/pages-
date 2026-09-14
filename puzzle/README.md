# Puzzle de calcul

Fabrique une fiche « puzzle » : une ou plusieurs silhouettes découpées en pièces,
un plateau d'énoncés, la banque de pièces mélangées et le corrigé. À imprimer,
ou à jouer directement à l'écran.

**En ligne :** https://remy-live.github.io/pages-/puzzle/

## Le principe

C'est le procédé fait jusqu'ici à la main dans LibreOffice Draw, mais automatisé :

1. un dessin est posé sur une grille ;
2. chaque case ne montre que le morceau qui tombe dedans — c'est une pièce ;
3. chaque pièce porte le **résultat** d'un calcul, les pièces sont mélangées (et
   éventuellement tournées) ;
4. le plateau porte les **énoncés**, une case par pièce, exactement à la même taille.

L'élève calcule, cherche la pièce qui porte son résultat et la colle sur la case.
Si tout est juste, l'image se reconstitue : elle sert d'autocorrection.

## Trois temps

Les trois pastilles en haut de la page mènent d'un temps à l'autre.

**1 · Mise en page.** Une feuille A4 grandeur nature, grille dessinée dessus.
Orientation et répartition plateau/pièces se choisissent sur des images de
feuilles, colonnes et lignes au bouton `+` / `−`, marges au curseur — la feuille
suit à chaque fois.

**2 · La fiche.** Le bouton **Créer le puzzle** — ou la pastille **2** — pose la
fiche. À côté du bouton : la **rotation des pièces** (aucune, demi-tour, quart de
tour, montrée sur un « 12 » qui bascule) et l'interrupteur **nombres toujours à
l'endroit**. Les pages sortent en grand, avec *Remélanger*, *Plein écran* et
*Imprimer*.

**3 · Jouer.** Le même puzzle, à l'écran, au doigt ou à la souris :

- **glisser-déposer** une pièce du bac vers sa case — deux pièces posées
  s'échangent si on traîne l'une sur l'autre, et une pièce ramenée sur le bac y
  retourne ;
- ou **toucher** la pièce puis la case, ce qui marche aussi bien sur un écran tactile.

*Tourner la pièce* fait pivoter celle qu'on tient, quand le puzzle est à rotations.
*Vérifier* marque en vert ce qui est bien placé et en rouge le reste ; quand tout
est juste, l'image apparaît d'un coup.

## Le plan de travail

La feuille du premier temps se manipule directement :

- **glisser** un dessin pour le déplacer ;
- **molette** ou **pincement à deux doigts** pour changer sa taille ;
- **poignée ronde** (ou le pincement) pour le **tourner**, sous n'importe quel angle ;
- **double-clic**, ou le bouton *Replacer*, pour tout remettre au centre et d'aplomb ;
- au clavier : flèches pour déplacer (avec Maj, cinq fois plus vite), `+` et `-`
  pour la taille, `r` et `R` pour l'angle ;
- **Ctrl + molette**, ou les boutons `−` `+` au-dessus de la feuille, pour grossir
  l'affichage sans toucher au dessin — la feuille défile alors dans son cadre.

**Plusieurs dessins** peuvent être posés sur la même feuille : le `+` de la bande
en ajoute un, un clic sur une vignette — ou sur le dessin lui-même — choisit celui
qu'on manipule, *Passer devant* règle l'ordre, *Retirer* en enlève un. La
silhouette cliquée dans la galerie remplace le dessin choisi.

## Réglages

| Réglage | Ce qu'il change |
|---|---|
| **La feuille** | portrait ou paysage, plateau et pièces sur une ou deux feuilles, marges de 0 à 25 mm |
| **Les cases** | de 2 à 14 colonnes et lignes, soit 4 à 196 pièces ; carrées, ou étirées pour remplir la feuille |
| **Les dessins** | quarante-six silhouettes fournies, rangées par familles — vingt-deux animaux, objets, villes (New York, Paris, Londres), Halloween, Noël, Pâques — ou tes fichiers (SVG de préférence, sinon PNG/JPEG) |
| **Les calculs** | sept générateurs, dont cinq réglables (opérations et intervalle), ou ta propre liste ; une graine de mélange (même graine = même fiche) |
| **Rotation** | aucune, demi-tours, ou quarts de tour — avec l'option de garder les **nombres à l'endroit** |
| **Finitions** | corrigé, consigne, titres de section, position et taille des nombres, halo blanc, fond gris |

Il n'y a ni en-tête ni pied de page : la grille occupe toute la place disponible.

## Enregistrer, exporter, importer

La carte **Mes puzzles** garde autant de fiches qu'on veut, dans le
`localStorage` du navigateur : un nom, *Enregistrer*, et elles se retrouvent dans
la liste avec *Ouvrir* et *✕*. Le réglage en cours est de toute façon retenu tout
seul d'une visite à l'autre.

**Exporter un fichier** écrit un `.json` contenant le puzzle en cours **et** toute
la bibliothèque ; **Importer** le relit sur un autre appareil ou un autre
navigateur. C'est le seul moyen de faire voyager les puzzles, puisque rien ne
part sur un serveur.

Le stockage d'un navigateur est limité (quelques mégaoctets). Des images
importées lourdes peuvent le remplir : la page le dit alors, et le fichier
exporté reste la porte de sortie.

## Les calculs

### Les générateurs réglables

**Additions**, **Soustractions**, **Multiplications**, **Divisions exactes** et
**Opérations mélangées** partagent les mêmes réglages : l'**intervalle** des
nombres tirés, et une case pour les décimaux au dixième. « Opérations mélangées »
laisse en plus cocher les opérations voulues — **+ − × ÷**, une ou plusieurs.

Un intervalle qui descend sous zéro donne des **relatifs**, écrits comme au
tableau : `(−7) + 3`, `5 × (−4)`.

En division, le diviseur et le quotient sont pris dans l'intervalle pour que le
calcul tombe juste ; le dividende, lui, peut le dépasser — c'est le prix d'une
division exacte.

Sous les réglages, la page annonce en permanence **combien de résultats
différents** ces bornes peuvent produire, et combien de cases il y a à remplir.

### Ta propre liste

Une ligne par case, dans la zone de texte. Le résultat est calculé tout seul :

```
12 ÷ 10
0,2 × 10 000
(2 + 3) × 4
```

`×` `x` `*`, `÷` `:` `/`, `+`, `-`, `^` et les parenthèses sont compris, la
virgule décimale et les espaces des milliers aussi. Pour imposer une réponse que
la machine ne sait pas calculer, écrire `énoncé = réponse` :

```
Le tiers de 27 = 9
```

**Deux résultats identiques rendent le puzzle ambigu** : les deux pièces
deviennent interchangeables, et un élève qui calcule juste peut quand même
casser l'image. La page le signale, et les générateurs ne produisent que des
résultats tous différents.

C'est aussi ce qui les limite. Des additions de 1 à 10 ne donnent que **19
sommes différentes** : elles ne peuvent pas remplir 36 cases, quoi qu'on fasse.

Pour les cinq générateurs réglables, la page **élargit l'intervalle toute seule**
jusqu'à avoir de quoi remplir, met à jour les bornes affichées, et dit ce qu'elle
a fait. Les générateurs non réglables (×÷ par 10, par 0,1) n'ont pas ce recours :
quand il leur manque des résultats, la barre du bas l'annonce — **à chacune des
trois étapes** — et l'avertissement du panneau porte le bouton qui régénère la
bonne quantité.

## Impression

**Imprimer** ouvre la boîte du navigateur : le format (A4 portrait ou paysage)
est déjà posé, il reste à mettre les marges sur « aucune » et à cocher
**Graphiques d'arrière-plan** si les fonds gris des pièces manquent.

## Comment ça marche

Un seul fichier, `index.html` : HTML, CSS et JavaScript, aucun outil de build,
aucun appel réseau. Une pièce est une case en `overflow:hidden` qui contient les
dessins entiers, décalés pour n'en laisser voir que la bonne portion — c'est
l'équivalent de l'intersection faite dans LibreOffice, mais sans toucher aux
fichiers source. Une image SVG reste donc vectorielle jusqu'au PDF.

Les silhouettes fournies sont dessinées à la main dans le fichier, en SVG.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/puzzle/
```
