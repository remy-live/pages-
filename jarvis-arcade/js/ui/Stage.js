/* Gestion des canvas : dimensionnement, densité de pixels, redimensionnement.
 *
 * Tout le dessin de l'interface se fait en pixels CSS. Le contexte est
 * pré-multiplié par le devicePixelRatio une fois pour toutes, de sorte
 * qu'un écran de bornes en 4K n'oblige jamais les écrans à raisonner en
 * pixels physiques.
 */

export class Stage {
  constructor(canvas, { alpha = true, maxPixelRatio = 2 } = {}) {
    this.canvas = canvas;
    this.maxPixelRatio = maxPixelRatio;
    this.ctx = canvas.getContext('2d', { alpha, desynchronized: true });
    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;

    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this.resize();
  }

  get center() { return { x: this.width / 2, y: this.height / 2 }; }

  /** Le plus petit côté — unité de référence pour des tailles qui suivent l'écran. */
  get unit() { return Math.min(this.width, this.height); }

  resize() {
    // Plafonner le ratio : au-delà de 2 le gain visuel est nul et le coût
    // de remplissage devient le poste le plus lourd du rendu.
    const ratio = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);

    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    // setTransform et non scale : resize() est rappelé, scale s'accumulerait.
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return this;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  fill(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
  }
}
