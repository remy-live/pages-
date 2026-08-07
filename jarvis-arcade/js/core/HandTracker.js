/* Suivi de main via MediaPipe Hand Landmarker.
 *
 * Trois décisions portent l'essentiel de la latence :
 *
 * 1. La boucle est cadencée par `requestVideoFrameCallback`, pas par
 *    `requestAnimationFrame`. rAF suit l'écran (60 Hz) alors que la caméra
 *    livre ses images à son propre rythme : on analyse donc soit deux fois
 *    la même image, soit une image déjà vieille. rVFC réveille le code au
 *    moment exact où une nouvelle image arrive — c'est gratuit, et ça
 *    supprime une demi-période de retard.
 *
 * 2. Délégué GPU. Sur processeur graphique intégré l'inférence passe
 *    typiquement de ~25 ms à ~6 ms. On retombe automatiquement sur le CPU
 *    si la création GPU échoue.
 *
 * 3. `runningMode: 'VIDEO'`. MediaPipe garde alors la main d'une image à
 *    l'autre et ne relance le détecteur complet que lorsqu'il l'a perdue.
 *    En mode IMAGE, la détection complète tourne à chaque image.
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export class ModelMissingError extends Error {
  constructor(url) {
    super(
      `Modèle introuvable : ${url}\n` +
      `Lance scripts/fetch-models.sh pour le télécharger dans assets/models/.`,
    );
    this.name = 'ModelMissingError';
    this.url = url;
  }
}

/** Indices des points de repère utilisés ailleurs dans l'app. */
export const LANDMARK = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
};

export class HandTracker {
  constructor({
    wasmPath = './js/vendor/mediapipe/wasm',
    modelPath = './assets/models/hand_landmarker.task',
    numHands = 1,
    // Seuils volontairement bas : sur une borne la main est proche et bien
    // éclairée, et un décrochage coûte plus cher qu'un faux positif — une
    // reprise passe par une détection complète, donc par un à-coup.
    minHandDetectionConfidence = 0.5,
    minHandPresenceConfidence = 0.4,
    minTrackingConfidence = 0.4,
  } = {}) {
    this.wasmPath = wasmPath;
    this.modelPath = modelPath;
    this.options = {
      numHands,
      minHandDetectionConfidence,
      minHandPresenceConfidence,
      minTrackingConfidence,
    };

    this.landmarker = null;
    this.video = null;
    this.running = false;
    this.delegate = null;

    /** Dernier résultat. `hands` est vide quand aucune main n'est vue. */
    this.result = { hands: [], handedness: [], at: 0 };

    /** Mesures affichées par le HUD de diagnostic. */
    this.stats = { inferenceMs: 0, fps: 0, frames: 0, drops: 0 };

    this._lastTimestamp = -1;
    this._frameHandle = null;
    this._rafHandle = null;
    this._lastMediaTime = -1;
    this._fpsWindowStart = 0;
    this._fpsWindowFrames = 0;
    this._onFrame = this._onFrame.bind(this);
    this._onRaf = this._onRaf.bind(this);
  }

  get hasHand() { return this.result.hands.length > 0; }

  /**
   * Charge le WASM puis le modèle.
   * @param {(ratio:number, label:string)=>void} [onProgress]
   */
  async init(onProgress = () => {}) {
    onProgress(0.1, 'Chargement du moteur de vision…');

    // On vérifie le modèle avant de payer l'initialisation du WASM : sans
    // lui rien ne sert de continuer, et le message d'erreur est plus clair.
    await this._assertModelPresent();

    const fileset = await FilesetResolver.forVisionTasks(this.wasmPath);
    onProgress(0.55, 'Chargement du modèle de main…');

    const base = {
      baseOptions: { modelAssetPath: this.modelPath },
      runningMode: 'VIDEO',
      ...this.options,
    };

    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...base,
        baseOptions: { ...base.baseOptions, delegate: 'GPU' },
      });
      this.delegate = 'GPU';
    } catch (gpuError) {
      console.warn('[HandTracker] délégué GPU indisponible, repli CPU.', gpuError);
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        ...base,
        baseOptions: { ...base.baseOptions, delegate: 'CPU' },
      });
      this.delegate = 'CPU';
    }

    onProgress(1, `Vision prête (${this.delegate}).`);
    return this;
  }

  async _assertModelPresent() {
    let response;
    try {
      response = await fetch(this.modelPath, { method: 'HEAD' });
    } catch {
      throw new ModelMissingError(this.modelPath);
    }
    if (!response.ok) throw new ModelMissingError(this.modelPath);
  }

  /** Démarre la boucle d'analyse sur un élément <video> déjà en lecture. */
  start(video) {
    if (!this.landmarker) throw new Error('HandTracker.init() doit être appelé avant start().');
    if (this.running) return;

    this.video = video;
    this.running = true;
    this._fpsWindowStart = performance.now();
    this._fpsWindowFrames = 0;

    if (typeof video.requestVideoFrameCallback === 'function') {
      this._frameHandle = video.requestVideoFrameCallback(this._onFrame);
    } else {
      // Firefox n'implémente pas encore rVFC : on retombe sur rAF en
      // filtrant les images déjà analysées via currentTime.
      this._rafHandle = requestAnimationFrame(this._onRaf);
    }
  }

  stop() {
    this.running = false;
    if (this._frameHandle != null && this.video && this.video.cancelVideoFrameCallback) {
      this.video.cancelVideoFrameCallback(this._frameHandle);
    }
    if (this._rafHandle != null) cancelAnimationFrame(this._rafHandle);
    this._frameHandle = null;
    this._rafHandle = null;
  }

  /** Libère le modèle et le contexte WASM. */
  close() {
    this.stop();
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
  }

  _onFrame(now, metadata) {
    if (!this.running) return;
    this._detect(metadata ? metadata.mediaTime * 1000 : now);
    this._frameHandle = this.video.requestVideoFrameCallback(this._onFrame);
  }

  _onRaf() {
    if (!this.running) return;
    const t = this.video.currentTime;
    if (t !== this._lastMediaTime) {
      this._lastMediaTime = t;
      this._detect(t * 1000);
    } else {
      this.stats.drops++;
    }
    this._rafHandle = requestAnimationFrame(this._onRaf);
  }

  _detect(mediaTimeMs) {
    if (!this.video || this.video.videoWidth === 0) return;

    // MediaPipe exige des horodatages strictement croissants et rejette
    // tout retour en arrière — or mediaTime peut se répéter, voire reculer
    // après un changement de piste. On force la monotonie.
    let ts = Math.round(mediaTimeMs);
    if (ts <= this._lastTimestamp) ts = this._lastTimestamp + 1;
    this._lastTimestamp = ts;

    const started = performance.now();
    let output;
    try {
      output = this.landmarker.detectForVideo(this.video, ts);
    } catch (err) {
      // Une image illisible ne doit pas tuer la boucle : on saute un tour.
      this.stats.drops++;
      console.warn('[HandTracker] image ignorée.', err);
      return;
    }
    const elapsed = performance.now() - started;

    // Moyenne glissante : la valeur brute saute trop pour être lisible.
    this.stats.inferenceMs += (elapsed - this.stats.inferenceMs) * 0.1;
    this.stats.frames++;

    this._fpsWindowFrames++;
    const windowMs = started - this._fpsWindowStart;
    if (windowMs >= 500) {
      this.stats.fps = (this._fpsWindowFrames * 1000) / windowMs;
      this._fpsWindowStart = started;
      this._fpsWindowFrames = 0;
    }

    this.result = {
      hands: output.landmarks || [],
      handedness: output.handedness || [],
      at: started,
    };
  }
}
