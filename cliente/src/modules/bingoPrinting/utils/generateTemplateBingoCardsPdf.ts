import { jsPDF } from "jspdf";
import type { RangeCard } from "../services/getBingoCardsByRange.service";
import type { PrintTemplate } from "../types/printTemplate.types";
import { services } from "../../../shared/constant/services";
import { Box, bestFigureGrid, FIGURE_GAP, FIGURE_LABEL_HEIGHT, sheetLayout } from "./printSheetLayout";
import poppinsBoldUrl from "../../../assets/fonts/Poppins-Bold.ttf";
import poppinsRegularUrl from "../../../assets/fonts/Poppins-Regular.ttf";

/** Ancho de referencia del cartón: sobre él se escalan los tamaños de letra de la plantilla. */
const BASE_CARD_WIDTH = 94.95;

/**
 * La hoja carta medida en puntos PDF. El objeto de formulario declara su caja en
 * puntos aunque el documento trabaje en milímetros; con estas medidas las
 * coordenadas dentro del formulario coinciden exactamente con las de la página.
 */
const PAGE_WIDTH_PT = 612;
const PAGE_HEIGHT_PT = 792;
/** Clave del bloque reutilizable que contiene todo lo que se repite igual en cada hoja. */
const STATIC_SHEET_KEY = "asodifiSheet";

/** Resolución máxima al incrustar: más píxeles no mejoran la impresión y sí engordan el PDF. */
const MAX_TEMPLATE_PIXELS = 1600;
/** Rótulo por omisión del bloque de patrocinadores. */
export const DEFAULT_SPONSORS_TITLE = "Patrocinadores";
/** Cada cuántas hojas se cede el hilo para que la interfaz siga respondiendo. */
const YIELD_EVERY_PAGES = 40;

export interface PrintFigure { id: number; name: string; pattern: boolean[][]; }
export interface PrintSponsor { id: string; name: string; url: string; }

export interface PrintSheetOptions {
  /** Nombres de los patrocinadores, en el orden en que deben imprimirse. */
  sponsorNames?: string[];
  /** Rótulo del bloque; por omisión "Patrocinadores". */
  sponsorsTitle?: string;
  /** Logos configurados en Personalización. Los nombres manuales siguen siendo respaldo. */
  sponsors?: PrintSponsor[];
  figures?: PrintFigure[];
  /** Avisa del avance para poder mostrarlo mientras se arma el documento. */
  onProgress?: (done: number, total: number) => void;
}

interface LoadedImage { dataUrl: string; format: string; aspect: number; }

let cachedFonts: Record<string, string> | null = null;
let cachedTemplateImage: { url: string; image: LoadedImage } | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return window.btoa(binary);
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const loadHtmlImage = (dataUrl: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });

/**
 * Reduce la imagen a la resolución que la impresión realmente aprovecha. Un logo de
 * 3000 px ocupa lo mismo en el PDF que en disco aunque se imprima a 85 mm, y ese peso
 * se paga una vez por documento tanto en tamaño como en tiempo de compresión.
 */
const fitImageForPrint = async (
  dataUrl: string,
  maxPixels: number,
  output: "PNG" | "JPEG"
): Promise<{ dataUrl: string; format: string; aspect: number }> => {
  const image = await loadHtmlImage(dataUrl);
  if (!image) return { dataUrl, format: output, aspect: 1 };

  const aspect = image.naturalWidth / image.naturalHeight || 1;
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (longestSide <= maxPixels) return { dataUrl, format: output, aspect };

  const scale = maxPixels / longestSide;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return { dataUrl, format: output, aspect };

  // Fondo blanco: el papel lo es, y el JPEG no conserva transparencia.
  if (output === "JPEG") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const resized = output === "JPEG" ? canvas.toDataURL("image/jpeg", 0.86) : canvas.toDataURL("image/png");
  return { dataUrl: resized, format: output, aspect };
};

