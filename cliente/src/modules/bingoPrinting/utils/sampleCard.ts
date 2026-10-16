import type { RangeCard } from "../services/getBingoCardsByRange.service";

export const buildSampleCard = (id = 1000): RangeCard => {
  const ranges: [number, number][] = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];
  const card = ranges.map(([start, end], colIndex) => {
    const values: number[] = [];
    while (values.length < 5) {
      const value = Math.floor(Math.random() * (end - start + 1)) + start;
      if (!values.includes(value)) values.push(value);
    }
    if (colIndex === 2) values[2] = id;
    return values;
  });
  return { id, card };
};
