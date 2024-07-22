import styled from "styled-components";
import AppModal from "../../../shared/components/AppModal";
import BingoTable from "./BingoTable";
import { useEffect, useState } from "react";

interface Card {
  id: number;
  pattern: number[][];
}

interface ListWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Card[];
}
const ListWinnerModal: React.FC<ListWinnerModalProps> = ({
  isOpen,
  onClose,
  winner,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Card[] = winner.map((win: any) => ({
    ...win,
    pattern: JSON.parse(win.pattern),
  }));
  const [pattern, setPatternWinner] = useState<number[][]>( data.length > 0 ? data[0].pattern : Array(5).fill(Array(5).fill(0)));
  const [selectedId, setSelectedId] = useState<number>(data.length > 0 ? data[0].id : -1);

  const handlePatternWinner = (winner: number[][], winnerId: number) => {
    setPatternWinner(winner);
    setSelectedId(winnerId);
  };
  return (
    <ListWinnerModalStyle>
      <AppModal title="Lista de Ganadores" isOpen={isOpen} onClose={onClose}>
        <div className="d-flex flex-row gap-2">
          <div className="section-numbers">
            {data.map((win) => (
              <div
                className={`number-winners ${selectedId === win.id ? "selected" : ""}`}
                key={win.id}
                onClick={() => handlePatternWinner(win.pattern, win.id)}
              >
                <span>{win.id}</span>
              </div>
            ))}
          </div>
          <BingoTable pattern={pattern}></BingoTable>
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
    gap: 1rem;
    height: 250px;
    width: 200px;
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
    opacity: .5;
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
    background-color: #9a98d1;
    border-radius: 4px;
  }
  .section-numbers::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.5);
  }
`;
