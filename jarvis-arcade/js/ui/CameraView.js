/* Retour caméra.
 *
 * Le canvas est dimensionné sur sa taille d'affichage, jamais sur celle du
 * flux : recopier 1080 lignes dans une vignette de 288 px coûterait plus
 * cher que l'inférence elle-même. En vignette, on dessine donc une image
 * réduite — et une image sur deux, l'œil n'y voit rien.
 */

const SKELETON = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const CAMERA_MODE = {
  HIDDEN: 'hidden',
  VIGNETTE: 'vignette',
  FULLSCREEN: 'fullscreen',
};

export class CameraView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.mode = CAMERA_MODE.HIDDEN;
    this.showSkeleton = false;
    this._frame = 0;
    this._sized = { w: 0, h: 0 };
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.canvas.classList.toggle('vignette', mode === CAMERA_MODE.VIGNETTE);
    this.canvas.classList.toggle('hidden', mode === CAMERA_MODE.HIDDEN);
  }

  /**
   * @param {HTMLVideoElement} video
   * @param {import('../core/HandTracker.js').HandTracker|null} tracker
   */
  draw(video, tracker) {
    if (this.mode === CAMERA_MODE.HIDDEN) return;
    if (!video || video.videoWidth === 0) return;

    this._frame++;
    // La vignette est un contrôle, pas un spectacle : 30 Hz suffit.
    if (this.mode === CAMERA_MODE.VIGNETTE && this._frame % 2 === 1) return;

    const aspect = video.videoWidth / video.videoHeight;
    const cssWidth = this.canvas.clientWidth || video.videoWidth;
    const cssHeight = this.mode === CAMERA_MODE.VIGNETTE
      ? Math.round(cssWidth / aspect)
      : (this.canvas.clientHeight || video.videoHeight);

    // La vignette impose sa hauteur par le ratio ; le CSS ne la connaît pas.
    if (this.mode === CAMERA_MODE.VIGNETTE) {
      this.canvas.style.height = `${cssHeight}px`;
    } else {
      this.canvas.style.height = '';
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cssWidth * ratio);
    const h = Math.round(cssHeight * ratio);
    if (this._sized.w !== w || this._sized.h !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this._sized = { w, h };
    }

    const ctx = this.ctx;
    ctx.save();
    // Miroir : l'invité doit se voir comme dans une glace, sinon lever la
    // main droite déplace le curseur du mauvais côté.
    ctx.translate(w, 0);
    ctx.scale(-1, 1);

    if (this.mode === CAMERA_MODE.FULLSCREEN) {
      // Recadrage « cover » : on remplit l'écran sans déformer les visages.
      const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
      const dw = video.videoWidth * scale;
      const dh = video.videoHeight * scale;
      ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }

    if (this.showSkeleton && tracker && tracker.hasHand) {
      this._drawSkeleton(ctx, tracker.result.hands, w, h);
    }

    ctx.restore();
  }

  _drawSkeleton(ctx, hands, w, h) {
    ctx.lineWidth = Math.max(1.5, w * 0.004);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
    ctx.fillStyle = '#fff';

    for (const hand of hands) {
      ctx.beginPath();
      for (const [a, b] of SKELETON) {
        const pa = hand[a];
        const pb = hand[b];
        if (!pa || !pb) continue;
        ctx.moveTo(pa.x * w, pa.y * h);
        ctx.lineTo(pb.x * w, pb.y * h);
      }
      ctx.stroke();

      for (const point of hand) {
        ctx.beginPath();
        ctx.arc(point.x * w, point.y * h, Math.max(2, w * 0.005), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Capture une image plein cadre, non miroir, pour le photobooth. */
  snapshot(video, width = video.videoWidth, height = video.videoHeight) {
    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d');
    // On garde le miroir : les invités posent en se regardant, et une
    // photo retournée par rapport à ce qu'ils voyaient surprend toujours.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    ctx.drawImage(video, (width - dw) / 2, (height - dh) / 2, dw, dh);
    return off;
  }
}
