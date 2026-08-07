/* Curseur unique de la borne, indépendant de sa source.
 *
 * La main et la souris alimentent le même objet. Ni les écrans ni les jeux
 * ne savent laquelle des deux pilote : ils lisent x, y, pressed. C'est ce
 * qui permet de développer l'interface au navigateur sans caméra, et de
 * garder une porte de sortie si le suivi décroche pendant une soirée.
 *
 * Le clic se fait au pincement pouce-index. C'est plus rapide et bien moins
 * frustrant que la sélection par temporisation, qui impose d'attendre sur
 * chaque bouton ; la temporisation reste disponible dans les widgets comme
 * repli pour les invités qui ne trouvent pas le geste.
 */

import { OneEuroFilter2D } from './OneEuroFilter.js';
import { LANDMARK } from './HandTracker.js';

/* La main n'atteint jamais les bords du champ de la caméra : sans
 * correction, les coins de l'écran sont hors de portée. On étire donc la
 * zone utile vers les bords. */
const ACTIVE_ZONE = { x0: 0.16, x1: 0.84, y0: 0.14, y1: 0.86 };

/* Hystérésis du pincement : deux seuils, pour qu'un doigt posé pile sur la
 * limite ne déclenche pas une rafale de clics. */
const PINCH_ON = 0.38;
const PINCH_OFF = 0.52;

/* Au-delà, on considère la main perdue et on cache le curseur. */
const HAND_TIMEOUT_MS = 350;

function remap(value, from0, from1) {
  return Math.min(1, Math.max(0, (value - from0) / (from1 - from0)));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export class Pointer {
  constructor({ filter } = {}) {
    this.x = 0;
    this.y = 0;
    this.visible = false;
    this.pressed = false;
    this.justPressed = false;
    this.justReleased = false;
    this.source = 'none';

    /** 0 = main ouverte, 1 = pincement franc. Sert au retour visuel. */
    this.pinch = 0;

    this._filter = new OneEuroFilter2D(filter);
    this._lastSeen = 0;
    this._mouse = { x: 0, y: 0, active: false, pressed: false };
    this._stage = { width: 1, height: 1 };
    this._detach = null;
  }

  setStage(width, height) {
    this._stage.width = width;
    this._stage.height = height;
  }

  /** Branche la souris et le tactile comme source de repli. */
  attachMouse(target = window) {
    this.detachMouse();

    const move = (event) => {
      this._mouse.x = event.clientX;
      this._mouse.y = event.clientY;
      this._mouse.active = true;
    };
    const down = (event) => { move(event); this._mouse.pressed = true; };
    const up = () => { this._mouse.pressed = false; };
    const leave = () => { this._mouse.active = false; this._mouse.pressed = false; };

    const touch = (event) => {
      const t = event.touches[0];
      if (!t) return;
      this._mouse.x = t.clientX;
      this._mouse.y = t.clientY;
      this._mouse.active = true;
    };
    const touchStart = (event) => { touch(event); this._mouse.pressed = true; };
    const touchEnd = () => { this._mouse.pressed = false; };

    target.addEventListener('mousemove', move, { passive: true });
    target.addEventListener('mousedown', down, { passive: true });
    target.addEventListener('mouseup', up, { passive: true });
    target.addEventListener('mouseleave', leave, { passive: true });
    target.addEventListener('touchstart', touchStart, { passive: true });
    target.addEventListener('touchmove', touch, { passive: true });
    target.addEventListener('touchend', touchEnd, { passive: true });

    this._detach = () => {
      target.removeEventListener('mousemove', move);
      target.removeEventListener('mousedown', down);
      target.removeEventListener('mouseup', up);
      target.removeEventListener('mouseleave', leave);
      target.removeEventListener('touchstart', touchStart);
      target.removeEventListener('touchmove', touch);
      target.removeEventListener('touchend', touchEnd);
    };
  }

  detachMouse() {
    if (this._detach) this._detach();
    this._detach = null;
  }

  /**
   * À appeler une fois par image de rendu.
   * @param {import('./HandTracker.js').HandTracker|null} tracker
   * @param {number} nowMs
   */
  update(tracker, nowMs) {
    const wasPressed = this.pressed;

    const gotHand = tracker && tracker.hasHand
      ? this._updateFromHand(tracker, nowMs)
      : false;

    if (!gotHand) {
      const handRecentlyLost = nowMs - this._lastSeen < HAND_TIMEOUT_MS;
      if (this._mouse.active) {
        // La souris reprend la main dès qu'elle bouge : pratique en
        // développement, et rassurant pendant une soirée si ça décroche.
        this.source = 'mouse';
        this.x = this._mouse.x;
        this.y = this._mouse.y;
        this.visible = true;
        this.pressed = this._mouse.pressed;
        this.pinch = this._mouse.pressed ? 1 : 0;
      } else if (!handRecentlyLost) {
        // Perte franche : on relâche, sinon un bouton resterait enfoncé.
        this.visible = false;
        this.pressed = false;
        this.pinch = 0;
        this.source = 'none';
        this._filter.reset();
      }
    }

    this.justPressed = this.pressed && !wasPressed;
    this.justReleased = !this.pressed && wasPressed;
  }

  _updateFromHand(tracker, nowMs) {
    const hand = tracker.result.hands[0];
    if (!hand || hand.length <= LANDMARK.PINKY_MCP) return false;

    const indexTip = hand[LANDMARK.INDEX_TIP];
    const thumbTip = hand[LANDMARK.THUMB_TIP];
    const wrist = hand[LANDMARK.WRIST];
    const middleMcp = hand[LANDMARK.MIDDLE_MCP];

    // Le pincement est mesuré relativement à la taille de la main : sinon
    // le seuil dépendrait de la distance de l'invité à la caméra.
    const handScale = distance(wrist, middleMcp) || 1e-6;
    const pinchRatio = distance(thumbTip, indexTip) / handScale;
    this.pinch = Math.min(1, Math.max(0, 1 - remap(pinchRatio, PINCH_ON, PINCH_OFF)));

    if (this.pressed) {
      if (pinchRatio > PINCH_OFF) this.pressed = false;
    } else if (pinchRatio < PINCH_ON) {
      this.pressed = true;
    }

    // Image miroir : l'invité se voit comme dans une glace, donc l'axe X
    // du capteur est inversé par rapport à l'écran.
    const nx = remap(1 - indexTip.x, ACTIVE_ZONE.x0, ACTIVE_ZONE.x1);
    const ny = remap(indexTip.y, ACTIVE_ZONE.y0, ACTIVE_ZONE.y1);

    const smoothed = this._filter.filter(
      nx * this._stage.width,
      ny * this._stage.height,
      nowMs / 1000,
    );

    this.x = smoothed.x;
    this.y = smoothed.y;
    this.visible = true;
    this.source = 'hand';
    this._lastSeen = nowMs;
    this._mouse.active = false;
    return true;
  }
}
