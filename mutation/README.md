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
- **Filtrer la carte** par type d'établissement, par groupement, par commune, par
  zone de remplacement, ou par distance autour de chez soi.
- **Construire sa liste de vœux**, la réordonner, l'exporter en PDF ou en CSV.
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
| Téléphone | deux panneaux de 380 px masquaient la carte | panneaux coulissants, en-tête compact |
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
│   ├── etablissements.csv        251 collèges et lycées
│   ├── regroupements.json        groupements de communes
│   ├── zones_remplacement.json   ZR par département
│   ├── chemins_de_fer.json  ┐    chargés seulement si on coche
│   └── gares.geojson        ┘    la case correspondante
├── vendor/                       Leaflet, PapaParse, html2pdf
│                                 (html2pdf, 900 Ko, n'est chargé qu'à l'export PDF)
└── outils/preparer-donnees.py    régénère data/ depuis les fichiers bruts
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

## Pistes suivantes

- Les barèmes sont codés en dur dans `calculateBreakdown()` ; les sortir dans un
  `bareme-2026.json` rendrait la mise à jour annuelle beaucoup moins risquée, à
  condition de figer d'abord le calcul actuel dans des tests.
- Pré-télécharger les tuiles de l'académie pour une carte complète hors ligne
  (quelques Mo), plutôt que de dépendre de ce qui a déjà été consulté.
- Comparer deux stratégies de vœux côte à côte, à partir de deux liens partagés.
