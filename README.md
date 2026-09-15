# pages-

Une page unique qui liste mes dépôts GitHub et pointe vers ceux qui ont un site en ligne.

**Adresse du site :** https://remy-live.github.io/pages-/

La liste des dépôts vient de l'API GitHub. Les outils publiés dans des
sous-dossiers de ce dépôt lui échappent : ils sont mis en avant à la main dans
la section « Outils en ligne » de la page.

## Outils de ce dépôt

- [`mutation/`](mutation/) — **Aide Mutation**, carte et simulateur de barème pour
  le mouvement intra 2026 de l'académie d'Amiens :
  https://remy-live.github.io/pages-/mutation/
- [`puzzle/`](puzzle/) — **Puzzle de calcul**, fabrique une fiche où une image
  découpée en pièces se reconstitue si les calculs sont justes :
  https://remy-live.github.io/pages-/puzzle/
- [`relier/`](relier/) — **Points à relier**, des fiches où l'ordre du tracé vient
  des résultats des calculs :
  https://remy-live.github.io/pages-/relier/
- [`visu-incidents/`](visu-incidents/) — **Visu-Incidents**, carte et tableau de
  bord des signalements portés aux registres santé et sécurité au travail :
  https://remy-live.github.io/pages-/visu-incidents/

## Notes sur la page d'accueil

- Les polices sont servies depuis `polices/` plutôt que depuis Google Fonts :
  pas d'appel à un tiers, et l'allure tient sur un réseau qui filtre les CDN.
- **Le jeton d'accès n'est pas conservé.** Il vaut pour la visite en cours et
  disparaît au rechargement. Un jeton de portée `repo` ouvre la lecture et
  l'écriture de tous vos dépôts : le garder dans le navigateur d'un appareil
  partagé n'en vaut pas la commodité. Un jeton enregistré par une version
  précédente est effacé au premier chargement de cette page.
- La dernière liste **publique** est gardée en mémoire du navigateur, ce qui
  affiche la page instantanément au retour et permet de continuer à la lire
  quand l'API GitHub ne répond pas ou refuse (60 requêtes par heure sans
  jeton). Rien n'est gardé quand un jeton est utilisé, pour que les noms de
  dépôts privés ne traînent nulle part.
- La page n'a pas de service worker : contrairement à `mutation/`, elle ne
  s'ouvre pas sans réseau. Ce serait la prochaine étape si le besoin se
  présente.

## Publication

Le site est déjà en ligne. Dans **Settings → Pages**, la source est la branche
`main`, dossier `/ (root)` : chaque commit sur `main` republie la page
automatiquement, en une minute environ. L'onglet **Actions** montre l'avancement
sous « pages build and deployment ».

Le fichier `.nojekyll` demande à GitHub de servir les fichiers tels quels, sans
passer par Jekyll.

## Comment ça marche

- `index.html` : toute la page (HTML, CSS, JS), aucun outil de build.
- Les dépôts sont lus en direct depuis l'API publique GitHub
  (`api.github.com/users/<compte>/repos`), au chargement de la page.
- Un dépôt avec GitHub Pages activé s'affiche avec une LED allumée et renvoie
  vers `https://<compte>.github.io/<dépôt>/` ; le bouton **Code** renvoie au dépôt.
- Le champ de recherche filtre par nom, description et langage ; le bouton
  **En ligne** ne garde que les dépôts qui ont un site.

## Dépôts privés

Sans jeton, seuls les dépôts **publics** sont visibles. Dans **Réglages**, un jeton
GitHub en lecture seule fait aussi apparaître les dépôts privés.

Le jeton reste dans le navigateur : il est envoyé uniquement à `api.github.com`,
et n'est enregistré (dans le `localStorage` de l'appareil) que si la case
« Retenir sur cet appareil » est cochée. À éviter donc sur un appareil partagé,
et à révoquer depuis GitHub en cas de doute.

## Modifier la page

Éditer `index.html`, committer sur `main`, et le site se met à jour tout seul.
Pour tester en local :

```sh
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```
