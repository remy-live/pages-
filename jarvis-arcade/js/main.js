/* Point d'entrée : câble le DOM, enregistre les écrans, démarre la borne. */

import { App } from './core/App.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { PhotoBoothScreen } from './screens/PhotoBoothScreen.js';
import { GameScreen } from './screens/GameScreen.js';

const dom = {
  video: document.getElementById('webcam'),
  cameraCanvas: document.getElementById('camera-canvas'),
  uiCanvas: document.getElementById('ui-canvas'),
  gameLayer: document.getElementById('game-layer'),
  boot: document.getElementById('boot'),
  bootBar: document.getElementById('boot-bar'),
  bootStatus: document.getElementById('boot-status'),
  bootActions: document.getElementById('boot-actions'),
};

const app = new App(dom);

app.register('menu', (a) => new MenuScreen(a));
app.register('photobooth', (a) => new PhotoBoothScreen(a));
app.register('game', (a) => new GameScreen(a));

// Utile depuis la console pendant le développement : app.showDiagnostics, etc.
window.app = app;

app.start().catch((error) => {
  console.error('[main] démarrage impossible.', error);
  if (dom.bootStatus) {
    dom.bootStatus.textContent = `Démarrage impossible : ${error.message}`;
    dom.bootStatus.classList.add('error');
  }
  if (dom.bootActions) {
    dom.bootActions.hidden = false;
    dom.bootActions.querySelector('#boot-retry')
      ?.addEventListener('click', () => window.location.reload());
    dom.bootActions.querySelector('#boot-skip')
      ?.addEventListener('click', () => dom.boot.remove());
  }
});
