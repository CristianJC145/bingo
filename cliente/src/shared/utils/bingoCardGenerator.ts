// src/utils/bingoCardGenerator.ts
export interface BingoCard {
  id: number;
  card: number[][];
}

const generateBingoCard = (id: number): BingoCard => {
  const card: number[][] = [];

  for (let col = 0; col < 5; col++) {
    const colValues = Array.from({ length: 15 }, (_, i) => i + 1 + col * 15);
    colValues.sort(() => Math.random() - 0.5);
    card.push(colValues.slice(0, 5));
  }

  card[2][2] = id;

  return { id, card };
};

export default generateBingoCard;
