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

## Ce que ces tests ne disent pas

Ils garantissent que le calcul **ne change pas par accident**. Ils ne disent rien
de sa **justesse** : les valeurs restent à recouper avec les lignes directrices
de gestion académiques de la campagne. Le champ `verifie_contre_les_ldg` du
fichier de barème est à `false` tant que ce recoupement n'a pas été fait.