const loadFonts = async (): Promise<Record<string, string>> => {
  if (cachedFonts) return cachedFonts;
  const [bold, regular] = await Promise.all(
    [poppinsBoldUrl, poppinsRegularUrl].map((url) => fetch(url).then((response) => response.arrayBuffer()))
  );
  cachedFonts = { bold: arrayBufferToBase64(bold), regular: arrayBufferToBase64(regular) };
  return cachedFonts;
};

const registerFonts = async (doc: jsPDF): Promise<void> => {
  const fonts = await loadFonts();
  doc.addFileToVFS("Poppins-Bold.ttf", fonts.bold);
  doc.addFont("Poppins-Bold.ttf", "PoppinsBold", "normal");
  doc.addFileToVFS("Poppins-Regular.ttf", fonts.regular);
  doc.addFont("Poppins-Regular.ttf", "PoppinsRegular", "normal");
};

const loadTemplateImage = async (template: PrintTemplate): Promise<LoadedImage> => {
  const absoluteUrl = `${services.api_url}${template.url}`;
  if (cachedTemplateImage?.url === absoluteUrl) return cachedTemplateImage.image;
  const blob = await fetch(absoluteUrl).then((response) => response.blob());
  const original = await blobToDataUrl(blob);
  // La plantilla es dibujo y texto: conservar PNG evita halos alrededor de los trazos.
  const image = await fitImageForPrint(original, MAX_TEMPLATE_PIXELS, "PNG");
  cachedTemplateImage = { url: absoluteUrl, image };
  return image;
};

const loadSponsorImages = async (sponsors: PrintSponsor[]): Promise<Array<PrintSponsor & { image?: LoadedImage }>> =>
  Promise.all(sponsors.map(async (sponsor) => {
    try {
      const blob = await fetch(sponsor.url).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      });
      const original = await blobToDataUrl(blob);
      return { ...sponsor, image: await fitImageForPrint(original, 520, "PNG") };
    } catch (error) {
      console.warn(`No se pudo cargar el logo de ${sponsor.name}:`, error);
      return sponsor;
    }
  }));

const drawPanelFrame = (doc: jsPDF, box: Box) => {
  doc.setFillColor(250, 249, 255);
  doc.setDrawColor(205, 197, 231);
  doc.setLineWidth(0.45);
  doc.roundedRect(box.x, box.y, box.w, box.h, 3.2, 3.2, "FD");
  doc.setDrawColor(116, 79, 191);
  doc.setLineWidth(1.1);
  doc.line(box.x + 5, box.y + 1.2, box.x + box.w - 5, box.y + 1.2);
};

/** Título de sección: texto centrado en versalitas entre dos filetes. */
const drawSectionTitle = (doc: jsPDF, box: Box, text: string): number => {
  const centerX = box.x + box.w / 2;
  const baseline = box.y + 8;
  doc.setFont("PoppinsBold", "normal");
  doc.setFontSize(10);
  doc.setTextColor(72, 42, 126);
  doc.text(text, centerX, baseline, { align: "center", charSpace: 0.6 });

  const textWidth = doc.getTextWidth(text) + 8;
  const ruleY = baseline - 1.4;
  doc.setDrawColor(224, 181, 66);
  doc.setLineWidth(0.35);
  doc.line(box.x + 5, ruleY, centerX - textWidth / 2, ruleY);
  doc.line(centerX + textWidth / 2, ruleY, box.x + box.w - 5, ruleY);

  return baseline + 4;
};

