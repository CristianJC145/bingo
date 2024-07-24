import { useEffect, useState } from "react";
import styled from "styled-components";

interface BingoTableProps {
  pattern: number[][];
  drawnNumbers: number[];
  patternFigure: boolean[][];
}

const BingoTable: React.FC<BingoTableProps> = ({ pattern, patternFigure, drawnNumbers }) => {
  const [patternWinner, setPatternWinner] = useState<number[][]>(pattern);

  const transposePattern = (pattern: number[][]): number[][] => {
    const transposed: number[][] = pattern[0].map((_, colIndex) =>
      pattern.map((row) => row[colIndex])
    );
    return transposed;
  };

  useEffect(() => {
    const transposedPattern = transposePattern(pattern);
    setPatternWinner(transposedPattern);
  }, [pattern]);
  
  const isDrawn = (number: number) => drawnNumbers.includes(number);

  return (
    <BingoTableStlye>
      <div className="table-content">
        {patternWinner.map((row: number[], rowIndex: number) =>
          row.map((cell: number, cellIndex: number) => (
            <div
              key={`${rowIndex}-${cellIndex}`}
              className={`${
                rowIndex === 2 && cellIndex === 2
                  ? "free"
                  : cell && isDrawn(cell) && patternFigure[rowIndex][cellIndex]
                  ? "cell filled"
                  : "cell"
              }`}
            >
              {rowIndex === 2 && cellIndex === 2 ? (
                <span>FREE</span>
              ) : cell ? (
                cell
              ) : (
                ""
              )}
            </div>
          ))
        )}
      </div>
    </BingoTableStlye>
  );
};
export default BingoTable;

const BingoTableStlye = styled.div`
  .table-content {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    border-radius: 12px;
    box-shadow: 0 -1px 8px 3px rgb(99, 96, 255);
    padding: var(--p-3);
  }
  .free {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: .875rem;
  }
  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #27284a;
    color: rgba(var(--color-body-rgb), .7);
    border-radius: 8px;
    width: 55px;
    height: 55px;
    margin: 0.2rem;
    font-weight: 700;
    font-size: 1.125rem;
    border: 1px dashed rgba(var(--color-body-rgb), .5);
  }
  .cell.filled {
    background: linear-gradient(110deg, rgba(96, 86, 238, 1) 0%, rgba(135, 123, 255, 1) 100%);
    border: unset;
  }
  .cell svg {
    font-size: 12px;
  }
`;
