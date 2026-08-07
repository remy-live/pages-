/* Accès webcam.
 *
 * La résolution demandée est délibérément basse : les points de la main
 * sont détectés aussi bien en 640×360 qu'en 1080p, mais chaque pixel en
 * plus est un pixel à uploader vers le GPU à chaque image. C'est le
 * réglage qui pèse le plus sur la latence de détection.
 *
 * Le rendu à l'écran ne souffre pas : le retour caméra est décoratif, et
 * une vignette de 288 px n'a pas besoin de plus.
 */

export const CAMERA_PRESETS = {
  // Par défaut : le meilleur compromis latence/précision sur la borne.
  fast:     { width: 640,  height: 360, frameRate: 60 },
  // Si la détection décroche sur les mains éloignées.
  balanced: { width: 960,  height: 540, frameRate: 30 },
  // Pour le photobooth, où c'est la photo qui compte.
  photo:    { width: 1920, height: 1080, frameRate: 30 },
};

export class CameraError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CameraError';
    this.code = code;
  }
}

function describe(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new CameraError(
        'denied',
        "Accès à la caméra refusé. Autorise la caméra puis réessaie.",
      );
    case 'NotFoundError':
    case 'OverconstrainedError':
      return new CameraError(
        'not-found',
        "Aucune caméra utilisable n'a été trouvée.",
      );
    case 'NotReadableError':
      return new CameraError(
        'busy',
        "La caméra est déjà utilisée par une autre application.",
      );
    default:
      return new CameraError('unknown', `Caméra indisponible : ${err && err.message ? err.message : err}`);
  }
}

export class Camera {
  constructor(videoEl) {
    this.video = videoEl;
    this.stream = null;
    this.preset = null;
  }

  get width() { return this.video.videoWidth; }
  get height() { return this.video.videoHeight; }
  get ready() { return this.video.readyState >= 2 && this.video.videoWidth > 0; }

  /**
   * Ouvre le flux et attend la première image décodable.
   * @param {keyof CAMERA_PRESETS|object} preset
   */
  async start(preset = 'fast') {
    const wanted = typeof preset === 'string' ? CAMERA_PRESETS[preset] : preset;
    if (!wanted) throw new CameraError('bad-preset', `Préréglage caméra inconnu : ${preset}`);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new CameraError(
        'insecure-context',
        "La caméra exige HTTPS (ou localhost). Ouvre le site en https://.",
      );
    }

    this.stop();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          // `ideal` et non `exact` : mieux vaut une caméra qui démarre dans
          // une résolution voisine qu'une erreur OverconstrainedError.
          width: { ideal: wanted.width },
          height: { ideal: wanted.height },
          frameRate: { ideal: wanted.frameRate },
        },
      });
    } catch (err) {
      throw describe(err);
    }

    this.preset = wanted;
    this.video.srcObject = this.stream;

    await new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new CameraError('decode', "Le flux caméra n'a pas pu démarrer.")); };
      const cleanup = () => {
        this.video.removeEventListener('loadeddata', done);
        this.video.removeEventListener('error', fail);
      };
      if (this.ready) { resolve(); return; }
      this.video.addEventListener('loadeddata', done, { once: true });
      this.video.addEventListener('error', fail, { once: true });
    });

    // Safari refuse parfois de lancer la lecture sans geste utilisateur ;
    // le flux reste alors figé sur la première image.
    try { await this.video.play(); } catch { /* le flux tourne déjà */ }

    return this;
  }

  /** Résolution réellement obtenue, qui peut différer de celle demandée. */
  settings() {
    const track = this.stream && this.stream.getVideoTracks()[0];
    return track ? track.getSettings() : null;
  }

  stop() {
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.video.srcObject) this.video.srcObject = null;
  }
}
