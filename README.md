# pages-

Une page unique qui liste mes dépôts GitHub et pointe vers ceux qui ont un site en ligne.

**Adresse du site :** https://remy-live.github.io/pages-/

## Autres pages de ce dépôt

- [`mutation/`](mutation/) — **Aide Mutation**, carte et simulateur de barème pour
  le mouvement intra 2026 de l'académie d'Amiens :
  https://remy-live.github.io/pages-/mutation/

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
