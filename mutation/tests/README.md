# Vérifier le calcul du barème

Ces deux scripts existent pour une raison précise : **changer une valeur du barème
sans savoir ce qu'on casse est le risque principal de ce projet.** Les points
décident d'une affectation ; une erreur ne se voit pas à l'écran, elle se voit en
juin quand quelqu'un n'a pas le poste qu'il croyait pouvoir viser.

## Préparation

```sh
cd mutation
npm install --no-save playwright     # une seule fois
python3 -m http.server 8000 &        # depuis la racine du dépôt
```

Les scripts attendent le site sur `http://127.0.0.1:8765/mutation/` ; ajustez la
constante `BASE` en tête de fichier si vous servez ailleurs.

## `bareme-instantane.mjs` — le filet

Rejoue 2000 combinaisons de situations (classe, échelon, ancienneté, famille,
enfants, séparation, vœu préférentiel, stagiaire, TZR, RQTH, carte scolaire,
sortie d'éducation prioritaire, corps, type de vœu, type d'établissement) et
compare chaque total **et chaque ligne de détail** à une référence enregistrée.

```sh
node tests/bareme-instantane.mjs verifier   # compare — sortie non nulle si écart
node tests/bareme-instantane.mjs ecrire     # réenregistre la référence
```

Les cas sont tirés par un générateur déterministe : deux exécutions portent
exactement sur les mêmes combinaisons. Le fichier de référence ne garde donc que
les résultats, et une signature interdit de comparer deux séries différentes.

**La marche à suivre pour une mise à jour annuelle :**

1. `node tests/bareme-instantane.mjs verifier` — doit passer avant de commencer.
2. Modifier `data/bareme-intra-2026.json`.
3. `verifier` de nouveau : il échoue, c'est normal. **Lire les écarts** — ils
   disent exactement quelles situations changent et de combien. C'est le moment
   de confirmer que ce sont bien celles que vous vouliez changer, et seulement
   celles-là.
4. Une fois convaincu : `ecrire` pour figer le nouveau comportement.

Ne jamais faire `ecrire` sans avoir lu les écarts : cela reviendrait à effacer le
filet plutôt qu'à s'en servir.

## `bareme-pilote.mjs` — la preuve que le fichier sert

```sh
node tests/bareme-pilote.mjs
```

Vérifie que `data/bareme-intra-2026.json` pilote réellement le calcul : il sert
un barème modifié à la page et contrôle que le total bouge d'exactement ce qui a
été changé. Il vérifie aussi le cas du fichier absent — la page doit prévenir
sans annoncer de points inventés, et sans planter.

Sans ce test, on pourrait croire le barème externalisé alors que le code
continuerait de calculer avec ses anciennes valeurs.

## `reglages-mobile.mjs` — la mise en page du panneau

```sh
node tests/reglages-mobile.mjs
```

Le panneau « Ma situation » ne fait que 380 px, et moins encore au téléphone.
Il tenait deux colonnes, ce qui tronquait les menus (« Certifié / PLP / PE… »)
et désalignait un champ de son libellé dès que celui-ci passait à la ligne.

Le test contrôle sur trois modèles de téléphone et sur grand écran qu'aucun
champ n'est écrasé, que chaque libellé partage le bord gauche de son champ,
qu'aucun couple de champs ne se retrouve côte à côte, et qu'il n'y a pas de
débordement horizontal.

## `assistant-mobile.mjs` — l'assistant au pouce

```sh
node tests/assistant-mobile.mjs
```

Sur un iPhone réel, le bouton « Suivant » se retrouvait sous la barre d'outils de
Safari : on voyait un liseré bleu au ras du bas, sans pouvoir l'atteindre. Deux
causes se cumulaient — `vh` ignore cette barre, et `.modal-content` n'avait pas
`box-sizing: border-box`, si bien que ses 20 px de marge intérieure débordaient
l'écran par la droite.

Le test contrôle sur quatre gabarits, dont un écran de 320×480 et un iPhone avec
la barre affichée, que le bouton est visible sans faire défiler, qu'il le reste
une fois l'étape parcourue jusqu'en bas, et qu'il est réellement cliquable. Il
vérifie aussi qu'une réponse saisie est enregistrée sans changer d'étape et
survit à un rechargement.

## `strategie.mjs` — le guide dit-il vrai ?

```sh
node tests/strategie.mjs
```

Le guide serait sans valeur s'il récitait des généralités. Le test construit de
vraies listes de vœux à partir des données de l'académie et vérifie qu'il
détecte bien chaque piège : un vœu précis rendu inopérant par le groupement qui
le précède, la disparition de l'alerte une fois l'ordre corrigé, le décompte des
établissements couverts par un vœu large, un établissement écarté joignable
malgré tout, les points familiaux chiffrés, l'ordre du rapprochement de
conjoint, et la contrainte de la mutation simultanée.

