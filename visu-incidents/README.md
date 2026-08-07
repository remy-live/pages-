# Visu-Incidents

Carte et tableau de bord des signalements portés aux registres santé et sécurité
au travail (RSST), rapprochés de l'annuaire des établissements scolaires.

**En ligne :** https://remy-live.github.io/pages-/visu-incidents/

Tout se passe dans le navigateur. Aucune donnée n'est envoyée sur un serveur :
les fichiers CSV sont lus sur place et restent sur l'appareil.

## Utilisation

Déposer l'**export du registre** (colonnes `UAI`, `Risque`, `Observé le`,
`Etat`, …). C'est tout : l'annuaire de l'académie d'Amiens — 2 061
établissements de l'Oise, de la Somme et de l'Aisne — est intégré à la page.

Les colonnes sont reconnues sans tenir compte des accents, de la casse ni des
espaces, et le séparateur (`;`, `,` ou tabulation) est détecté automatiquement.
Un intitulé qui change légèrement d'un export à l'autre ne casse donc rien.

Le fichier déposé est mémorisé : à la prochaine ouverture, il est déjà là.

## L'annuaire intégré

L'annuaire ne bouge quasiment jamais, alors que l'export du registre change
souvent — il est donc embarqué dans la page, et il ne reste qu'un fichier à
déposer à l'usage.

L'annuaire est réduit aux onze colonnes réellement lues, débarrassé des
établissements sans coordonnées, compressé en gzip et encodé en base64 dans
`annuaire.js`. L'annuaire livré passe ainsi de 877 Ko à 143 Ko, soit 16 % de
l'original (2 061 établissements, 37 colonnes ramenées à 11).

La page le décompresse au démarrage avec `DecompressionStream`, natif au
navigateur : aucune bibliothèque supplémentaire, et 0,2 s au chargement.

### Depuis la page, sans rien installer

Section **Annuaire des établissements**, dans le panneau de gauche : déposer le
fichier de l'annuaire, puis

- **Créer le fichier autonome** — produit `visu-incidents-autonome.html` avec
  cet annuaire déjà dedans. C'est le fichier à déposer sur un Drive ou une clé.
  Demande la page en ligne : sur un fichier ouvert en local, les navigateurs
  interdisent de relire les fichiers voisins.
- **Exporter l'annuaire compressé** — produit `annuaire.js`, à placer à côté de
  `index.html` pour la version hébergée.

### En ligne de commande

```sh
python3 build-annuaire.py Etablissement.csv   # produit annuaire.js
python3 build-standalone.py                   # répercute dans le fichier autonome
```

Les deux chemins produisent un `annuaire.js` au contenu strictement identique —
c'est vérifié par les tests. Sans argument, `build-annuaire.py` vide
`annuaire.js` et l'outil redemande les deux fichiers, comme avant.

### Limites

`DecompressionStream` et `CompressionStream` demandent Chrome 80+, Safari 16.4+
ou Firefox 113+. Sur un navigateur plus ancien, la page le dit, désactive les
boutons de fabrication et redemande l'annuaire à la main.

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

**Priorités** — où intervenir. Le classement repose sur trois signaux, tous
tirés de dates et de noms de déclarants, sans rien d'interprété :

- **Sans réponse** — un signalement non clos qu'aucune observation n'a suivi
  au-delà du seuil. C'est le signal le plus objectif : il ne dit rien du risque,
  seulement que personne n'a répondu.
- **Situation collective** — plusieurs agents *différents* sur une fenêtre
  courte. Cinq signalements par cinq personnes en une semaine ne se lisent pas
  comme cinq signalements par une personne sur deux ans ; le motif nomme le
  risque quand il est commun à tous.
- **Réponse tardive** — une réponse arrivée bien après le signalement, que la
  médiane de la synthèse masque par construction.
