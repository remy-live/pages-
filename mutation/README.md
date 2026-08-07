# Aide Mutation — intra 2026, académie d'Amiens

Carte des établissements, simulateur de barème et liste de vœux pour le mouvement
intra-académique. Outil indicatif : le barème qui fait foi est celui d'I-Prof.

**Adresse :** https://remy-live.github.io/pages-/mutation/

Il n'y a plus de fichier à télécharger ni à ouvrir : on partage un lien, la page
s'ouvre sur téléphone comme sur ordinateur, et elle s'installe sur l'écran
d'accueil si on veut.

## Pour quelqu'un qui n'y connaît rien

C'est le cas d'usage principal : un collègue qui entend parler de mutation pour
la première fois et à qui les sigles ne disent rien.

- **Un écran d'accueil qui explique la chose avant de demander quoi que ce soit** :
  ce qu'est le mouvement intra, ce qu'est un barème, et les cinq étapes de la
  procédure — du calcul des points jusqu'aux résultats.
- **Deux entrées au choix** : « Je débute, guidez-moi » ou « Je connais déjà ».
- **Un mode simplifié** qui met de côté ce qui n'a de sens que pour un habitué
  (zones de remplacement, polygones, couches ferroviaires). Un ruban en haut de
  page rappelle qu'on peut tout afficher d'un clic.
- **Un assistant en cinq étapes** qui pose une question à la fois, en français
  ordinaire, avec pour chacune où trouver la réponse : « l'échelon est sur I-Prof,
  onglet Votre carrière », « dans le doute, c'est certifié », « laissez décoché si
  vous n'êtes pas sûr ». Les sigles sont expliqués sur place — TZR, REP, RQTH,
  carte scolaire — au lieu d'être supposés connus.
- **Un bilan qui explique le chiffre** au lieu de l'afficher seul : d'où viennent
  les points, pourquoi le total tombe sur un établissement précis alors qu'il est
  élevé sur une commune, et quels papiers préparer pour Colibris.

L'assistant écrit dans les mêmes champs que le formulaire complet : on peut
passer de l'un à l'autre sans rien perdre, et le rouvrir plus tard le retrouve
pré-rempli.

## Ce que ça sait faire

- **Chercher** un établissement ou une commune, au clavier comme au doigt.
- **Simuler son barème** — carrière, situation familiale, bonifications — avec le
  détail réglementaire de chaque vœu et la liste des justificatifs à fournir.
- **Filtrer la carte** par type d'établissement (collège, lycée, lycée pro), par
  classement en éducation prioritaire (REP+, REP, hors EP), par groupement, par
  commune, par zone de remplacement, ou par distance autour de chez soi.
- **Construire sa liste de vœux**, la réordonner, l'exporter en PDF ou en CSV.
- **Se fixer un objectif** : la commune dont on veut se rapprocher, la mutation
  simultanée avec son conjoint, et la liste des établissements où l'on ne veut
  pas aller.
- **Se faire relire par le guide stratégique** : il confronte la liste de vœux
  aux règles du mouvement et signale ce qui ne produira pas l'effet attendu.
- **Partager sa simulation** : le bouton 🔗 produit un lien qui contient le
  barème et les vœux. Le collègue qui l'ouvre voit exactement la même chose,
  sans rien installer.
- **Fonctionner sans réseau** une fois la page visitée : les données, le code et
  les fonds de carte déjà consultés restent disponibles hors ligne.

## Ce qui a changé par rapport au fichier unique

| | Avant (v38 sur Drive) | Maintenant |
|---|---|---|
| Distribution | fichier de 13 Mo à télécharger | une adresse web, installable |
| Poids au démarrage | 13 Mo | ~500 Ko (le reste à la demande) |
| Sans réseau | dépendait de trois CDN | tout en cache, utilisable hors ligne |
| Téléphone et tablette | deux panneaux de 380 px masquaient la carte — 260 px de carte sur une tablette de 1024 px | panneaux coulissants jusqu'à 1280 px, la carte garde toute la largeur |
| Barème saisi | perdu à chaque rechargement | conservé sur l'appareil |
| Liste de vœux | écrite mais jamais relue | retrouvée au retour |
| Ordre des vœux | glisser-déposer, sans effet au doigt | flèches ▲▼ |
| Domicile | à pointer sur la carte | bouton « Utiliser ma position » |
| Recherche | aucune | par établissement ou commune |
| Partage | envoyer 13 Mo | un lien |
| Mise à jour des données | régénérer et recoller 13 Mo de code | remplacer un fichier dans `data/` |

