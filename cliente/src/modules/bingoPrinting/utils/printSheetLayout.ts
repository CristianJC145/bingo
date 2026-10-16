/**
 * Geometría de la hoja de impresión, en milímetros y sin dependencias del navegador.
 * Vive aparte del generador para poder razonarla (y probarla) de forma aislada.
 */

export const PAGE_WIDTH = 215.9;
export const PAGE_HEIGHT = 279.4;
export const OUTER_MARGIN = 10;
export const GUTTER = 6;

export interface Box { x: number; y: number; w: number; h: number; }

export interface SheetLayout {
  /** Bloque superior izquierdo. */
  sponsors: Box;
  /** Bloque superior derecho: la plantilla del cartón. */
  card: Box;
  /** Mitad inferior completa. */
  figures: Box;
}

export const sheetLayout = (): SheetLayout => {
  const contentW = PAGE_WIDTH - OUTER_MARGIN * 2;
  const contentH = PAGE_HEIGHT - OUTER_MARGIN * 2;
  const halfH = (contentH - GUTTER) / 2;
  const halfW = (contentW - GUTTER) / 2;
  return {
    sponsors: { x: OUTER_MARGIN, y: OUTER_MARGIN, w: halfW, h: halfH },
    card: { x: OUTER_MARGIN + halfW + GUTTER, y: OUTER_MARGIN, w: halfW, h: halfH },
    figures: { x: OUTER_MARGIN, y: OUTER_MARGIN + halfH + GUTTER, w: contentW, h: halfH },
  };
};

/** Separación entre figuras y alto reservado bajo cada una para su nombre. */
export const FIGURE_GAP = 5;
/** Dos líneas: orden de juego y nombre de la figura. */
export const FIGURE_LABEL_HEIGHT = 11;
export const MAX_FIGURE_COLUMNS = 6;

export interface FigureGrid { columns: number; rows: number; size: number; gridW: number; gridH: number; }

/**
 * Busca el reparto en columnas que permita dibujar la figura más grande posible
 * dentro del espacio disponible.
 */
export const bestFigureGrid = (count: number, availableW: number, availableH: number): FigureGrid => {
  let best: FigureGrid = { columns: 1, rows: count, size: 0, gridW: 0, gridH: 0 };

  for (let columns = 1; columns <= Math.min(count, MAX_FIGURE_COLUMNS); columns++) {
    const rows = Math.ceil(count / columns);
    const cellW = (availableW - (columns - 1) * FIGURE_GAP) / columns;
    const cellH = (availableH - (rows - 1) * FIGURE_GAP) / rows;
    const size = Math.min(cellW, cellH - FIGURE_LABEL_HEIGHT);
    if (size > best.size) {
      const blockH = size + FIGURE_LABEL_HEIGHT;
      best = {
        columns,
        rows,
        size,
        gridW: columns * size + (columns - 1) * FIGURE_GAP,
        gridH: rows * blockH + (rows - 1) * FIGURE_GAP,
      };
    }
  }

  return best;
};
