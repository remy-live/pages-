/* Éclate-Ballons — jeu de démonstration.
 *
 * Il sert surtout de gabarit : c'est le plus court chemin pour voir ce
 * qu'un jeu doit fournir. Il n'utilise que `app.pointer` et le contexte 2D,
 * donc il tourne aussi bien à la main qu'à la souris.
 *
 * Pour en écrire un autre : copier ce fichier, l'ajouter à GAMES dans
 * core/GameRegistry.js, et appeler `this.finish(score)` à la fin.
 */

import { Screen } from '../core/Screen.js';
import { THEME } from '../ui/UI.js';

const DURATION_MS = 45000;
const SPAWN_INTERVAL_MS = 620;
const COLORS = ['#ff4d6d', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff'];

class Balloon {
  constructor(stage) {
    this.radius = 26 + Math.random() * 34;
    this.x = this.radius + Math.random() * (stage.width - this.radius * 2);
    this.y = stage.height + this.radius;
    // Pixels par seconde. Les petits ballons montent plus vite : ils sont
    // plus difficiles à attraper, et valent plus de points.
    this.speed = (115 + Math.random() * 95) * (44 / this.radius);
    this.drift = (Math.random() - 0.5) * 0.03;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.phase = Math.random() * Math.PI * 2;
    this.popped = 0;
  }

  get points() { return Math.max(1, Math.round(60 / this.radius * 3)); }

  update(dt, stage) {
    if (this.popped > 0) {
      this.popped += dt;
      return;
    }
    this.y -= this.speed * (dt / 1000);
    this.phase += dt * 0.003;
    this.x += Math.sin(this.phase) * this.drift * dt;
    this.x = Math.max(this.radius, Math.min(stage.width - this.radius, this.x));
  }

  get gone() {
    return this.popped > 260 || this.y < -this.radius * 2;
  }

  hit(x, y) {
    if (this.popped > 0) return false;
    const dx = x - this.x;
    const dy = y - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  draw(ctx) {
    if (this.popped > 0) {
      // Éclatement : anneau qui s'ouvre et s'efface.
      const t = this.popped / 260;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 5 * (1 - t);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * (1 + t * 0.9), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.radius * 0.86, this.radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(
      this.x - this.radius * 0.28, this.y - this.radius * 0.34,
      this.radius * 0.2, this.radius * 0.3, -0.5, 0, Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius);
    ctx.quadraticCurveTo(
      this.x + 8, this.y + this.radius + 18,
      this.x, this.y + this.radius + 32,
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export default class BalloonPop extends Screen {
  constructor(app) {
    super(app);
    this.balloons = [];
    this.score = 0;
    this.remaining = DURATION_MS;
    this._spawnIn = 0;
  }

  async enter() {
    this.balloons = [];
    this.score = 0;
    this.remaining = DURATION_MS;
    this._spawnIn = 0;
  }

  update(dt) {
    const stage = this.app.stage;
    const pointer = this.app.pointer;

    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.finish(this.score);
      return;
    }

    this._spawnIn -= dt;
    if (this._spawnIn <= 0) {
      this.balloons.push(new Balloon(stage));
      // La cadence s'accélère au fil de la partie.
      const progress = 1 - this.remaining / DURATION_MS;
      this._spawnIn = SPAWN_INTERVAL_MS * (1 - progress * 0.55);
    }

    for (const balloon of this.balloons) balloon.update(dt, stage);

    // Le survol suffit à éclater : demander un pincement sur une cible
    // mouvante serait injouable. Le pincement reste accepté.
    if (pointer.visible) {
      for (const balloon of this.balloons) {
        if (balloon.hit(pointer.x, pointer.y)) {
          balloon.popped = 1;
          this.score += balloon.points;
        }
      }
    }

    this.balloons = this.balloons.filter((balloon) => !balloon.gone);
  }

  draw(ui) {
    const stage = this.app.stage;
    const ctx = ui.ctx;

    for (const balloon of this.balloons) balloon.draw(ctx);

    ui.text(`${this.score}`, 30, 34, {
      size: Math.max(26, stage.unit * 0.055),
      color: THEME.neon,
      align: 'left',
      baseline: 'top',
      weight: 700,
    });
    ui.text('points', 32, 34 + Math.max(26, stage.unit * 0.055), {
      size: Math.max(11, stage.unit * 0.018),
      align: 'left',
      baseline: 'top',
    });

    // Jauge de temps, centrée en haut.
    const barW = Math.min(stage.width * 0.4, 420);
    const x = stage.width / 2 - barW / 2;
    const ratio = Math.max(0, this.remaining / DURATION_MS);

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x, 28, barW, 6);
    ctx.fillStyle = ratio < 0.2 ? THEME.danger : THEME.neon;
    ctx.fillRect(x, 28, barW * ratio, 6);
    ctx.restore();
  }

  exit() {
    this.balloons = [];
  }
}
