/* Chef d'orchestre de la borne.
 *
 * Possède la scène, le curseur, la caméra et l'écran courant ; fait tourner
 * l'unique boucle de rendu. Les écrans ne se connaissent pas entre eux :
 * ils naviguent par `app.go('menu')`, ce qui évite les allers-retours de
 * références et rend chaque écran testable isolément.
 *
 * Point important pour la latence : la boucle de rendu (rAF, calée sur
 * l'écran) et la boucle de détection (rVFC, calée sur la caméra) sont
 * distinctes. Le rendu lit simplement le dernier résultat disponible. Les
 * synchroniser reviendrait à faire attendre l'affichage après l'inférence,
 * ou l'inverse — dans les deux cas on ajoute du retard sans rien gagner.
 */

import { Stage } from '../ui/Stage.js';
import { UI, THEME } from '../ui/UI.js';
import { Pointer } from './Pointer.js';
import { Camera } from './Camera.js';
import { CameraView, CAMERA_MODE } from '../ui/CameraView.js';
import { HandTracker, ModelMissingError } from './HandTracker.js';

export class App {
  constructor(dom) {
    this.dom = dom;

    this.stage = new Stage(dom.uiCanvas);
    this.ui = new UI();
    this.pointer = new Pointer();
    this.camera = new Camera(dom.video);
    this.cameraView = new CameraView(dom.cameraCanvas);
    this.tracker = null;

    /** Vrai quand le suivi de main est opérationnel. */
    this.handTrackingReady = false;

    /** Écrans instanciés à la volée, gardés pour éviter les recréations. */
    this.screens = new Map();
    this.screen = null;
    this.showDiagnostics = false;

    this._running = false;
    this._lastFrame = 0;
    this._transitioning = false;
    this._tick = this._tick.bind(this);

    this.pointer.attachMouse(window);
    this.pointer.setStage(this.stage.width, this.stage.height);
    window.addEventListener('resize', () => {
      this.stage.resize();
      this.pointer.setStage(this.stage.width, this.stage.height);
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'd' || event.key === 'D') {
        this.showDiagnostics = !this.showDiagnostics;
        this.cameraView.showSkeleton = this.showDiagnostics;
      }
      if (event.key === 'Escape' && this.screen && this.screen.id !== 'menu') {
        this.go('menu');
      }
    });
  }

  /** Enregistre une fabrique d'écran sous un nom de navigation. */
  register(name, factory) {
    this.screens.set(name, { factory, instance: null });
    return this;
  }

  /**
   * Affiche un écran. Les erreurs d'entrée sont rattrapées ici : sur une
   * borne en soirée, un écran qui échoue doit ramener au menu, jamais
   * laisser un écran noir.
   */
  async go(name, params = {}) {
    if (this._transitioning) return;
    const slot = this.screens.get(name);
    if (!slot) throw new Error(`Écran inconnu : ${name}`);

    this._transitioning = true;
    try {
      if (this.screen) {
        this.screen.exit();
        this.screen = null;
      }
      if (!slot.instance) slot.instance = slot.factory(this);
      slot.instance.id = name;
      await slot.instance.enter(params);
      this.screen = slot.instance;
    } catch (error) {
      console.error(`[App] échec de l'écran « ${name} ».`, error);
      this._transitioning = false;
      if (name !== 'menu') {
        await this.go('menu', { error: error.message });
        return;
      }
      throw error;
    }
    this._transitioning = false;
  }

  /* --- Démarrage ------------------------------------------------------- */

  _boot(ratio, label, isError = false) {
    if (this.dom.bootBar) this.dom.bootBar.style.width = `${Math.round(ratio * 100)}%`;
    if (this.dom.bootStatus) {
      this.dom.bootStatus.textContent = label;
      this.dom.bootStatus.classList.toggle('error', isError);
    }
  }

  /**
   * Séquence de démarrage. Ne rejette jamais pour un problème de caméra ou
   * de modèle : la borne bascule sur la souris et le reste de l'interface
   * fonctionne. C'est ce qui rend l'app utilisable en ligne, sans matériel.
   */
  async start() {
    this._boot(0.05, 'Réveil des systèmes…');

    try {
      this._boot(0.15, 'Ouverture de la caméra…');
      await this.camera.start('fast');

      this.tracker = new HandTracker();
      await this.tracker.init((ratio, label) => this._boot(0.3 + ratio * 0.6, label));
      this.tracker.start(this.dom.video);

      this.handTrackingReady = true;
      this.cameraView.setMode(CAMERA_MODE.VIGNETTE);
      this._boot(1, 'Prêt.');
    } catch (error) {
      this.handTrackingReady = false;
      this.camera.stop();
      this.cameraView.setMode(CAMERA_MODE.HIDDEN);

      const reason = error instanceof ModelMissingError
        ? 'Modèle de détection absent — pilotage à la souris.'
        : `${error.message} — pilotage à la souris.`;
      console.warn('[App] suivi de main indisponible.', error);
      this._boot(1, reason, true);
      document.body.classList.add('pointer-mouse');
    }

    this._dismissBoot();
    this._running = true;
    this._lastFrame = performance.now();
    requestAnimationFrame(this._tick);
    await this.go('menu');
  }

  _dismissBoot() {
    const boot = this.dom.boot;
    if (!boot) return;
    // Laisser le message d'erreur lisible avant de découvrir l'interface.
    const delay = this.handTrackingReady ? 350 : 2200;
    setTimeout(() => {
      boot.classList.add('done');
      setTimeout(() => boot.remove(), 700);
    }, delay);
  }

  /* --- Boucle ---------------------------------------------------------- */

  _tick(now) {
    if (!this._running) return;

    // Une seconde de retard signifie que l'onglet dormait ; repartir avec
    // un dt énorme ferait traverser l'écran aux objets des jeux.
    let dt = now - this._lastFrame;
    this._lastFrame = now;
    if (dt > 100) dt = 100;

    this.pointer.update(this.handTrackingReady ? this.tracker : null, now);

    if (this.screen && !this._transitioning) this.screen.update(dt);

    this.cameraView.draw(this.dom.video, this.tracker);

    this.stage.clear();
    this.ui.begin(this.stage, this.pointer, dt);
    if (this.screen && !this._transitioning) this.screen.draw(this.ui);
    if (this.showDiagnostics) this._drawDiagnostics();
    this.ui.cursor();
    this.ui.end();

    requestAnimationFrame(this._tick);
  }

  _drawDiagnostics() {
    const ctx = this.stage.ctx;
    const stats = this.tracker ? this.tracker.stats : null;
    const lines = [
      `écran      ${this.screen ? this.screen.id : '—'}`,
      `curseur    ${this.pointer.source} ${this.pointer.visible ? '' : '(perdu)'}`,
      `pincement  ${this.pointer.pinch.toFixed(2)}`,
      stats ? `détection  ${stats.inferenceMs.toFixed(1)} ms` : 'détection  —',
      stats ? `caméra     ${stats.fps.toFixed(0)} i/s` : 'caméra     —',
      this.tracker ? `délégué    ${this.tracker.delegate}` : 'délégué    —',
    ];

    ctx.save();
    ctx.font = `400 12px ui-monospace, Menlo, Consolas, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(14, 14, 210, lines.length * 17 + 14);
    ctx.fillStyle = THEME.neon;
    lines.forEach((line, i) => ctx.fillText(line, 24, 22 + i * 17));
    ctx.restore();
  }

  stop() {
    this._running = false;
    if (this.tracker) this.tracker.close();
    this.camera.stop();
  }
}
