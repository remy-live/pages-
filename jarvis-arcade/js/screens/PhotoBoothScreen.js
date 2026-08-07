/* Photobooth.
 *
 * Quatre photos, un décompte, une planche composée, puis impression.
 *
 * La caméra passe en haute résolution le temps de la séance, puis revient
 * en basse résolution pour le reste de la borne : la détection de main n'a
 * pas besoin de 1080p, mais un souvenir de mariage si. Le changement de
 * flux est protégé — si la caméra refuse la montée en résolution, on prend
 * la photo dans la définition courante plutôt que d'abandonner la séance.
 *
 * Impression : `window.print()` sur une feuille dédiée. Suffisant pour
 * développer en ligne ; l'impression silencieuse vers l'imprimante photo
 * viendra avec l'enveloppe Electron.
 */

import { Screen } from '../core/Screen.js';
import { THEME } from '../ui/UI.js';
import { CAMERA_MODE } from '../ui/CameraView.js';

const SHOT_COUNT = 4;
const COUNTDOWN_MS = 3000;
const FLASH_MS = 260;
const BETWEEN_SHOTS_MS = 900;

/* Planche 10×15 à 300 dpi, en portrait. */
const SHEET = { width: 1200, height: 1800, margin: 48, gap: 24 };

export class PhotoBoothScreen extends Screen {
  constructor(app) {
    super(app);
    this.phase = 'ready';
    this.shots = [];
    this.timer = 0;
    this.sheet = null;
    this._previousMode = CAMERA_MODE.VIGNETTE;
    this._resolutionSwitched = false;
  }

  async enter() {
    this.phase = 'ready';
    this.shots = [];
    this.timer = 0;
    this.sheet = null;

    if (!this.app.camera.stream) {
      // Sans caméra il n'y a pas de séance possible : on le dit et on sort.
      await this.app.go('menu', { error: "Photobooth indisponible : aucune caméra." });
      return;
    }

    this._previousMode = this.app.cameraView.mode;
    this.app.cameraView.setMode(CAMERA_MODE.FULLSCREEN);
    await this._useResolution('photo');
  }

  exit() {
    this.app.cameraView.setMode(this._previousMode);
    if (this._resolutionSwitched) {
      // Volontairement non attendu : on ne bloque pas le retour au menu
      // pour un rétablissement de résolution.
      this._useResolution('fast');
    }
    this._removeSheet();
  }

  /** Change la définition du flux et relance le suivi dessus. */
  async _useResolution(preset) {
    const tracker = this.app.tracker;
    try {
      if (tracker) tracker.stop();
      await this.app.camera.start(preset);
      if (tracker) tracker.start(this.app.dom.video);
      this._resolutionSwitched = preset === 'photo';
    } catch (error) {
      console.warn(`[PhotoBooth] passage en « ${preset} » impossible.`, error);
      // Le flux précédent a pu être coupé : on tente de le rouvrir.
      try {
        await this.app.camera.start('fast');
        if (tracker) tracker.start(this.app.dom.video);
      } catch (fatal) {
        console.error('[PhotoBooth] caméra perdue.', fatal);
        this.app.handTrackingReady = false;
      }
    }
  }

  update(dt) {
    if (this.phase === 'countdown' || this.phase === 'flash' || this.phase === 'pause') {
      this.timer -= dt;
    }

    if (this.phase === 'countdown' && this.timer <= 0) {
      this._capture();
      this.phase = 'flash';
      this.timer = FLASH_MS;
      return;
    }

    if (this.phase === 'flash' && this.timer <= 0) {
      if (this.shots.length >= SHOT_COUNT) {
        this.sheet = this._compose();
        this.phase = 'review';
      } else {
        this.phase = 'pause';
        this.timer = BETWEEN_SHOTS_MS;
      }
      return;
    }

    if (this.phase === 'pause' && this.timer <= 0) {
      this.phase = 'countdown';
      this.timer = COUNTDOWN_MS;
    }
  }

  _capture() {
    const video = this.app.dom.video;
    if (!video || video.videoWidth === 0) return;
    this.shots.push(this.app.cameraView.snapshot(video));
  }

  /** Assemble les clichés en une planche 2×2 prête à imprimer. */
  _compose() {
    const canvas = document.createElement('canvas');
    canvas.width = SHEET.width;
    canvas.height = SHEET.height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, SHEET.width, SHEET.height);

    const cols = 2;
    const rows = 2;
    const headerHeight = 150;
    const footerHeight = 110;

    const cellW = (SHEET.width - SHEET.margin * 2 - SHEET.gap * (cols - 1)) / cols;
    const cellH = (SHEET.height - headerHeight - footerHeight - SHEET.gap * (rows - 1)) / rows;