Il contrôle aussi que **cocher « mutation simultanée » ne change aucun total** :
tant que la valeur n'est pas établie, l'option ne doit inventer aucun point.

## `verifier-bareme.mjs` — la page de recoupement

```sh
node tests/verifier-bareme.mjs
```

`verifier-bareme.html` sert à confronter le barème aux LDG et à produire le
fichier corrigé. Le test contrôle qu'elle présente bien les vingt règles avec
les valeurs du fichier, qu'elle signale les deux valeurs manquantes, qu'une
correction est mise en évidence avec son ancienne valeur, et surtout que le
fichier téléchargé est exploitable : la correction s'y trouve, la référence est
rangée près de la règle, la date est portée, **rien d'autre n'a bougé**, et
`verifie_contre_les_ldg` ne passe à `true` que si tout a été coché.

## `tablette-et-filtres.mjs` — la place de la carte, et les filtres

```sh
node tests/tablette-et-filtres.mjs
```

Deux panneaux ancrés de 380 px ne laissaient que **260 px de carte sur une
tablette de 1024 px**, et 48 % de l'écran sur un portable de 1280. Le test
contrôle de 834 à 1440 px que la carte occupe l'essentiel de la largeur et
qu'aucun débordement n'apparaît.

Il vérifie aussi que les filtres d'éducation prioritaire retirent exactement les
établissements visés — 13 REP+ et 30 REP dans l'académie — que tout décocher ne
laisse rien et que le compteur le dit, que le choix survit au rechargement, et
que l'avertissement contre le malentendu est bien présent : masquer un
établissement de la carte ne l'exclut pas d'un vœu large.

## `liste-voeux.mjs` — la carte de vœu

```sh
node tests/liste-voeux.mjs
```

La carte alignait six éléments de force égale : une pastille de type, un code en
rouge sur gris, un rang, deux flèches, une ampoule et les points. Sur un
téléphone, le code passait à la ligne, « 35 pts » se coupait en deux, le rang
chevauchait les flèches, et deux des cinq actions du bilan restaient sous la
ligne de flottaison.

Le test contrôle sur iPhone SE, iPhone 13 et grand écran que rien ne se coupe ni
ne déborde, que les libellés sont écrits correctement — « Établissement » et non
« ETABLISSEMENT » ni « etablissement » —, que les cinq actions du bilan sont
visibles sans faire défiler, que les flèches font au moins 32 px de côté, et
qu'elles réordonnent toujours.

## `detail-voeu.mjs` — le dépliage, et la fenêtre qui ripait

```sh
node tests/detail-voeu.mjs
```

Deux choses à la fois.

Le détail d'un vœu s'ouvrait dans une **fenêtre par-dessus la fenêtre** : il
fallait sortir de sa liste pour comprendre une ligne, puis y revenir. Il se
déplie maintenant dans la carte, sous un chevron. Le test vérifie qu'il s'ouvre
au bon endroit sans seconde fenêtre, qu'il explique bien les points *et* ce qui
est refusé sur ce type de vœu, que l'état est annoncé aux lecteurs d'écran, et
que l'ouverture **suit le vœu quand on le réordonne** plutôt que de rester
accrochée à un rang.

Et la fenêtre **ripait latéralement** : le titre se retrouvait coupé à gauche.
`overflow-y: auto` était déclaré seul, ce qui, d'après la spec CSS, force
`overflow-x` à `auto` — le moindre dépassement rendait donc toute la fenêtre
baladeuse au doigt. Le test essaie de la faire riper, détail replié puis
déplié, et contrôle qu'elle ne bouge pas.

## `recherche-et-entete.mjs` — chercher une ville, et un barème à quatre chiffres

```sh
node tests/recherche-et-entete.mjs
```

La recherche trouvait bien les villes, mais ne renvoyait que des
**établissements** : taper « Laon » listait six lycées et collèges sans jamais
proposer la commune de Laon, qui est pourtant le vœu qui porte les
bonifications. Elle renvoie maintenant d'abord les zones — commune, groupements,
zone de remplacement — avec le nombre d'établissements que chacune recouvre.

Le test vérifie que « Laon » propose la commune, les groupements et la ZR avant
les établissements, que choisir une commune depuis le mode Groupements bascule
de mode, s'y rend et ouvre la bulle « Ajouter ce vœu ».

Côté en-tête, la largeur du badge de barème décidait des retours à la ligne :
passer de 35 à 1535 points redistribuait toute la mise en page. Le test mesure la
hauteur de l'en-tête pour 0, 35, 485, 1535 et 3179,2 points sur deux téléphones,
et exige qu'elle ne bouge pas d'un pixel.

## Ce que ces tests ne disent pas

Ils garantissent que le calcul **ne change pas par accident**. Ils ne disent rien
de sa **justesse** : les valeurs restent à recouper avec les lignes directrices
de gestion académiques de la campagne. Le champ `verifie_contre_les_ldg` du
fichier de barème est à `false` tant que ce recoupement n'a pas été fait.
