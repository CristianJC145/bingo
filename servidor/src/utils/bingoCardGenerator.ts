// server/src/utils/bingoCardGenerator.ts
import { BingoCard } from '../models/BingoCard';

const generateBingoCard = (id: number): BingoCard => {
  const card: number[][] = [];
  const columnRanges = [
    { start: 1, end: 15 },
    { start: 16, end: 30 },
    { start: 31, end: 45 },
    { start: 46, end: 60 },
    { start: 61, end: 75 },
  ];

  for (let col = 0; col < 5; col++) {
    const column: number[] = [];
    while (column.length < 5) {
      const num = Math.floor(Math.random() * (columnRanges[col].end - columnRanges[col].start + 1)) + columnRanges[col].start;
      if (!column.includes(num)) {
        column.push(num);
      }
    }
    card.push(column);
  }

  // Poner el ID en el lugar central
  card[2][2] = id;

  return { id, card };
};

export default generateBingoCard;
