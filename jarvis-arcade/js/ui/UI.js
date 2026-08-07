/* Interface en mode immédiat.
 *
 * Un écran décrit ce qu'il affiche à chaque image, et les widgets renvoient
 * directement s'ils viennent d'être activés :
 *
 *     if (ui.button('play', rect, { label: 'JOUER' })) this.startGame();
 *
 * Aucun arbre de composants, aucun écouteur à désabonner : ajouter un écran
 * ou un jeu ne demande qu'une fonction de dessin. Seul l'état strictement
 * temporel (survol, temporisation) est conservé d'une image à l'autre, dans
 * une table indexée par identifiant.
 *
 * Deux façons d'activer un bouton, volontairement redondantes : le
 * pincement, rapide, pour qui a compris le geste ; et le survol maintenu,
 * qui finit toujours par marcher pour les autres. Dans une soirée, personne
 * ne lit de mode d'emploi.
 */

export const THEME = {
  neon: '#00ffff',
  neonSoft: 'rgba(0, 255, 255, 0.16)',
  neonEdge: 'rgba(0, 255, 255, 0.45)',
  fg: '#e8f6f8',
  muted: '#7d8f96',
  danger: '#ff4d6d',
  panel: 'rgba(9, 17, 22, 0.72)',
  font: '"Orbitron", "Eurostile", "Bahnschrift", system-ui, sans-serif',
};

/** Durée de survol nécessaire à une activation sans pincement. */
const DWELL_MS = 900;

/** Après activation, temps mort avant qu'un même widget puisse re-déclencher. */
const REARM_MS = 450;

function roundedPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export class UI {
  constructor() {
    /** @type {Map<string, {hover:number, rearm:number, seen:number}>} */
    this._widgets = new Map();
    this._frame = 0;
    this._claimed = false;
    this.stage = null;
    this.ctx = null;
    this.pointer = null;
    this.dt = 0;
  }

  /** Ouvre une image de rendu. `dt` est en millisecondes. */
  begin(stage, pointer, dt) {
    this.stage = stage;
    this.ctx = stage.ctx;
    this.pointer = pointer;
    this.dt = dt;
    this._frame++;
    this._claimed = false;
    return this;
  }

  /** Ferme l'image et purge l'état des widgets qui ne sont plus affichés. */
  end() {
    for (const [id, state] of this._widgets) {
      if (state.seen !== this._frame) this._widgets.delete(id);
    }
  }

  _state(id) {
    let state = this._widgets.get(id);
    if (!state) {
      state = { hover: 0, rearm: 0, seen: 0 };
      this._widgets.set(id, state);
    }
    state.seen = this._frame;
    return state;
  }

  hitTest(rect) {
    const p = this.pointer;
    return p.visible
      && p.x >= rect.x && p.x <= rect.x + rect.w
      && p.y >= rect.y && p.y <= rect.y + rect.h;
  }

  /**
   * Bouton rectangulaire.
   * @returns {boolean} vrai sur l'image où il vient d'être activé
   */
  button(id, rect, options = {}) {
    const {
      label = '',
      sublabel = '',
      accent = THEME.neon,
      disabled = false,
      fontSize = Math.max(14, Math.min(rect.h * 0.3, 28)),
    } = options;

    const state = this._state(id);
    const ctx = this.ctx;

    // Un seul widget peut être survolé : les écrans se superposent
    // (modale au-dessus du menu) et on ne veut pas activer les deux.
    const hovered = !disabled && !this._claimed && this.hitTest(rect);
    if (hovered) this._claimed = true;

    if (state.rearm > 0) {
      state.rearm = Math.max(0, state.rearm - this.dt);
    }

    let activated = false;

    if (hovered && state.rearm === 0) {
      state.hover += this.dt;
      if (this.pointer.justPressed) activated = true;
      else if (this.pointer.source === 'hand' && state.hover >= DWELL_MS) activated = true;
    } else if (!hovered) {
      // Retour progressif : un curseur qui tremble à la frontière d'un
      // bouton ne doit pas perdre toute sa progression.
      state.hover = Math.max(0, state.hover - this.dt * 2);
    }

    if (activated) {
      state.hover = 0;
      state.rearm = REARM_MS;
    }

    const progress = Math.min(1, state.hover / DWELL_MS);
    const glow = hovered ? 0.35 + progress * 0.45 : 0.12;

    ctx.save();

    roundedPath(ctx, rect.x, rect.y, rect.w, rect.h, options.radius ?? 16);
    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.03)' : THEME.panel;
    ctx.fill();

    if (progress > 0) {
      // Remplissage horizontal : matérialise le temps qu'il reste à
      // patienter quand on active par survol.
      ctx.save();
      ctx.clip();
      ctx.fillStyle = `rgba(0, 255, 255, ${0.10 + progress * 0.18})`;
      ctx.fillRect(rect.x, rect.y, rect.w * progress, rect.h);
      ctx.restore();
    }

    roundedPath(ctx, rect.x, rect.y, rect.w, rect.h, options.radius ?? 16);
    ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.08)' : accent;
    ctx.globalAlpha = disabled ? 1 : glow + 0.4;
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.25)' : THEME.fg;
    ctx.font = `700 ${fontSize}px ${THEME.font}`;
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;

    if (sublabel) {
      ctx.fillText(label, cx, cy - fontSize * 0.35);
      ctx.font = `400 ${fontSize * 0.52}px ${THEME.font}`;
      ctx.fillStyle = THEME.muted;
      ctx.fillText(sublabel, cx, cy + fontSize * 0.65);
    } else {
      ctx.fillText(label, cx, cy);
    }

    ctx.restore();
    return activated;
  }

  /** Titre centré avec halo, utilisé en tête d'écran. */
  title(text, x, y, size) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${size}px ${THEME.font}`;
    ctx.shadowColor = THEME.neon;
    ctx.shadowBlur = size * 0.5;
    ctx.fillStyle = THEME.neon;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  text(content, x, y, options = {}) {
    const {
      size = 16,
      color = THEME.muted,
      align = 'center',
      baseline = 'middle',
      weight = 400,
    } = options;
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.font = `${weight} ${size}px ${THEME.font}`;
    ctx.fillStyle = color;
    ctx.fillText(content, x, y);
    ctx.restore();
  }

  /** Curseur : un réticule dont l'anneau se referme quand on pince. */
  cursor() {
    const p = this.pointer;
    if (!p.visible) return;

    const ctx = this.ctx;
    const base = 17;
    const radius = base * (1 - p.pinch * 0.42);

    ctx.save();
    ctx.translate(p.x, p.y);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = THEME.neon;
    ctx.lineWidth = 2 + p.pinch * 1.5;
    ctx.shadowColor = THEME.neon;
    ctx.shadowBlur = 14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 2.5 + p.pinch * 2, 0, Math.PI * 2);
    ctx.fillStyle = THEME.neon;
    ctx.fill();

    ctx.restore();
  }
}
