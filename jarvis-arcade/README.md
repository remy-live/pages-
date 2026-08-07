# JARVIS Arcade

Borne de jeu navigable à la main, pour mariages et soirées. Des jeux, et un
photobooth qui compose une planche et l'imprime.

**En ligne :** https://remy-live.github.io/pages-/jarvis-arcade/

## Démarrer

```sh
./scripts/fetch-models.sh          # modèles MediaPipe, une fois après le clone
python3 -m http.server 8000        # depuis la racine du dépôt
# puis http://localhost:8000/jarvis-arcade/
```

La caméra exige `https://` ou `localhost` — une IP locale en clair sera
refusée par le navigateur.

Sans `hand_landmarker.task`, l'application démarre quand même et bascule sur
la souris. C'est volontaire : toute l'interface se développe au navigateur,
sans caméra ni modèle.

`D` affiche le diagnostic (latence de détection, images/s, délégué, source
du curseur). `Échap` revient au menu.

## Comment c'est fait

```
index.html          trois canvas superposés : caméra, jeu, interface
js/main.js          câblage du DOM et des écrans
js/core/
  App.js            boucle de rendu, navigation, démarrage
  Camera.js         accès webcam, préréglages de résolution
  HandTracker.js    MediaPipe, boucle de détection
  Pointer.js        curseur unique — main ou souris
  OneEuroFilter.js  lissage du curseur
  GameRegistry.js   catalogue des jeux
  Screen.js         contrat commun aux écrans et aux jeux
js/ui/
  Stage.js          canvas, densité de pixels
  UI.js             widgets en mode immédiat
  CameraView.js     retour caméra, vignette ou plein écran
js/screens/         menu, photobooth, hôte de partie
js/games/           un fichier par jeu
js/vendor/          three, howler, mediapipe — figés, servis en local
```

### Le curseur ne connaît pas sa source

`Pointer` expose `x`, `y`, `pressed`, `visible`. Que ce soit la main ou la
souris qui l'alimente ne regarde ni les écrans ni les jeux. C'est ce qui
permet de tout développer sans caméra, et de garder une porte de sortie si
le suivi décroche en pleine soirée.

Le clic est un pincement pouce-index, mesuré relativement à la taille de la
main pour rester indépendant de la distance à la caméra. Les widgets
acceptent aussi le survol maintenu (~0,9 s) : dans une fête, personne ne lit
de mode d'emploi, et il faut que ça finisse toujours par marcher.

### Ce qui rend la détection réactive

Trois choix, du plus au moins payant :

1. **`requestVideoFrameCallback`** au lieu de `requestAnimationFrame` pour
   cadencer l'analyse. rAF suit l'écran, pas la caméra : on analyse soit
   deux fois la même image, soit une image déjà vieille. rVFC réveille le
   code quand une image arrive vraiment.
2. **Délégué GPU**, avec repli CPU automatique. Sur un GPU intégré,
   l'inférence passe typiquement de ~25 ms à ~6 ms.
3. **Basse résolution** — 640×360. Les points de la main sortent aussi
   précis qu'en 1080p, et chaque pixel économisé est un pixel qu'on
   n'envoie pas au GPU. Le photobooth remonte en 1080p le temps de la
   séance, puis redescend.

S'y ajoutent le mode `VIDEO` de MediaPipe (qui suit la main d'une image à
l'autre au lieu de la redétecter) et le filtre 1 € sur le curseur, qui
supprime le tremblement au repos sans ajouter de retard en mouvement.

Boucle de rendu et boucle de détection sont **séparées** : le rendu lit le
dernier résultat disponible. Les synchroniser ferait attendre l'un ou
l'autre, pour rien.

## Ajouter un jeu

1. Copier `js/games/BalloonPop.js` — c'est le gabarit le plus court.
2. Étendre `Screen` : `enter()`, `update(dt)`, `draw(ui)`, `exit()`.
3. Appeler `this.finish(score)` à la fin. L'écran de fin, le « rejouer » et
   le retour au menu sont fournis par l'hôte.
4. Déclarer le jeu dans `GAMES`, dans `js/core/GameRegistry.js`.

Le module n'est chargé qu'au lancement de la partie : un jeu qui embarque
three.js ne coûte rien tant que personne n'y joue.

```js
import { Screen } from '../core/Screen.js';

export default class MonJeu extends Screen {
  async enter() { this.score = 0; }
  update(dt)    { const p = this.app.pointer; /* p.x, p.y, p.pressed */ }
  draw(ui)      { ui.text(`${this.score}`, 30, 30, { align: 'left' }); }
  exit()        {}
}
```

## Librairies

Figées dans `js/vendor/`, pas de CDN — la borne doit tourner sans réseau.

| Librairie | Version | Note |
|---|---|---|
| three | r180 | non chargé par la coquille ; réservé aux jeux 3D |
| howler | 2.2.4 | |
| @mediapipe/tasks-vision | 0.10.20 | + le WASM SIMD (9,6 Mo) |

## Reste à faire

- Rapatrier les jeux existants (Shuriken, Neon Invaders, Flappy Squat,
  Fruit Blade, Nuts, Neon Blade…) sur ce socle.
- Vendoriser la police Orbitron dans `assets/fonts/` : la coquille tourne
  aujourd'hui sur une pile système, il manque le look d'origine.
- Enveloppe Electron pour la borne : plein écran kiosque, impression
  silencieuse vers l'imprimante photo, liaison série avec l'Arduino.
- Sons, écran d'attente, tableau des scores.
