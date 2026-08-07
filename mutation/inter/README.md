# Mouvement inter-académique — état des lieux

Ce dossier ne contient **aucun code actif**. C'est un dossier de travail pour la
future option « inter », et un relevé honnête de ce qui manque pour la construire.

## Pourquoi ce n'est pas juste un bouton à ajouter

L'intra et l'inter ne se ressemblent que de loin.

| | Intra (fait) | Inter (à faire) |
|---|---|---|
| Ce qu'on demande | un établissement, une commune, un groupe de communes, un département — **dans l'académie d'Amiens** | une **académie**, parmi les 31 du territoire |
| Support | carte des 251 collèges et lycées de l'académie | carte ou liste des académies de France |
| Barème | celui des LDG académiques d'Amiens | celui des LDG **ministérielles**, différent poste par poste |
| Enjeu des vœux | l'ordre, et le fait de mettre des vœux larges | l'ordre, les académies limitrophes, le typage |

Autrement dit : ce n'est pas une case à cocher dans l'outil actuel, c'est une
**seconde vue** qui partage l'ossature (formulaire, assistant, liste de vœux,
export, partage, hors ligne) mais change la carte et le moteur de calcul.

## Où en est la collecte du barème

`bareme-inter-2026.brouillon.json` rassemble ce qui a pu être reconstitué. Il est
marqué `"verifie": false` et **ne doit pas être branché sur un calculateur en
l'état**.

Ce qui semble solide (recoupé sur plusieurs synthèses) :

- 7 points par échelon de la classe normale, minimum 14
- rapprochement de conjoints : 150,2 points, plus 100 si les académies ne sont
  pas limitrophes
- années de séparation : 190 / 325 / 475 / 600 pour 1, 2, 3, 4 ans et plus
- 100 points par enfant de moins de 18 ans
- éducation prioritaire après 5 ans : 400 points en REP+ ou politique de la
  ville, 200 en REP
- bénéficiaire de l'obligation d'emploi : 100 points sur tous les vœux, et
  jusqu'à 1000 sur l'académie qui améliorerait la situation

Ce qui manque, ou qui est douteux :

- **parent isolé** : la recherche a renvoyé une bonification de 6,9 points qui
  relève en réalité d'un barème *intra* académique.
- **mesure de carte scolaire** : les chiffres remontés (300 / 200 / 100, « poste
  adjoint », « circonscription ») sont ceux du **premier degré**. Hors sujet.
- **vœu préférentiel, réintégration, CIMM et outre-mer, stabilisation TZR,
  stagiaires hors ex-contractuels** : rien d'exploitable.
- la structure hors-classe et classe exceptionnelle est ambiguë : le socle
  s'ajoute-t-il aux points d'échelon ou les remplace-t-il ?
- **les règles de vœux elles-mêmes** — nombre, typage, ordre imposé pour
  déclencher les bonifications familiales — ne sont pas consignées.

## Pourquoi ça s'arrête là

Aucune de ces valeurs n'a été lue dans le document qui la porte : cet
environnement d'exécution bloque l'accès direct à `education.gouv.fr`, aux sites
académiques et aux sites syndicaux. Tout est passé par une couche de résumé, et
les deux erreurs relevées ci-dessus — du premier degré et de l'intra mélangés à
l'inter — montrent que cette couche confond les sources.

Un barème approximatif ferait classer des vœux de travers à des collègues.
C'est le seul endroit de ce projet où mieux vaut ne rien livrer.

## Ce qu'il faut pour finir

Un seul de ces documents, déposé dans le dossier Drive du projet (PDF ou texte) :

1. **[Synthèse des barèmes du rectorat d'Amiens](https://www.ac-amiens.fr/media/21649/download)**
   — la meilleure source pour cet outil, elle vient de l'académie concernée ;
2. la **[note de service du 9 octobre 2025](https://www.education.gouv.fr/bo/2025/Hebdo39/MENH2526218N)**
   (BO n° 39 du 16 octobre 2025) et l'**annexe III** des
   [LDG du BO spécial n° 5](https://www.education.gouv.fr/bo/2024/Special5/MENH2423580N) ;
3. à défaut, la **[fiche barème SE-UNSA](https://www.se-unsa.org/wp-content/uploads/2025/10/bareme2025_2026.pdf)**,
   qui est la synthèse la plus complète repérée.

Avec ça, la suite est balisée : remplir le JSON règle par règle avec sa référence,
figer le calcul dans des tests, puis ajouter le sélecteur intra / inter, la carte
des académies et les questions propres à l'inter dans l'assistant.
