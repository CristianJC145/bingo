import { Workbook } from "exceljs";

export interface ParsedBingoCard { id: number; card: number[][]; }
export interface ParseResult { cards: ParsedBingoCard[]; errors: string[]; }

// Cada fila del Excel: [B1..B5, I1..I5, N1..N5, G1..G5, O1..O5] (25 columnas, sin encabezado).
// El número de cartón va en la celda libre N3 (columna 13), igual que en la base de datos.
const COLUMN_RANGES = [
  { letter: "B", start: 1, end: 15 },
  { letter: "I", start: 16, end: 30 },
  { letter: "N", start: 31, end: 45 },
  { letter: "G", start: 46, end: 60 },
  { letter: "O", start: 61, end: 75 },
];

export const parseBingoCardsExcel = async (file: File): Promise<ParseResult> => {
  const workbook = new Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  const cards: ParsedBingoCard[] = [];
  const errors: string[] = [];
  const seenIds = new Set<number>();

  worksheet.eachRow((row, rowNumber) => {
    const cellValues = Array.from({ length: 25 }, (_, index) => row.getCell(index + 1).value);
    const id = Number(cellValues[12]); // N3 = celda libre = número de cartón

    if (rowNumber === 1 && !Number.isInteger(id)) return; // fila de encabezado, si existe

    if (!Number.isInteger(id) || id <= 0) {
      errors.push(`Fila ${rowNumber}: número de cartón inválido en la celda libre (N3).`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(`Fila ${rowNumber}: el cartón #${id} está repetido en el archivo, se omite.`);
      return;
    }

    const card: number[][] = [];
    let rowIsValid = true;
    for (let groupIndex = 0; groupIndex < 5; groupIndex++) {
      const group = cellValues.slice(groupIndex * 5, groupIndex * 5 + 5).map(Number);
      const { start, end, letter } = COLUMN_RANGES[groupIndex];
      group.forEach((value, position) => {
        const isFreeCell = groupIndex === 2 && position === 2;
        if (isFreeCell) return;
        if (!Number.isInteger(value) || value < start || value > end) {
          errors.push(`Fila ${rowNumber}: valor "${value}" fuera de rango para la columna ${letter} (cartón #${id}).`);
          rowIsValid = false;
        }
      });
      card.push(group);
    }

    if (!rowIsValid) return;

    card[2][2] = id;
    seenIds.add(id);
    cards.push({ id, card });
  });

  return { cards, errors };
};