    this.shots.slice(0, cols * rows).forEach((shot, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = SHEET.margin + col * (cellW + SHEET.gap);
      const y = headerHeight + row * (cellH + SHEET.gap);

      // Recadrage centré : on remplit la case sans déformer les visages.
      const scale = Math.max(cellW / shot.width, cellH / shot.height);
      const dw = shot.width * scale;
      const dh = shot.height * scale;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cellW, cellH);
      ctx.clip();
      ctx.drawImage(shot, x + (cellW - dw) / 2, y + (cellH - dh) / 2, dw, dh);
      ctx.restore();

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, cellW, cellH);
    });

    ctx.fillStyle = THEME.neon;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 64px ${THEME.font}`;
    ctx.fillText('JARVIS ARCADE', SHEET.width / 2, headerHeight / 2);

    ctx.fillStyle = '#7d8f96';
    ctx.font = `400 30px ${THEME.font}`;
    ctx.fillText(
      new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
      SHEET.width / 2,
      SHEET.height - footerHeight / 2,
    );

    return canvas;
  }

  _print() {
    if (!this.sheet) return;
    this._removeSheet();

    const holder = document.createElement('div');
    holder.id = 'print-sheet';
    const img = document.createElement('img');
    img.src = this.sheet.toDataURL('image/jpeg', 0.94);
    holder.appendChild(img);
    document.body.appendChild(holder);

    // Laisser le décodage se faire, sinon certains navigateurs impriment
    // une image vide.
    const launch = () => window.print();
    if (img.complete) launch();
    else img.onload = launch;
  }

  _download() {
    if (!this.sheet) return;
    const link = document.createElement('a');
    link.download = `jarvis-arcade-${Date.now()}.jpg`;
    link.href = this.sheet.toDataURL('image/jpeg', 0.94);
    link.click();
  }

  _removeSheet() {
    const existing = document.getElementById('print-sheet');
    if (existing) existing.remove();
  }

  draw(ui) {
    const stage = this.app.stage;

    if (this.phase === 'review') return this._drawReview(ui);
    if (this.phase === 'ready') return this._drawReady(ui);

    // Séance en cours : décompte, compteur de poses, flash.
    if (this.phase === 'countdown') {
      const remaining = Math.ceil(this.timer / 1000);
      ui.title(String(remaining), stage.width / 2, stage.height / 2, stage.unit * 0.32);
    } else if (this.phase === 'pause') {
      ui.title('Changez de pose !', stage.width / 2, stage.height / 2, stage.unit * 0.075);
    }

    ui.text(
      `Photo ${Math.min(this.shots.length + 1, SHOT_COUNT)} / ${SHOT_COUNT}`,
      stage.width / 2,
      stage.height * 0.12,
      { size: Math.max(14, stage.unit * 0.03), color: THEME.fg },
    );

    if (this.phase === 'flash') {
      const ctx = ui.ctx;
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, this.timer / FLASH_MS) * 0.85})`;
      ctx.fillRect(0, 0, stage.width, stage.height);
      ctx.restore();
    }
  }

  _drawReady(ui) {
    const stage = this.app.stage;
    ui.title('PHOTOBOOTH', stage.width / 2, stage.height * 0.16, Math.min(stage.unit * 0.09, 62));
    ui.text(
      `${SHOT_COUNT} photos, un décompte de 3 secondes entre chacune.`,
      stage.width / 2, stage.height * 0.26,
      { size: Math.max(13, stage.unit * 0.024) },
    );

    const w = Math.min(stage.width * 0.42, 420);
    const h = Math.max(72, stage.unit * 0.11);

    if (ui.button('photo-start', {
      x: stage.width / 2 - w / 2, y: stage.height * 0.62, w, h,
    }, { label: 'C\'EST PARTI' })) {
      this.phase = 'countdown';
      this.timer = COUNTDOWN_MS;
    }

    if (ui.button('photo-back', {
      x: stage.width / 2 - w / 2, y: stage.height * 0.62 + h + 18, w, h: h * 0.72,
    }, { label: 'RETOUR', accent: THEME.muted })) {
      this.app.go('menu');
    }
  }

  _drawReview(ui) {
    const stage = this.app.stage;
    const ctx = ui.ctx;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 10, 0.9)';
    ctx.fillRect(0, 0, stage.width, stage.height);
    ctx.restore();

    // Aperçu de la planche, à l'échelle.
    if (this.sheet) {
      const maxH = stage.height * 0.6;
      const scale = maxH / this.sheet.height;
      const w = this.sheet.width * scale;
      ctx.drawImage(this.sheet, stage.width / 2 - w / 2, stage.height * 0.08, w, maxH);
    }

    const buttonW = Math.min(stage.width * 0.26, 260);
    const buttonH = Math.max(58, stage.unit * 0.085);
    const y = stage.height * 0.76;
    const gap = 16;
    const totalW = buttonW * 3 + gap * 2;
    let x = stage.width / 2 - totalW / 2;

    if (ui.button('photo-print', { x, y, w: buttonW, h: buttonH }, { label: 'IMPRIMER' })) {
      this._print();
    }
    x += buttonW + gap;

    if (ui.button('photo-save', { x, y, w: buttonW, h: buttonH }, { label: 'TÉLÉCHARGER' })) {
      this._download();
    }
    x += buttonW + gap;

    if (ui.button('photo-again', { x, y, w: buttonW, h: buttonH },
      { label: 'RECOMMENCER', accent: THEME.muted })) {
      this.shots = [];
      this.sheet = null;
      this._removeSheet();
      this.phase = 'ready';
    }

    if (ui.button('photo-exit', {
      x: stage.width / 2 - buttonW / 2, y: y + buttonH + gap, w: buttonW, h: buttonH * 0.75,
    }, { label: 'MENU', accent: THEME.muted })) {
      this.app.go('menu');
    }
  }
}