- **Récidive** — le même sujet re-signalé peu après la clôture du précédent : la
  mesure prise n'a pas tenu. Le délai se compte à partir de la **clôture**, pas
  du signalement. Par défaut, le sujet comparé est le **risque exact** et non la
  famille — « Risques psychosociaux » couvre sept situations distinctes, et deux
  signalements RPS à six mois d'écart ne sont pas forcément le même problème.
  Réglable sur la famille si vous voulez ratisser plus large.

Chaque établissement porte un niveau (critique, sérieux, à surveiller) **et une
phrase qui dit pourquoi** : « 5 agents différents ont signalé en 5 jours, tous
sur Risques psychosociaux : Exigences émotionnelles ». Aucun score opaque.

Les six seuils sont affichés, modifiables et mémorisés — ils appartiennent à qui
se sert de l'outil, pas au code. Deux exports en découlent : la liste à relancer
(CSV) et un relevé imprimable (PDF).

Le niveau « critique » est réservé : situation collective, signalement resté
sans réponse au-delà du double du seuil, ou récidive chronique (le sujet revient
une quatrième fois). Une récidive isolée reste « sérieux », même répétée deux
fois — un établissement qui répond en quatre jours mais voit le sujet revenir
n'est pas au même rang qu'un signalement laissé deux ans sans réponse, et les
confondre viderait le mot « critique » de son sens.

La carte a un mode **Urgence** correspondant, où la couleur suit le niveau au
lieu du nombre de signalements.

Deux limites inscrites dans l'interface : **aucun signalement ne veut pas dire
aucun risque** — un établissement silencieux peut être celui où l'on n'ose pas
écrire —, et ce classement porte sur le traitement des registres, pas sur la
sécurité des lieux ni sur une performance d'établissement. Si l'export chargé
est ancien, l'outil le signale plutôt que de faire passer tout le monde pour
en retard.

**Fiche d'établissement** — indicateurs, répartition des risques et journal des
signalements. La fiche respecte les filtres actifs et indique combien de
signalements sont masqués.

**Qualité des données** — l'outil signale et laisse exporter les signalements
dont l'UAI est absent de l'annuaire, ceux sans date exploitable, et les
établissements sans coordonnées. Ils ne disparaissent plus silencieusement.

L'annuaire ne recense que des écoles, collèges et lycées : les signalements
portés par un CIO, un service ou une circonscription apparaîtront donc dans
cette liste, faute de coordonnées où les placer.

**Fiche à envoyer** — depuis la fiche d'un établissement, un PDF d'une page ou
un texte à coller dans un courriel, ne contenant **que** les signalements de cet
établissement. On n'adresse pas à une direction les signalements des autres, et
la recopie manuelle disparaît.

**Suivi des relances** — noter « relancé le… » sur les signalements en attente
d'un établissement, et une note interne libre. Au chargement suivant, le
classement distingue *jamais relancé* de *relancé et toujours sans réponse* —
la seconde situation étant précisément celle qui justifie de remonter d'un cran.

Ces marques vivent dans le navigateur, comme le reste : elles disparaîtraient
au premier changement de poste. D'où l'export et l'import du suivi, en JSON,
depuis la section **Export**. La note interne n'apparaît jamais dans un export
de données, et sur la fiche PDF elle est signalée comme non destinée à l'envoi.

**Quoi de neuf** — au chargement d'un nouvel export, un encart compare au
précédent : nouveaux signalements, clôtures, dossiers toujours ouverts. Rien au
premier chargement, faute de point de comparaison.

**Masquage des noms** — un interrupteur remplace partout le nom du déclarant par
une mention neutre, exports compris. Un registre est nominatif par nature ; une
statistique portée devant une instance n'a pas à l'être.

**Exports** — CSV (encodage compatible Excel) et rapport PDF, l'un comme l'autre
strictement limités à ce qui est affiché, avec le rappel des filtres appliqués.
La page s'imprime proprement : filtres et carte sont retirés du papier, la
synthèse et les priorités sont conservées.

## Version autonome (Drive, clé USB, poste hors ligne)

`visu-incidents-autonome.html` est un fichier unique de 1,1 Mo : les
bibliothèques et l'annuaire y sont incorporés. Il s'ouvre par double-clic, sans serveur
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
