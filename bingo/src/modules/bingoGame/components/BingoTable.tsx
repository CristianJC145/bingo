import { useEffect, useState } from "react";
import styled from "styled-components";

interface BingoTableProps {
  pattern: number[][];
}

const BingoTable: React.FC<BingoTableProps> = ({ pattern }) => {
  const [patternWinner, setPatternWinner] = useState<number[][]>(pattern);

  const transposePatter = (pattern: number[][]): number[][] => {
    const transposed: number[][] = pattern[0].map((_, colIndex) =>
      pattern.map((row) => row[colIndex])
    );
    return transposed;
  };

  useEffect(() => {
    console.log("patron ue recibe:", pattern);
    const transposedPattern = transposePatter(pattern);
    setPatternWinner(transposedPattern);
  }, [pattern]);

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
                  : cell
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
  }
  .free {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 9px;
  }
  .cell {
    background-color: var(--color-body);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 50px;
    height: 50px;
    margin: 0.1rem;
  }
  .cell.filled {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    border: 1px dashed rgba(var(--color-body-rgb), 1);
  }
  .cell svg {
    font-size: 12px;
  }
`;
