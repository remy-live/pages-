# Puzzle de calcul

Fabrique une fiche « puzzle » : une silhouette découpée en pièces, un plateau
d'énoncés, la banque de pièces mélangées et le corrigé.

**En ligne :** https://remy-live.github.io/pages-/puzzle/

## Le principe

C'est le procédé fait jusqu'ici à la main dans LibreOffice Draw, mais automatisé :

1. une image est posée sur une grille ;
2. chaque case ne montre que le morceau d'image qui tombe dedans — c'est une pièce ;
3. chaque pièce porte le **résultat** d'un calcul, les pièces sont mélangées (et
   éventuellement tournées) ;
4. le plateau porte les **énoncés**, une case par pièce, exactement à la même taille.

L'élève calcule, cherche la pièce qui porte son résultat et la colle sur la case.
Si tout est juste, l'image se reconstitue : elle sert d'autocorrection.

## Le plan de travail

En haut de la page, une feuille grandeur nature porte la grille et le dessin.
C'est là qu'on place l'image, à la main :

- **glisser** le dessin pour le déplacer ;
- **molette** ou **pincement à deux doigts** pour changer sa taille ;
- **poignée ronde** (ou le pincement) pour le **tourner** — sous n'importe quel angle ;
- **double-clic**, ou le bouton *Replacer*, pour tout remettre au centre et d'aplomb ;
- au clavier : flèches pour déplacer (avec Maj, cinq fois plus vite), `+` et `-`
  pour la taille, `r` et `R` pour l'angle.

Les curseurs *Zoom* et *Rotation du dessin* font la même chose au degré près.
Cette feuille ne s'imprime pas : elle sert à voir ce que chaque case va attraper.

## Réglages

| Réglage | Ce qu'il change |
|---|---|
| **Silhouette** | dix-sept dessins fournis, ou un fichier à toi (SVG de préférence, sinon PNG/JPEG) |
| **Cadrage** | remplir la grille ou tout montrer — le calcul tient compte de l'angle du dessin |
| **Découpe** | de 2 à 14 colonnes et lignes, soit 4 à 196 pièces |
| **Rotation** | aucune, demi-tours, ou quarts de tour — avec l'option de garder les **nombres à l'endroit** |
| **Cases carrées** | décochée, les cases s'étirent pour remplir toute la page (imposée aux quarts de tour) |
| **Mélange** | une graine : même graine = même fiche, « Remélanger » en tire une autre |
| **Calculs** | cinq générateurs, ou ta propre liste tapée à la main |
| **Page** | portrait ou paysage, marges de 0 à 25 mm, pièces sur une page à part, corrigé, consigne, titres |
| **Nombres** | position sur la pièce, taille, halo blanc, fond gris |

Il n'y a ni en-tête ni pied de page : la grille occupe toute la place disponible.
Tout est enregistré dans le navigateur et retrouvé à la visite suivante.

## Aperçu et impression

**Aperçu** ouvre les pages en plein écran, telles qu'elles sortiront. De là ou
depuis la barre du haut, **Imprimer** ouvre la boîte du navigateur : le format
(A4 portrait ou paysage) est déjà posé, il reste à mettre les marges sur
« aucune » et à cocher **Graphiques d'arrière-plan** si les fonds gris des pièces
manquent.

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

## Comment ça marche

Un seul fichier, `index.html` : HTML, CSS et JavaScript, aucun outil de build,
aucun appel réseau. Une pièce est une case en `overflow:hidden` qui contient
l'image entière, décalée pour n'en laisser voir que la bonne portion — c'est
l'équivalent de l'intersection faite dans LibreOffice, mais sans toucher au
fichier source. Une image SVG reste donc vectorielle jusqu'au PDF.

Les silhouettes fournies sont dessinées à la main dans le fichier, en SVG.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/puzzle/
```