/** Panel visual de patrocinadores: usa logos y conserva nombres como respaldo. */
const drawSponsorsPanel = (
  doc: jsPDF,
  box: Box,
  names: string[],
  title: string,
  sponsors: Array<PrintSponsor & { image?: LoadedImage }>
) => {
  drawPanelFrame(doc, box);
  const contentTop = drawSectionTitle(doc, box, title.toUpperCase());
  const padding = 5;
  const availableW = box.w - padding * 2;
  const availableH = box.y + box.h - contentTop - padding;
  const logoNames = new Set(sponsors.map((sponsor) => sponsor.name.trim().toLocaleLowerCase()));
  const entries: Array<{ name: string; image?: LoadedImage }> = [
    ...sponsors.map(({ name, image }) => ({ name, image })),
    ...names
      .filter((name) => name.trim() && !logoNames.has(name.trim().toLocaleLowerCase()))
      .map((name) => ({ name: name.trim() })),
  ].slice(0, 8);

  if (entries.length === 0) {
    doc.setFont("PoppinsRegular", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 153, 164);
    doc.text("Espacio disponible", box.x + box.w / 2, contentTop + availableH / 2, { align: "center" });
    return;
  }

  const columns = entries.length === 1 ? 1 : 2;
  const rows = Math.ceil(entries.length / columns);
  const gap = 3;
  const slotW = (availableW - gap * (columns - 1)) / columns;
  const slotH = (availableH - gap * (rows - 1)) / rows;

  entries.forEach((entry, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const slotX = box.x + padding + column * (slotW + gap);
    const slotY = contentTop + row * (slotH + gap);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(230, 225, 241);
    doc.setLineWidth(0.25);
    doc.roundedRect(slotX, slotY, slotW, slotH, 2, 2, "FD");

    if (entry.image) {
      const labelH = Math.min(6.5, slotH * 0.24);
      const imageW = slotW - 5;
      const imageH = slotH - labelH - 3.5;
      const targetAspect = imageW / Math.max(imageH, 1);
      const drawW = entry.image.aspect > targetAspect ? imageW : imageH * entry.image.aspect;
      const drawH = entry.image.aspect > targetAspect ? imageW / entry.image.aspect : imageH;
      doc.addImage(entry.image.dataUrl, entry.image.format, slotX + (slotW - drawW) / 2, slotY + 1.5 + (imageH - drawH) / 2, drawW, drawH);
      doc.setFont("PoppinsBold", "normal");
      doc.setFontSize(Math.max(5, Math.min(7, labelH * 1.1)));
      doc.setTextColor(65, 55, 81);
      const label = (doc.splitTextToSize(entry.name, slotW - 4) as string[])[0];
      doc.text(label, slotX + slotW / 2, slotY + slotH - 2.1, { align: "center" });
    } else {
      doc.setFont("PoppinsBold", "normal");
      doc.setFontSize(Math.max(7, Math.min(12, slotH * 0.5)));
      doc.setTextColor(65, 55, 81);
      const lines = (doc.splitTextToSize(entry.name, slotW - 5) as string[]).slice(0, 2);
      const lineHeight = 4.2;
      const firstY = slotY + slotH / 2 - ((lines.length - 1) * lineHeight) / 2 + 1.2;
      lines.forEach((line, lineIndex) => doc.text(line, slotX + slotW / 2, firstY + lineIndex * lineHeight, { align: "center" }));
    }
  });
};

/** Cuadrícula 5×5 de una figura: casillas llenas en morado y centro libre marcado. */
const drawFigureGrid = (doc: jsPDF, x: number, y: number, size: number, pattern: boolean[][]) => {
  const gap = size * 0.035;
  const cell = (size - gap * 4) / 5;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cellX = x + col * (cell + gap);
      const cellY = y + row * (cell + gap);
      const isFree = row === 2 && col === 2;
      const isActive = Boolean(pattern?.[row]?.[col]);

      if (isFree) {
        doc.setFillColor(252, 244, 222);
        doc.setDrawColor(226, 189, 108);
      } else if (isActive) {
        doc.setFillColor(113, 76, 190);
        doc.setDrawColor(92, 58, 158);
      } else {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(206, 209, 218);
      }
      doc.setLineWidth(0.22);
      doc.roundedRect(cellX, cellY, cell, cell, cell * 0.16, cell * 0.16, "FD");

      if (isFree) {
        doc.setFont("PoppinsBold", "normal");
        doc.setFontSize(Math.max(4, cell * 1.6));
        doc.setTextColor(198, 152, 46);
        doc.text("★", cellX + cell / 2, cellY + cell / 2 + cell * 0.22, { align: "center" });
      }
    }
  }
};

