# Puzzle de calcul

Fabrique automatiquement une fiche « puzzle » : une image découpée en pièces
carrées, un plateau d'énoncés, la banque de pièces mélangées et le corrigé.

**En ligne :** https://remy-live.github.io/pages-/puzzle/

## Le principe

C'est le procédé fait jusqu'ici à la main dans LibreOffice Draw, mais automatisé :

1. une image (silhouette, dessin au trait) est posée sur une grille de carrés ;
2. chaque carré ne montre que le morceau d'image qui tombe dedans — c'est une pièce ;
3. chaque pièce porte le **résultat** d'un calcul, les pièces sont mélangées (et
   éventuellement tournées) ;
4. le plateau porte les **énoncés**, une case par pièce, à la même taille.

L'élève calcule, cherche la pièce qui porte son résultat et la colle sur la case.
Si tout est juste, l'image se reconstitue : elle sert d'autocorrection.

## Réglages

| Réglage | Ce qu'il change |
|---|---|
| **Image** | quatre dessins fournis, ou un fichier à toi (SVG de préférence, sinon PNG/JPEG) |
| **Cadrage** | remplir la grille (recadre les bords) ou tout montrer ; zoom et décalages |
| **Découpe** | de 2 à 12 colonnes et lignes, soit 4 à 144 pièces |
| **Rotation** | aucune, demi-tours, ou quarts de tour |
| **Mélange** | une graine : même graine = même fiche, « Remélanger » en tire une autre |
| **Calculs** | cinq générateurs, ou ta propre liste tapée à la main |
| **Étiquettes** | position du nombre sur la pièce, taille, halo blanc, fond gris |
| **Pages** | banque sur la même page ou séparée, corrigé optionnel |

Tout est enregistré dans le navigateur : la fiche est retrouvée telle quelle à la
prochaine visite.

## Les calculs

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

## Impression

Bouton **Imprimer / enregistrer en PDF**, puis dans la boîte du navigateur :
format A4, marges « aucune », et **Graphiques d'arrière-plan** coché si les fonds
gris des pièces manquent.

## Comment ça marche

Un seul fichier, `index.html` : HTML, CSS et JavaScript, aucun outil de build,
aucun appel réseau. Une pièce est un carré en `overflow:hidden` qui contient
l'image entière, décalée pour n'en laisser voir que la bonne portion — c'est
l'équivalent de l'intersection faite dans LibreOffice, mais sans toucher au
fichier source. Une image SVG reste donc vectorielle jusqu'au PDF.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/puzzle/
```
