import { useMemo } from "react";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";

interface BingoTableProps {
  pattern: number[][];
  drawnNumbers: number[];
  patternFigure: boolean[][];
  cardId?: number;
}

const transposePattern = <T,>(pattern: T[][]): T[][] =>
  pattern[0]?.map((_, columnIndex) => pattern.map((row) => row[columnIndex])) ?? [];

const BingoTable: React.FC<BingoTableProps> = ({ pattern, patternFigure, drawnNumbers, cardId }) => {
  const rows = useMemo(() => transposePattern(pattern), [pattern]);
  const winningCells = useMemo(
    () => rows.map((row, rowIndex) => row.map((number, columnIndex) =>
      rowIndex === 2 && columnIndex === 2 || Boolean(number && drawnNumbers.includes(number) && patternFigure[rowIndex]?.[columnIndex])
    )),
    [drawnNumbers, patternFigure, rows]
  );

  return <BingoCardVisual values={rows} selected={winningCells} cardId={cardId} label="Cartón ganador" />;
};

export default BingoTable;