const drawFiguresPanel = (doc: jsPDF, box: Box, figures: PrintFigure[]) => {
  drawPanelFrame(doc, box);
  const contentTop = drawSectionTitle(doc, box, "FIGURAS EN JUEGO");
  const padding = 6;
  const availableW = box.w - padding * 2;
  const availableH = box.y + box.h - contentTop - padding;

  if (figures.length === 0) {
    doc.setFont("PoppinsRegular", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(150, 153, 164);
    doc.text("Selecciona las figuras que se jugarán en esta ronda.", box.x + box.w / 2, contentTop + availableH / 2, { align: "center" });
    return;
  }

  const { columns, size, gridW, gridH } = bestFigureGrid(figures.length, availableW, availableH);
  const blockH = size + FIGURE_LABEL_HEIGHT;
  const startX = box.x + (box.w - gridW) / 2;
  const startY = contentTop + Math.max(0, (availableH - gridH) / 2);

  figures.forEach((figure, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    // La última fila se centra cuando no queda completa.
    const inRow = Math.min(columns, figures.length - row * columns);
    const rowOffset = ((columns - inRow) * (size + FIGURE_GAP)) / 2;
    const x = startX + rowOffset + column * (size + FIGURE_GAP);
    const y = startY + row * (blockH + FIGURE_GAP);

    drawFigureGrid(doc, x, y, size, figure.pattern);

    doc.setFont("PoppinsBold", "normal");
    doc.setFontSize(Math.min(7, Math.max(5, size * 0.12)));
    doc.setTextColor(116, 79, 191);
    const ordinalLabels = ["PRIMERA FIGURA:", "SEGUNDA FIGURA:", "TERCERA FIGURA:", "CUARTA FIGURA:", "QUINTA FIGURA:", "SEXTA FIGURA:", "SÉPTIMA FIGURA:", "OCTAVA FIGURA:"];
    doc.text(ordinalLabels[index] ?? `FIGURA ${index + 1}:`, x + size / 2, y + size + 3.6, { align: "center", charSpace: 0.2 });

    doc.setFont("PoppinsBold", "normal");
    doc.setFontSize(Math.min(9, Math.max(6, size * 0.15)));
    doc.setTextColor(51, 43, 66);
    const name = doc.splitTextToSize(figure.name, size + 6)[0];
    doc.text(name, x + size / 2, y + size + 7.6, { align: "center" });
  });
};

/** Hueco que ocupa la plantilla dentro de su bloque, conservando su proporción. */
const templateFrame = (box: Box, template: PrintTemplate) => {
  const imageAspect = template.width / template.height;
  const boxAspect = box.w / box.h;
  const imgW = imageAspect > boxAspect ? box.w : box.h * imageAspect;
  const imgH = imageAspect > boxAspect ? box.w / imageAspect : box.h;
  return {
    imgX: box.x + (box.w - imgW) / 2,
    imgY: box.y + (box.h - imgH) / 2,
    imgW,
    imgH,
  };
};

/** La imagen de la plantilla es idéntica en todas las hojas. */
const drawCardTemplate = (doc: jsPDF, box: Box, template: PrintTemplate, image: LoadedImage) => {
  const { imgX, imgY, imgW, imgH } = templateFrame(box, template);
  doc.addImage(image.dataUrl, image.format, imgX, imgY, imgW, imgH);
};

/** Lo único propio de cada cartón: los campos y la cuadrícula de números. */
const drawCardOverlay = (
  doc: jsPDF,
  box: Box,
  template: PrintTemplate,
  card: RangeCard,
  values: Record<string, string>
) => {
  const { imgX, imgY, imgW, imgH } = templateFrame(box, template);
  const scale = imgW / BASE_CARD_WIDTH;

  template.config.fields.forEach((field) => {
    const value = field.source === "cardNumber" ? `N° ${String(card.id).padStart(4, "0")}` : values[field.id];
    if (!value) return;
    doc.setFont(field.source === "cardNumber" ? "PoppinsBold" : "PoppinsRegular", "normal");
    doc.setFontSize(field.fontSize * scale);
    doc.setTextColor(field.color === "light" ? 255 : 20, field.color === "light" ? 255 : 20, field.color === "light" ? 255 : 24);
    doc.text(value, imgX + (field.xPct / 100) * imgW, imgY + (field.yPct / 100) * imgH, { align: field.align });
  });

  const grid = template.config.numberGrid;
  const gridX = imgX + (grid.xPct / 100) * imgW;
  const gridY = imgY + (grid.yPct / 100) * imgH;
  const gridW = (grid.widthPct / 100) * imgW;
  const gridH = (grid.heightPct / 100) * imgH;
  const gapMm = (grid.gapPct / 100) * imgW;
  const cellW = (gridW - gapMm * 4) / 5;
  const cellH = (gridH - gapMm * 4) / 5;

  doc.setFont("PoppinsBold", "normal");
  doc.setFontSize(grid.fontSize * scale);
  doc.setTextColor(20, 20, 24);

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) continue; // la casilla libre ya viene diseñada en la plantilla
      const cellX = gridX + col * (cellW + gapMm);
      const cellY = gridY + row * (cellH + gapMm);
      doc.text(String(card.card[col][row]), cellX + cellW / 2, cellY + cellH / 2 + grid.fontSize * scale * 0.32, { align: "center" });
    }
  }
};

