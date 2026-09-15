# Points à relier

Des fiches de points à relier où l'ordre ne vient pas d'une numérotation, mais
des **résultats des calculs** : chaque point porte une opération, et on relie du
plus petit au plus grand.

**En ligne :** https://remy-live.github.io/pages-/relier/

## Le principe

Chaque point du dessin reçoit un calcul. L'élève calcule, trie, et relie dans
l'ordre croissant — ou décroissant. Le tracé referme la figure sur le point de
départ, marqué en jaune, et révèle le dessin.

Les résultats d'une même fiche sont **tous différents** : sans ça, deux points
seraient interchangeables et le tracé pourrait partir de travers.

## Les calculs

Onze types, chacun sur cinq niveaux :

| | |
|---|---|
| **Nombres entiers** | sans calcul, pour le tri seul |
| **Additions**, **Soustractions** | de 10 à 1 000 selon le niveau |
| **Multiplications**, **Divisions** | tables, puis grands nombres |
| **Mélange des 4 opérations** | tire au hasard parmi les quatre |
| **Nombres relatifs** | `(−7) + 3`, et la multiplication à partir du niveau 4 |
| **Nombres décimaux** | au dixième, puis au centième |
| **Fractions** | à comparer entre elles |
| **Carrés et puissances** | carrés, cubes, puissances de 2 et de 3 |
| **Priorités opératoires** | `3 × 4 + 7`, `(2 + 5) × 6` |

## Les dessins

Trente-sept figures rangées en cinq familles — formes, animaux, nature, objets,
véhicules — de 6 à 26 points. Le **niveau d'un dessin** se déduit de son nombre
de points, et « au hasard » pioche dans ceux qui correspondent au niveau choisi.
La galerie du bas permet aussi d'en choisir un directement.

## À l'écran ou sur papier

**Jouer** rend les points cliquables : un bon point trace le segment, un mauvais
dit dans quel sens chercher (« il te faut un résultat plus petit »). *Indice*
fait clignoter le point attendu, au prix d'une erreur. Le compteur suit les
points placés, les erreurs et le temps.

**Imprimer / PDF** sort deux pages : la fiche avec un cartouche prénom et date,
puis sa solution. **SVG exercice** et **SVG solution** exportent le dessin seul,
vectoriel, pour le reprendre dans un traitement de texte.

Deux curseurs règlent la taille des points et celle du texte, pour une
photocopie lisible ou une fiche dense.

## Comment ça marche

Un seul fichier, `index.html` : HTML, CSS et JavaScript, aucun outil de build,
aucun appel réseau.

Les dessins sont des listes de points en coordonnées 0–100, l'ordre du tableau
étant l'ordre du tracé. Le placement des étiquettes est calculé : pour chaque
point, la normale extérieure au contour donne une direction de départ, puis une
quarantaine de positions candidates sont notées — chevauchement avec une autre
étiquette, avec un point, avec un segment du tracé — et la moins mauvaise est
retenue. C'est ce qui évite les nombres posés les uns sur les autres sur les
figures serrées.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000/relier/
```
