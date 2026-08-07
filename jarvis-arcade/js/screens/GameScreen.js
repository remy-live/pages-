/* Hôte de partie.
 *
 * Charge le jeu demandé, lui délègue tout, et garde la main sur ce qui doit
 * rester constant d'un jeu à l'autre : le bouton de sortie, l'écran de fin,
 * la remise à zéro. Les jeux n'ont donc ni à gérer la navigation, ni à
 * redessiner un « rejouer » chacun de leur côté.
 *
 * Un jeu signale sa fin en appelant `this.finish(score)`.
 */

import { Screen } from '../core/Screen.js';
import { THEME } from '../ui/UI.js';
import { loadGame } from '../core/GameRegistry.js';
import { CAMERA_MODE } from '../ui/CameraView.js';

export class GameScreen extends Screen {
  constructor(app) {
    super(app);
    this.game = null;
    this.gameId = null;
    this.loading = false;
    this.over = false;
    this.score = 0;
    this._dots = 0;
  }

  async enter({ gameId } = {}) {
    this.game = null;
    this.gameId = gameId;
    this.over = false;
    this.score = 0;
    this.loading = true;

    this.app.cameraView.setMode(
      this.app.handTrackingReady ? CAMERA_MODE.VIGNETTE : CAMERA_MODE.HIDDEN,
    );

    const instance = await loadGame(gameId, this.app);
    // Le jeu appelle finish() : c'est l'hôte qui décide de la suite.
    instance.finish = (score = 0) => {
      this.score = score;
      this.over = true;
    };
    await instance.enter();

    this.game = instance;
    this.loading = false;
  }

  update(dt) {
    this._dots += dt;
    if (this.game && !this.over) this.game.update(dt);
  }

  exit() {
    if (this.game) this.game.exit();
    this.game = null;
  }

  draw(ui) {
    const stage = this.app.stage;

    if (this.loading || !this.game) {
      const dots = '.'.repeat(1 + (Math.floor(this._dots / 400) % 3));
      ui.text(`Chargement${dots}`, stage.width / 2, stage.height / 2,
        { size: Math.max(16, stage.unit * 0.03), color: THEME.neon });
      return;
    }

    this.game.draw(ui);

    if (this.over) return this._drawGameOver(ui);

    // Sortie de secours, toujours au même endroit quel que soit le jeu.
    const w = Math.max(96, stage.unit * 0.13);
    const h = Math.max(40, stage.unit * 0.055);
    if (ui.button('game-quit', { x: stage.width - w - 20, y: 20, w, h }, {
      label: 'QUITTER',
      accent: THEME.muted,
      fontSize: Math.max(11, h * 0.3),
      radius: 10,
    })) {
      this.app.go('menu');
    }
  }

  _drawGameOver(ui) {
    const stage = this.app.stage;
    const ctx = ui.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.82)';
    ctx.fillRect(0, 0, stage.width, stage.height);
    ctx.restore();

    ui.title('TERMINÉ', stage.width / 2, stage.height * 0.3, Math.min(stage.unit * 0.11, 74));
    ui.text(`Score : ${this.score}`, stage.width / 2, stage.height * 0.42,
      { size: Math.max(18, stage.unit * 0.04), color: THEME.fg, weight: 700 });

    const w = Math.min(stage.width * 0.3, 280);
    const h = Math.max(60, stage.unit * 0.088);
    const gap = 18;
    let x = stage.width / 2 - w - gap / 2;

    if (ui.button('over-again', { x, y: stage.height * 0.58, w, h }, { label: 'REJOUER' })) {
      this.app.go('game', { gameId: this.gameId });
    }
    x += w + gap;

    if (ui.button('over-menu', { x, y: stage.height * 0.58, w, h },
      { label: 'MENU', accent: THEME.muted })) {
      this.app.go('menu');
    }
  }
}