/** Devuelve el control al navegador para que la interfaz siga respondiendo. */
const yieldToBrowser = () => new Promise<void>((resolve) => { window.setTimeout(resolve, 0); });

export const generateTemplateBingoCardsPdf = async (
  cards: RangeCard[],
  template: PrintTemplate,
  values: Record<string, string>,
  options: PrintSheetOptions = {}
): Promise<jsPDF> => {
  // `compress` reduce el documento en un orden de magnitud: sin él una tanda grande es inmanejable.
  const doc = new jsPDF({ unit: "mm", format: "letter", orientation: "portrait", compress: true });
  await registerFonts(doc);
  const templateImage = await loadTemplateImage(template);
  const sponsorNames = (options.sponsorNames ?? []).map((name) => name.trim()).filter(Boolean);
  const sponsorsTitle = options.sponsorsTitle?.trim() || DEFAULT_SPONSORS_TITLE;
  const sponsors = await loadSponsorImages(options.sponsors ?? []);
  const figures = options.figures ?? [];
  const layout = sheetLayout();

  /*
   * Patrocinadores, plantilla y figuras son idénticos en toda la tanda, así que se
   * dibujan una sola vez en un objeto de formulario y cada hoja solo lo referencia.
   * Repetirlos hoja a hoja costaba ~15 KB por página: con 5.000 cartones eran 79 MB
   * y casi un minuto de proceso, frente a ~3 MB y unos segundos por esta vía.
   */
  const identity = doc.unitMatrix;
  doc.beginFormObject(0, 0, PAGE_WIDTH_PT, PAGE_HEIGHT_PT, identity);
  drawSponsorsPanel(doc, layout.sponsors, sponsorNames, sponsorsTitle, sponsors);
  drawCardTemplate(doc, layout.card, template, templateImage);
  drawFiguresPanel(doc, layout.figures, figures);
  doc.endFormObject(STATIC_SHEET_KEY);

  for (let index = 0; index < cards.length; index++) {
    if (index > 0) doc.addPage();
    doc.doFormObject(STATIC_SHEET_KEY, identity);
    drawCardOverlay(doc, layout.card, template, cards[index], values);

    if ((index + 1) % YIELD_EVERY_PAGES === 0) {
      options.onProgress?.(index + 1, cards.length);
      await yieldToBrowser();
    }
  }

  options.onProgress?.(cards.length, cards.length);
  return doc;
};
