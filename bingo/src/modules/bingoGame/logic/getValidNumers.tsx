import { Figure } from "../dtos/checkWinnerDto";

const getValidNumbers = (selectedFigures: Figure[]): number[] => {
  const letters = ["B", "I", "N", "G", "O"] as const;
  const letterRanges: Record<(typeof letters)[number], [number, number]> = {
    B: [1, 15],
    I: [16, 30],
    N: [31, 45],
    G: [46, 60],
    O: [61, 75],
  };

  const usedColumns = new Set<number>();
  selectedFigures.forEach((figure) => {
    figure.pattern.forEach((row) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          usedColumns.add(colIndex);
        }
      });
    });
  });

  const validNumbers: number[] = [];
  usedColumns.forEach((colIndex) => {
    const letter = letters[colIndex];
    const [min, max] = letterRanges[letter];
    for (let i = min; i <= max; i++) {
      validNumbers.push(i);
    }
  });

  return validNumbers;
};

export { getValidNumbers };
