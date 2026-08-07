/* Menu principal.
 *
 * Construit ses tuiles à partir du registre : ajouter un jeu au catalogue
 * suffit à le faire apparaître ici, sans toucher à cet écran.
 *
 * La grille est calculée à chaque image plutôt que mise en cache. C'est
 * quelques dizaines d'opérations arithmétiques, largement sous le budget
 * d'une image, et ça règle gratuitement le redimensionnement, la rotation
 * de l'écran et l'arrivée d'un nouveau jeu.
 */

import { Screen } from '../core/Screen.js';
import { THEME } from '../ui/UI.js';
import { GAMES } from '../core/GameRegistry.js';
import { CAMERA_MODE } from '../ui/CameraView.js';

const PHOTO_TILE = {
  id: '__photo',
  title: 'Photobooth',
  tagline: 'Prends la pose, on imprime',
  badge: 'photo',
};

export class MenuScreen extends Screen {
  constructor(app) {
    super(app);
    this.notice = '';
    this._noticeUntil = 0;
    this._time = 0;
  }

  async enter(params = {}) {
    this.app.cameraView.setMode(
      this.app.handTrackingReady ? CAMERA_MODE.VIGNETTE : CAMERA_MODE.HIDDEN,
    );
    if (params.error) {
      this.notice = params.error;
      this._noticeUntil = performance.now() + 6000;
    }
  }

  update(dt) {
    this._time += dt;
    if (this.notice && performance.now() > this._noticeUntil) this.notice = '';
  }

  /** Grille responsive : 3 colonnes en large, 2 en étroit, 1 en très étroit. */
  _layout(stage, count) {
    const maxColumns = stage.width < 620 ? 1 : stage.width < 1080 ? 2 : 3;
    // Avec deux jeux au catalogue, trois colonnes laisseraient un trou à
    // droite : on ne prend jamais plus de colonnes que de tuiles.
    const columns = Math.max(1, Math.min(maxColumns, count));
    const rows = Math.ceil(count / columns);

    const marginX = stage.width * 0.07;
    const top = stage.height * 0.26;
    const bottom = stage.height * 0.92;
    const gap = Math.max(14, stage.unit * 0.028);

    const usableWidth = stage.width - marginX * 2;
    const usableHeight = bottom - top;

    const w = (usableWidth - gap * (columns - 1)) / columns;
    // Trois plafonds : la place disponible, le ratio de la tuile, et une
    // hauteur absolue — sans ce dernier, deux jeux donnent deux pavés
    // démesurés qui n'ont plus l'air cliquables.
    const h = Math.min(
      (usableHeight - gap * (rows - 1)) / rows,
      w * 0.58,
      stage.height * 0.34,
    );

    // La grille est centrée dans la bande utile, horizontalement et
    // verticalement : le menu reste équilibré de 2 à 12 jeux.
    const gridHeight = rows * h + gap * (rows - 1);
    const originY = top + (usableHeight - gridHeight) / 2;

    return { columns, rows, gap, w, h, originY, marginX };
  }

  /** Position d'une tuile, dernière rangée incomplète recentrée. */
  _tileRect(grid, index, count, stage) {
    const row = Math.floor(index / grid.columns);
    const col = index % grid.columns;
    const inRow = Math.min(grid.columns, count - row * grid.columns);
    const rowWidth = inRow * grid.w + grid.gap * (inRow - 1);
    const originX = (stage.width - rowWidth) / 2;

    return {
      x: originX + col * (grid.w + grid.gap),
      y: grid.originY + row * (grid.h + grid.gap),
      w: grid.w,
      h: grid.h,
    };
  }

  draw(ui) {
    const stage = this.app.stage;
    const tiles = [...GAMES, PHOTO_TILE];
    const grid = this._layout(stage, tiles.length);

    ui.title('JARVIS ARCADE', stage.width / 2, stage.height * 0.13,
      Math.max(26, Math.min(stage.unit * 0.075, 58)));

    const hint = this.app.handTrackingReady
      ? 'Pointe avec l\'index — pince pour valider'
      : 'Suivi de main indisponible : utilise la souris';
    ui.text(hint, stage.width / 2, stage.height * 0.195, {
      size: Math.max(12, stage.unit * 0.021),
      color: this.app.handTrackingReady ? THEME.muted : THEME.danger,
    });

    tiles.forEach((tile, index) => {
      const rect = this._tileRect(grid, index, tiles.length, stage);
      const blocked = tile.needsHand && !this.app.handTrackingReady;

      if (ui.button(`tile-${tile.id}`, rect, {
        label: tile.title,
        sublabel: blocked ? 'nécessite la caméra' : tile.tagline,
        disabled: blocked,
        fontSize: Math.max(15, Math.min(grid.h * 0.24, 30)),
        radius: 20,
      })) {
        if (tile.id === PHOTO_TILE.id) this.app.go('photobooth');
        else this.app.go('game', { gameId: tile.id });
      }

      if (tile.badge) this._drawBadge(ui, rect, tile.badge);
    });

    if (this.notice) {
      ui.text(this.notice, stage.width / 2, stage.height * 0.95, {
        size: Math.max(12, stage.unit * 0.02),
        color: THEME.danger,
      });
    }
  }

  _drawBadge(ui, rect, label) {
    const ctx = ui.ctx;
    const size = Math.max(9, Math.min(rect.h * 0.09, 13));
    ctx.save();
    ctx.font = `700 ${size}px ${THEME.font}`;
    const padding = size * 0.7;
    const width = ctx.measureText(label.toUpperCase()).width + padding * 2;
    const height = size * 2;
    const x = rect.x + rect.w - width - size * 0.9;
    const y = rect.y + size * 0.9;

    ctx.fillStyle = THEME.neonSoft;
    ctx.strokeStyle = THEME.neonEdge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, width, height, height / 2);
    else ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = THEME.neon;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.toUpperCase(), x + width / 2, y + height / 2);
    ctx.restore();
  }
}
