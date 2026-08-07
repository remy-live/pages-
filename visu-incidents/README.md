# Visu-Incidents

Carte et tableau de bord des signalements portés aux registres santé et sécurité
au travail (RSST), rapprochés de l'annuaire des établissements scolaires.

**En ligne :** https://remy-live.github.io/pages-/visu-incidents/

Tout se passe dans le navigateur. Aucune donnée n'est envoyée sur un serveur :
les deux fichiers CSV sont lus sur place et restent sur l'appareil.

## Utilisation

1. Déposer l'**annuaire des établissements** (colonnes `Numéro d'UAI`,
   `Latitude WGS84`, `Longitude WGS84`, …).
2. Déposer l'**export du registre** (colonnes `UAI`, `Risque`, `Observé le`,
   `Etat`, …).
3. Les deux fichiers sont mémorisés : à la prochaine ouverture, ils sont déjà là.

Les colonnes sont reconnues sans tenir compte des accents, de la casse ni des
espaces, et le séparateur (`;`, `,` ou tabulation) est détecté automatiquement.
Un intitulé qui change légèrement d'un export à l'autre ne casse donc rien.

## Ce que fait l'outil

**Carte** — trois lectures : groupes (le nombre affiché est celui des
signalements, pas des points), points proportionnels, ou densité. L'échelle de
couleur est une rampe d'une seule teinte, par quantiles, recalculée à chaque
filtrage ; la légende donne les bornes.

**Filtres** — recherche libre, registre, état, famille de risque, risque
détaillé, département, type d'établissement, période mensuelle avec animation.
Chaque valeur affiche son effectif. Un clic sur une barre de la synthèse isole
la valeur correspondante ; un second clic rétablit tout.

**Synthèse** — signalements, établissements concernés, part de non clos, délai
médian entre le signalement et la dernière réponse portée au registre.
Répartition mensuelle (cliquable), par famille de risque et par état. Les
chiffres sont aussi consultables en tableau.

**Fiche d'établissement** — indicateurs, répartition des risques et journal des
signalements. La fiche respecte les filtres actifs et indique combien de
signalements sont masqués.

**Qualité des données** — l'outil signale et laisse exporter les signalements
dont l'UAI est absent de l'annuaire, ceux sans date exploitable, et les
établissements sans coordonnées. Ils ne disparaissent plus silencieusement.

**Exports** — CSV (encodage compatible Excel) et rapport PDF, l'un comme l'autre
strictement limités à ce qui est affiché, avec le rappel des filtres appliqués.

## Version autonome (Drive, clé USB, poste hors ligne)

`visu-incidents-autonome.html` est un fichier unique d'environ 900 Ko : toutes
les bibliothèques y sont incorporées. Il s'ouvre par double-clic, sans serveur
et sans accès aux CDN — souvent bloqués sur les réseaux d'établissement.

Seul le fond de carte OpenStreetMap vient du réseau. S'il est inaccessible,
l'outil le dit et reste utilisable : points, filtres, synthèse et exports
fonctionnent sans lui.

Pour le régénérer après une modification de `index.html` :

```sh
python3 build-standalone.py
```

Sur `file://`, les navigateurs interdisent l'accès à IndexedDB : la version
autonome ne mémorise donc pas les fichiers d'une ouverture à l'autre. C'est la
seule différence avec la version en ligne.

## Développement

`index.html` contient toute l'application (HTML, CSS, JavaScript), sans étape de
compilation. `vendor/` contient les bibliothèques figées à leur version :
Leaflet 1.9.4 et ses greffons MarkerCluster 1.5.3 et Heat 0.2.0, Papa Parse
5.4.1, Chart.js 4.4.1, jsPDF 2.5.1 et jsPDF-AutoTable 3.8.2.

Le filtrage est concentré dans une seule fonction, `computeFiltered()`. Carte,
synthèse, fiche et exports consomment tous son résultat — un filtre ajouté au
même endroit vaut donc partout, exports compris.

Pour tester en local :

```sh
python3 -m http.server 8000   # puis http://localhost:8000/visu-incidents/
```

Le bouton **Démonstration** charge un jeu fictif, utile pour vérifier une
modification sans manipuler de données réelles.