### Anomalies corrigées

- `openGlossary`, `closeGlossary`, `showToast` et `closeToast` étaient appelées
  par la page mais absentes du script : le bouton **Glossaire** ne faisait rien,
  et ajouter deux fois le même vœu levait une `ReferenceError`.
- `loadWishlistFromLocal()` existait et n'était jamais appelée : la liste de vœux
  était écrite dans le navigateur puis jamais relue.
- **Tout effacer** vidait la liste à l'écran sans l'enregistrer : elle
  réapparaissait au rechargement.
- Deux séquences d'initialisation concurrentes (`window.onload` plus un écouteur
  `load`) dont l'ordre n'était pas garanti ; il n'y en a plus qu'une.

## Organisation

```
mutation/
├── index.html                    toute l'application (HTML + CSS + JS)
├── sw.js                         cache hors ligne
├── manifest.webmanifest          installation sur l'écran d'accueil
├── icone-192.png, icone-512.png
├── data/                         les données, lues au chargement
│   ├── bareme-intra-2026.json    toutes les valeurs du barème
│   ├── etablissements.csv        251 collèges et lycées
│   ├── regroupements.json        groupements de communes
│   ├── zones_remplacement.json   ZR par département
│   ├── chemins_de_fer.json  ┐    chargés seulement si on coche
│   └── gares.geojson        ┘    la case correspondante
├── vendor/                       Leaflet, PapaParse, html2pdf
│                                 (html2pdf, 900 Ko, n'est chargé qu'à l'export PDF)
├── outils/preparer-donnees.py    régénère data/ depuis les fichiers bruts
└── tests/                        vérification du calcul du barème
```

Le fond de carte est servi par CartoDB. Les tuiles des zones déjà consultées
sont conservées (500 au maximum) ; ailleurs, hors ligne, la carte reste grise
mais les points, les zones et les calculs fonctionnent.

## Mettre à jour les données

Remplacer le fichier concerné dans `data/`, committer, c'est en ligne. Aucun
code à toucher.

Si vous repartez des fichiers d'origine (liste des gares nationale, tracé
ferroviaire national, export établissements) :

```sh
python3 outils/preparer-donnees.py ~/Téléchargements/mes-fichiers-bruts
```

Le script découpe les couches transport sur l'emprise des trois départements et
arrondit les coordonnées : 13 Mo deviennent 1 Mo, sans perte visible.

**Après toute modification de `index.html`, `sw.js` ou `data/`**, incrémenter
`VERSION` en tête de `sw.js`. Sans cela, les visiteurs qui ont déjà la page en
cache continueront à voir l'ancienne pendant un rechargement de plus.

## Travailler en local

La page lit `data/` par requêtes réseau : elle doit être servie par un serveur,
un double-clic sur `index.html` ne suffit pas.

```sh
python3 -m http.server 8000   # puis http://localhost:8000/mutation/
```

## Ce qui est enregistré sur l'appareil

Dans le `localStorage` du navigateur, jamais envoyé ailleurs : les réponses du
formulaire de barème, la liste de vœux, le mode d'affichage et les filtres, le
domicile et le rayon, l'affichage ou non des étiquettes, l'état du bandeau
d'avertissement, et le fait que le guide d'accueil a déjà été vu.

Le bouton **Réinitialiser mon barème** efface les réponses ; **Tout effacer**
dans le bilan efface les vœux. Un lien de partage contient le barème et les vœux
de celui qui l'a créé — donc à ne pas diffuser plus loin qu'on ne le souhaite.

## Et le mouvement inter-académique ?

Le chantier est ouvert mais **pas fait**, et il ne doit pas être fait de mémoire :
un barème approximatif ferait classer des vœux de travers à des collègues.

L'état des lieux, les valeurs déjà reconstituées, celles qui manquent, et ce qu'il
faut pour finir sont dans **[`inter/`](inter/)**. En résumé : l'inter n'est pas une
case à cocher, c'est une seconde vue — on y demande des **académies**, pas des
établissements d'Amiens — et son barème relève des lignes directrices
ministérielles, pas académiques.

## Le guide stratégique

