# Aide Mutation — intra 2026, académie d'Amiens

Carte des établissements, simulateur de barème et liste de vœux pour le mouvement
intra-académique. Outil indicatif : le barème qui fait foi est celui d'I-Prof.

**Adresse :** https://remy-live.github.io/pages-/mutation/

Il n'y a plus de fichier à télécharger ni à ouvrir : on partage un lien, la page
s'ouvre sur téléphone comme sur ordinateur.

## Ce qui a changé par rapport au fichier unique

| | Avant (v38 sur Drive) | Maintenant |
|---|---|---|
| Distribution | fichier de 13 Mo à télécharger | une adresse web |
| Poids au démarrage | 13 Mo | ~500 Ko (le reste à la demande) |
| Téléphone | deux panneaux de 380 px masquaient la carte | panneaux coulissants, en-tête compact |
| Barème saisi | perdu à chaque rechargement | conservé sur l'appareil |
| Recherche | aucune | par nom d'établissement ou de commune |
| Bibliothèques | unpkg / cdnjs (bloqués sur certains réseaux) | servies depuis le dépôt |
| Mise à jour des données | régénérer et recoller 13 Mo de code | remplacer un fichier dans `data/` |

Trois fonctions appelées par la page manquaient dans la v38 : `openGlossary`,
`closeGlossary`, `showToast` et `closeToast`. Le bouton **Glossaire** ne faisait
donc rien, et ajouter deux fois le même vœu provoquait une erreur silencieuse.
Elles sont rétablies.

## Organisation

```
mutation/
├── index.html                    toute l'application (HTML + CSS + JS)
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

Le fond de carte reste servi par CartoDB : une connexion est nécessaire pour
voir les tuiles, tout le reste fonctionne sans.

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

## Travailler en local

La page lit `data/` par requêtes réseau : elle doit être servie par un serveur,
un double-clic sur `index.html` ne suffit pas.

```sh
python3 -m http.server 8000   # puis http://localhost:8000/mutation/
```

## Ce qui est enregistré sur l'appareil

Dans le `localStorage` du navigateur, jamais envoyé ailleurs : les réponses du
formulaire de barème, la liste de vœux, l'affichage ou non des étiquettes, et le
fait que le guide d'accueil a déjà été vu. Le bouton **Réinitialiser mon barème**
efface les réponses ; **Tout effacer** dans le bilan efface les vœux.

## Pistes suivantes

- Partager une simulation par URL (barème et vœux encodés dans le lien), pour
  comparer entre collègues sans rien réinstaller.
- Mode hors-ligne complet (service worker + tuiles pré-téléchargées) : utile le
  jour de la saisie, dans un établissement au réseau capricieux.
- Les barèmes sont codés en dur dans `calculateBreakdown()` ; les sortir dans un
  `bareme-2026.json` rendrait la mise à jour annuelle beaucoup moins risquée.
