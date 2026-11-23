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

## Le contenu des signalements

L'extraction du portail donne les métadonnées d'un signalement — date, risque,
RNE, état, déclarant — mais pas ce qui y est écrit. Le texte n'existe que sur
la fiche, une page par signalement, et il y en a un millier et demi.

`rsst-contenu.js` les ouvre une à une et en tire un **second CSV**, raccordable
au premier par la colonne `numero` (le numéro d'inscription au registre). Il
s'installe en favori depuis [`contenu/`](contenu/) : on ouvre le registre, on
clique le favori, un panneau s'ouvre en bas à droite de la page.

Le script lit, et rien d'autre : il n'écrit, ne modifie, ne vise, ne clôt et ne
supprime aucun signalement, et ne voit que ce que le compte voit déjà en
cliquant. Il laisse une demi-seconde entre deux pages. Une fiche illisible
garde sa ligne, avec le motif en colonne `erreur`, plutôt que de disparaître.

**Le premier relevé est long, les suivants non.** Les fiches lues restent dans
le navigateur. Au relevé suivant, le script parcourt les pages de liste — une
minute — et y lit l'état et le nombre de réponses de chaque signalement. Il ne
rouvre que les fiches dont l'un des deux a changé, plus les nouvelles : en
général quelques dizaines au lieu de mille cinq cents. Le bouton **Tout
oublier** efface cette mémoire.

Le menu **Relever** vise plus précisément encore : *ce qui a changé* (les
nouvelles et celles dont l'état ou le nombre de réponses a bougé), *les fiches
manquantes* (uniquement ce qui n'est pas en mémoire), ou *tout, à nouveau*.
Le menu **États** limite aux fiches **non closes** ou **non visées** — l'état
figure dans la liste, la sélection se fait donc avant d'ouvrir quoi que ce
soit. **Seulement une période** se combine au reste : la date de saisie figure dans
la liste, et le script y restreint avant d'ouvrir la moindre fiche. Sans
colonne de date reconnue, la période est ignorée et le panneau le dit, plutôt
que de rendre un fichier vide.

**Reprendre un fichier déjà enregistré** réamorce cette mémoire à partir d'un
CSV produit précédemment — utile après un changement de poste, ou quand le
relevé a été fait par une version qui ne gardait rien. La colonne `etat_liste`
transporte le repère qui rend les relevés suivants incrémentaux ; un fichier
qui ne la porte pas est repris quand même, et ses fiches sont relues une fois.

**Le fichier produit est nominatif** : texte intégral des signalements et des
réponses, noms des agents et des chefs de service. Il se traite comme le
registre lui-même.

### Chercher

Le champ de la barre haute cherche dans le nom de l'établissement, la commune,
l'UAI, la circonscription, le risque, l'état, le déclarant — et dans le **texte
des fiches** quand il a été chargé. Le mot trouvé est surligné là où il se
trouve, dans le dépliant d'un signalement comme dans la liseuse, sans tenir
compte des accents.

Un **numéro de signalement** se cherche à part : `482`, `n° 482`, `#482` ou
`fiche 482` ramènent cette fiche-là, et elle seule. Noyé dans la recherche
libre, « 482 » ramènerait aussi tous les UAI qui contiennent ces trois
chiffres.

Quand rien ne correspond, l'outil **dit pourquoi** plutôt que d'afficher une
carte vide : l'établissement figure à l'annuaire mais ne porte aucun
signalement — avec un bouton pour le montrer quand même —, ou bien d'autres
critères l'écartent — avec un bouton pour ne garder que la recherche —, ou
bien rien ne correspond du tout, et il rappelle alors que le texte des fiches
n'est peut-être pas chargé.

### Les calques posés sur la carte

Les étiquettes de filtres, la légende et les avertissements sont posés sur la
carte dans des boîtes qui s'étendent bien au-delà de ce qu'elles affichent —
celle des étiquettes couvre toute la largeur. Elles ne reçoivent plus les
clics : seules leurs commandes propres le font, et un point qu'elles
recouvrent reste cliquable. La toile de densité non plus, les points vivant
dessous.

### Les mots à surveiller

Quatre familles — violences et menaces, blessures et soins, santé des agents,
risques majeurs — sont cherchées dans le texte des fiches de la période. Le
**mot exact** est affiché, sur la famille comme sur chaque signalement
concerné, et repris dans le texte rédigé : « menace, morsure, blessé,
amiante ». La comparaison se fait sur le texte normalisé, accents et
ponctuation retirés, ce qui permet d'écrire « arrêt de travail » et de
retrouver « arret de travail ».

Un champ libre ajoute vos propres mots, gardés dans le navigateur. Cette
veille ne remplace pas la lecture : elle dit où regarder d'abord. Sans le
texte des fiches, elle le dit au lieu de rendre une liste vide.

## Savoir quelle version on utilise

Un navigateur garde volontiers la page en cache : on croit alors essayer une
correction qu'on n'a pas. La boîte **Données** affiche donc la version
chargée, et la page compare cet horodatage à `version.txt` au démarrage — puis
au retour sur l'onglet, au plus une fois par cinq minutes. Si une version plus
récente est en ligne, un bouton **Nouvelle version · Recharger** paraît dans la
barre haute, en disant laquelle.

La demande porte un paramètre qui change à chaque appel, en plus de
`cache: 'reload'` : un mécanisme dont le seul but est de déjouer le cache ne
doit pas dépendre d'une sémantique que telle version de navigateur interprète à
sa façon. Hors ligne, rien n'est signalé.

`build-standalone.py` écrit l'horodatage aux deux endroits à la fois — dans
`index.html` et dans `version.txt` — pour qu'ils ne puissent pas diverger.

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

Bouton **Données** dans la barre haute, section **Annuaire des
établissements** : déposer le fichier de l'annuaire. Puis, sous **Avancé**,

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

## L'écran

Quatre zones, et rien d'autre :

- **la barre haute** — ce qui est chargé, la recherche, et les deux commandes
  de tous les jours : **Critères** replie ou déploie le panneau de gauche,
  **Exporter** ouvre la boîte des documents ;
- **le panneau de gauche** — uniquement ce qui restreint la vue : recherche
  d'un établissement, facettes, période. Il tient dans la hauteur de l'écran,
  sans défilement ;
- **la carte**, avec ses propres réglages posés dessus — on voit ce qu'on
  change au moment où on le change ;
- **le panneau de droite** — la lecture : synthèse, priorités, fiche d'un
  établissement.

Deux boutons de la barre haute ouvrent une boîte plutôt qu'un panneau :

- **Actualité** compte les signalements des trente derniers jours et ouvre une
  note sur la période — le mois écoulé ou les deux derniers mois. Elle s'ouvre
  sur un **texte rédigé**, recopiable dans un courriel, puis déroule les
  chiffres avec leur évolution, les **coins chauds**, les **points de
  vigilance** repris du calcul d'urgence, les **mots relevés** dans le texte
  des fiches, et en annexe dépliable les signalements non clos, non visés, et
  tous ceux de la période. Elle propose d'**entourer sur la carte** les
  établissements concernés. Si le registre ne contient rien de récent, elle
  dit à quelle date il s'arrête plutôt que d'afficher un zéro qui passerait
  pour une panne ;
- **Lire les fiches une par une** ouvre une liseuse : un signalement par page,
  son texte sur la largeur d'une page plutôt que dans une colonne de 360 px.
  Flèches, glissement du doigt, ou l'**étagère** du bas — un dos de livre par
  fiche, daté, teinté selon l'état du traitement. Le nom de l'établissement
  mène à sa fiche complète, et le sous-titre dit combien de signalements il
  porte en tout, afin qu'on sache si les critères en écartent. Elle s'ouvre
  depuis l'onglet Établissement, depuis la bulle d'un point de la carte,
  depuis la liste des priorités, et depuis chaque ligne d'« Arrivé
  récemment ».

Au clavier : `/` amène à la recherche, `Échap` l'efface, les flèches tournent
les pages de la liseuse, et la tabulation reste dans la boîte ouverte.

### La période

L'axe des mois part d'**août 2024** : le registre dématérialisé a commencé à
cette rentrée, et quelques dates douteuses suffiraient sinon à étaler la frise
sur des années vides. Les signalements antérieurs ne sont pas écartés pour
autant — ils restent comptés, un avis les dénombre, et un lien rouvre l'axe
jusqu'à eux. Trois boutons — **Dernier mois**, **2 mois**, **3 mois** — se
calent sur le dernier mois du registre, et non sur le mois courant : un export
de juin consulté en novembre donnerait sinon une vue vide.

Les exports qui portent sur l'ensemble de la vue filtrée (rapport, article,
tableur, carte) sont dans la boîte **Exporter**. Ceux qui portent sur ce qu'on
a sous les yeux — le courrier de relance, la fiche d'un établissement —
restent là où on les regarde.

Sous 1 000 px de large, les deux panneaux deviennent des tiroirs et la barre du
bas prend le relais.

### Interface simplifiée

Le bouton **Simplifié** retire ce qui relève du réglage fin : quatre des sept
facettes, la frise de période et son animation, les réglages posés sur la
carte, les options d'export, les outils de fabrication, les seuils d'urgence.
Restent la recherche, l'état du traitement, la famille de risque, le
département, les raccourcis de période, la carte et ses quatre modes, les
trois onglets, **Récent** et **Exporter**.

Il masque, il ne désactive pas : un critère masqué garde sa valeur, continue
de s'appliquer, et reste annoncé par le compteur de la barre haute et par son
étiquette sur la carte. On ne filtre jamais sans le savoir. Le choix est
retenu d'une visite à l'autre.

## Ce que fait l'outil

**Carte** — trois lectures : groupes (le nombre affiché est celui des
signalements, pas des points), points proportionnels, ou densité. L'échelle de
couleur est une rampe d'une seule teinte, par quantiles, recalculée à chaque
filtrage ; la légende donne les bornes.

**Filtres** — recherche libre, registre, état, famille de risque, risque
détaillé, **circonscription**, département, type d'établissement, période
mensuelle avec animation. Chaque valeur affiche son effectif. Un clic sur une
barre de la synthèse isole la valeur correspondante ; un second clic rétablit
tout. Les filtres actifs s'affichent en **étiquettes au-dessus de la carte** et
se retirent d'un clic : il ne faut plus déplier sept facettes pour savoir ce qui
est filtré.

La circonscription figure au registre, pas à l'annuaire : l'outil la remonte sur
l'établissement en gardant la plus fréquente de ses signalements. Elle n'est
renseignée que pour le premier degré ; les collèges et lycées ressortent sous
« Hors circonscription ».

**Le temps** — trois lectures complémentaires :

- le graphique mensuel, où l'on **glisse pour choisir une période** plutôt que
  de manier deux curseurs à l'aveugle (les curseurs restent, pour le clavier) ;
- un **calendrier année × mois**, qui montre d'un coup d'œil ce qu'une série de
  trente-six barres ne montre pas : le pic de rentrée, le creux d'été, l'année
  qui se dégrade. Réglable en **années scolaires**, de septembre à août —
  découper un registre scolaire en années civiles coupe chaque rentrée en deux ;
- une **frise** dans la fiche d'établissement : cinq signalements groupés sur
  une semaine et cinq étalés sur deux ans donnent la même liste, pas la même
  frise.

**Les territoires** — la carte par établissement montre des volumes, donc
surtout les endroits où il y a beaucoup d'écoles. On peut regrouper par
**commune, circonscription ou département**, et surtout **rapporter au nombre
d'établissements du territoire** : c'est l'intensité, non la densité scolaire.

Le dénominateur vient de l'annuaire. En deçà de trois établissements le rapport
n'est pas interprétable — une commune d'une seule école à trois signalements
devancerait toute une ville —, ces territoires sont donc écartés du classement
et l'outil le dit. La circonscription étant absente de l'annuaire, aucun taux
n'y est calculé plutôt qu'un taux faux.

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

**Structures hors annuaire** — CIO, services départementaux, circonscriptions
IEN, établissements privés, centres spécialisés : l'annuaire de l'éducation ne
les recense pas, mais le registre, lui, porte leurs signalements.

Ils sont **comptés partout** — indicateurs, calendrier, familles de risques,
états, priorités, listes et exports — à partir du nom et de la commune que
donne le registre. Faute de coordonnées, ils ne figurent pas sur la carte, qui
le dit en toutes lettres, et ils portent le type « Non référencé à l'annuaire »
pour qu'on puisse les isoler ou les écarter d'un clic.

Le dénominateur « sur N référencés » reste celui de l'annuaire seul : ces
structures ne s'y ajoutent pas, sans quoi les taux par territoire seraient
faussés.

**Qualité des données** — l'outil signale et laisse exporter les signalements
venus de structures hors annuaire, ceux sans date exploitable, ceux dont la date
est invraisemblable, et les établissements de l'annuaire dépourvus de
coordonnées. Rien ne disparaît silencieusement.

Les dates hors de l'intervalle 2000 – année prochaine sont écartées : une
coquille de saisie du genre « 207 » pour « 2007 » devenait sinon la borne basse
de la période, ajoutait une ligne au calendrier et étirait la frise sur des
siècles.

**Remettre à zéro** — « Retirer le registre » vide les signalements et conserve
l'annuaire, les marques de relance, les notes et les réglages. « Oublier les
fichiers » retire en plus l'annuaire déposé, celui intégré à la page reprenant
sa place.

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
depuis le bouton **Exporter**. La note interne n'apparaît jamais dans un export
de données, et sur la fiche PDF elle est signalée comme non destinée à l'envoi.

**Quoi de neuf** — au chargement d'un nouvel export, un encart compare au
précédent : nouveaux signalements, clôtures, dossiers toujours ouverts. Rien au
premier chargement, faute de point de comparaison.

**Masquage des noms** — un interrupteur remplace partout le nom du déclarant par
une mention neutre, exports compris. Un registre est nominatif par nature ; une
statistique portée devant une instance n'a pas à l'être.

**Tous les établissements concernés** — le rapport **et l'article** se terminent
par une annexe exhaustive : chaque établissement touché, du plus signalé au moins signalé,
avec sa commune, son département, son nombre de signalements et combien ne sont
pas clos. Les priorités n'en retiennent que quatorze ; l'annexe les recense
tous, y compris ceux qui n'ont qu'un seul signalement.

**Rapport PDF** — un document qui suit exactement les filtres en cours :
chiffres clés, **carte telle qu'elle est à l'écran**, évolution mensuelle,
**calendrier**, **classement des territoires** quand une maille est choisie,
familles de risques, état du traitement, puis les établissements à traiter en
priorité avec leurs motifs en clair. Le périmètre retenu est rappelé en tête et
en pied de chaque page.

Le calendrier et les barres sont redessinés dans le PDF plutôt que capturés :
ils restent nets à tout zoom et à l'impression.

Le détail ligne à ligne n'y figure pas par défaut — sur 1 200 signalements il
pèserait cinquante pages, et c'est le rôle de l'export CSV. Une case à cocher
permet de le joindre.

**Carte seule** — la même capture, en PNG haute définition, pour une note ou un
diaporama. L'attribution OpenStreetMap y est incrustée, comme la licence des
tuiles l'exige.

La capture est composée à la main depuis les tuiles, la couche de points et les
groupes : aucune bibliothèque supplémentaire, et si le fond de carte est
inaccessible — réseau filtré — les points sont dessinés seuls et le rapport le
dit. L'apparence claire est forcée le temps de la capture, puis rétablie : un
rapport aux couleurs sombres serait illisible sur papier.

**Article** — pour un billet, une note ou un compte rendu : un document rédigé,
en **PDF** ou en **Word**, où les chiffres sont ceux du filtrage en cours et où
la carte, le calendrier et les tableaux sont déjà en place.

Les passages d'appréciation y restent en blanc, marqués `[À compléter]` : l'outil
fournit les faits, l'interprétation revient à qui signe. Le fichier Word est un
HTML balisé pour Word — il s'ouvre dans Word comme dans LibreOffice, images
comprises, et se recopie dans un éditeur en ligne.

**Options d'export** — ce qui entre dans le rapport et dans l'article se choisit :
carte, calendrier, territoires, familles de risques, état du traitement, liste
des établissements, passages à compléter. S'y ajoutent le masquage des noms et
l'ajout du détail au rapport. Le compteur du panneau rappelle ce qui a été retiré.

**Liste des établissements** — la synthèse n'en montre que douze ; un bouton
déplie la liste entière, du plus signalé au moins signalé, selon les filtres en
cours. L'option vaut aussi pour les exports : c'est souvent pour les reprendre
ailleurs qu'on la déplie.

**Exports** — CSV (encodage compatible Excel), strictement limité à ce qui est
affiché. La page s'imprime aussi directement : filtres et carte sont retirés du
papier, la synthèse et les priorités sont conservées.

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
compilation. Les polices viennent de `../polices/`, servies par le dépôt comme
pour les autres outils ; les deux assembleurs de version autonome les
incorporent en base64. `vendor/` contient les bibliothèques figées à leur version :
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