Le bouton **🎯 Stratégie** relit la liste de vœux et la situation, et rend des
constats calculés sur les données réelles, chacun accompagné de son « pourquoi »
et de la source syndicale dont il vient :

- **un vœu précis placé après le vœu large qui le contient est inopérant** — le
  mouvement n'y arrive jamais. Placé avant, il devient un *vœu indicatif* qui
  oriente l'affectation à l'intérieur de la zone ;
- **ce que chaque vœu large recouvre vraiment** : le nombre d'établissements
  concernés et lesquels sont en éducation prioritaire ;
- **les établissements écartés qu'un vœu large rend malgré tout atteignables** —
  on ne peut pas retrancher un établissement d'une commune, seulement en
  préférer d'autres plus haut dans la liste ;
- **les points familiaux laissés de côté** faute de vœu large, chiffrés ;
- **le rapprochement de conjoint** : vérification que le premier vœu
  infra-départemental porte bien sur la commune renseignée dans l'objectif ;
- **les communes à établissement unique** : à demander en vœu de commune, pour
  obtenir le même poste avec les bonifications ;
- **la mutation simultanée** : rappel que les deux listes doivent être
  identiques et dans le même ordre.

Ces règles décrivent le fonctionnement général du mouvement, tel que le
présentent les notes syndicales (SNALC, SGEN-CFDT, SE-UNSA, CGT Éduc'action) et
les documents rectoraux. Les modalités exactes restent celles des lignes
directrices de gestion de l'académie.

**L'option « mutation simultanée » n'ajoute aucun point** : le champ
`mutation_simultanee` du barème vaut `null` faute d'avoir pu établir sa valeur
pour l'académie d'Amiens. Elle sert au guide, qui rappelle la contrainte.

## Changer le barème

Toutes les valeurs sont dans **`data/bareme-intra-2026.json`** : points d'échelon,
ancienneté de poste, bonifications familiales, paliers de séparation, RQTH, carte
scolaire, éducation prioritaire, stagiaires, TZR. Aucune n'est écrite dans le
code. La mise à jour annuelle se fait donc dans ce fichier, et nulle part ailleurs.

Ne le modifiez pas sans le filet : **[`tests/`](tests/)** rejoue 2000 situations
et signale exactement ce qui change. La marche à suivre y est décrite.

Après modification, incrémenter `VERSION` dans `sw.js` pour que le nouveau barème
atteigne les visiteurs qui ont la page en cache.

### Recouper avec les LDG

Le champ `verifie_contre_les_ldg` vaut `false`, et il faut lire cette mention
pour ce qu'elle dit : les valeurs reprennent **fidèlement celles qui étaient
écrites dans le code d'origine**, mais personne ne les a encore confrontées au
texte officiel. L'outil reconduit l'existant ; il n'est pas sourcé.

La page **[`verifier-bareme.html`](verifier-bareme.html)** est faite pour ce
recoupement. Elle présente les vingt règles en français ordinaire — « base 14,
puis 7 par échelon, plafonné à 98 » — avec la valeur modifiable, une case
« vérifié dans le texte » et un champ pour noter où vous l'avez lu. L'ancienne
valeur reste affichée sous celles que vous corrigez, et un récapitulatif liste
tous vos changements avant de valider.

Le bouton vert produit un `bareme-intra-2026.json` à déposer dans `data/`. Il
porte la date de vérification, les références saisies à côté de chaque règle, et
ne passe `verifie_contre_les_ldg` à `true` que si les vingt règles ont été
cochées — sinon il note combien l'ont été.

Vos réponses restent dans le navigateur : le travail peut être interrompu et
repris. La page ne modifie jamais le fichier du dépôt, elle en propose un autre.

Deux règles y sont marquées d'un avertissement, faute de valeur connue : le
stagiaire ex-fonctionnaire et la mutation simultanée.

## Pistes suivantes

- Le formulaire propose « stagiaire ex-fonctionnaire (reconversion) », mais aucune
  bonification n'y a jamais été associée : ce choix rapporte zéro point. Soit
  c'est exact et l'option mérite une mention, soit il manque une valeur. C'est
  noté dans le fichier de barème.
- Pré-télécharger les tuiles de l'académie pour une carte complète hors ligne
  (quelques Mo), plutôt que de dépendre de ce qui a déjà été consulté.
- Comparer deux stratégies de vœux côte à côte, à partir de deux liens partagés.
