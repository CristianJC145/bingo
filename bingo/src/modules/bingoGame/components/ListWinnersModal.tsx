import styled from "styled-components";
import AppModal from "../../../shared/components/AppModal";
import BingoTable from "./BingoTable";
import { useState } from "react";

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
  const [pattern, setPatternWinner] = useState<number[][]>(data[0].pattern);

  const handlePatternWinner = (winner: number[][]) => {
    setPatternWinner(winner);
  };
  console.log("patron 1", pattern);
  return (
    <ListWinnerModalStyle>
      <AppModal title="Lista de Ganadores" isOpen={isOpen} onClose={onClose}>
        <div className="d-flex flex-row">
          <div className="d-flex flex-column p-4">
            {data.map((win) => (
              <div
                className="p-2"
                key={win.id}
                onClick={() => handlePatternWinner(win.pattern)}
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

const ListWinnerModalStyle = styled.div``;
