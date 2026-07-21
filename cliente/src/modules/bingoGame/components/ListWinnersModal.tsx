import styled from "styled-components";
import AppModal from "../../../shared/components/AppModal";
import BingoTable from "./BingoTable";
import { useState } from "react";

interface Card {
  id: number;
  pattern: number[][];
  patternFigure: boolean[][];
}

interface ListWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Card[];
  drawNumbers: number[];
}
const ListWinnerModal: React.FC<ListWinnerModalProps> = ({
  isOpen,
  onClose,
  winner,
  drawNumbers,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Card[] = winner.map((win: any) => ({
    ...win,
    pattern: JSON.parse(win.pattern),
    patternFigure: win.patternFigure,
  }));
  const [currentWinner, setCurrentWinner] = useState<Card>(
    data.length > 0
      ? data[0]
      : { id: -1, pattern: Array(5).fill(Array(5).fill(0)), patternFigure: Array(5).fill(Array(5).fill(false)) }
  );
  const handlePatternWinner = (winner: Card) => {
    setCurrentWinner(winner);
  };

  return (
    <ListWinnerModalStyle>
      <AppModal size="md" title="Lista de Ganadores" isOpen={isOpen} onClose={onClose}>
        <div className="d-flex flex-row gap-3">
          <div className="section-numbers">
            {data.map((win) => (
              <div
                className={`number-winners ${currentWinner.id === win.id ? "selected" : ""}`}
                key={win.id}
                onClick={() => handlePatternWinner(win)}
              >
                <span>{win.id}</span>
              </div>
            ))}
          </div>
          <BingoTable patternFigure={currentWinner.patternFigure} pattern={currentWinner.pattern} drawnNumbers={drawNumbers}></BingoTable>
        </div>
      </AppModal>
    </ListWinnerModalStyle>
  );
};
export default ListWinnerModal;

const ListWinnerModalStyle = styled.div`
  .section-numbers {
    display: flex;
    flex-direction: column;
    gap: .5rem;
    height: 325px;
    width: 150px;
    overflow-y: auto;
  }
  .number-winners {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 90%;
    padding: var(--p-2);
    background-color: #15143c;
    border-radius: 8px;
    color: var(--color-light);;
    margin-right: .5rem;
    cursor: pointer;
    opacity: .3;
  }
  .number-winners:hover {
    background-color: #15143c;
  }
  .number-winners.selected {
    opacity: 1;
  }
  .section-numbers::-webkit-scrollbar {
    width: 7px;
  }
  .section-numbers::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
  }
  .section-numbers::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #9a98d1;
  }
`;
