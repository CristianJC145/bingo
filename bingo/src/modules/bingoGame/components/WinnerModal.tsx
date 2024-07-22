import styled from "styled-components";
import bingoImage from "../../../assets/images/bingo.png";
import AppButton from "../../../shared/components/Buttons/AppButton";

interface Card {
  id: number;
  pattern: number[][];
}
interface WinnerModalProps {
  onClose: () => void;
  winnerCards: Card[];
  isOpen: boolean;
}
const WinnerModal: React.FC<WinnerModalProps> = ({
  winnerCards,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  const winners = winnerCards?.length;
  return (
    <WinnerModalStyle>
      <div className="winner-overlay">
        <div className="winner-modal">
          <div className="img-winner">
            <span className="winner-number">¡Hay {winners} ganadores!</span>
            <img className="winner" src={bingoImage} alt="" />
            <h3 className="winner-list">
              {winnerCards[0].id < 100
                ? `000${winnerCards[0].id}`
                : winnerCards[0].id}
            </h3>
          </div>
          <AppButton
            onClick={onClose}
            variant="light"
            outlined
            icon="times"
          ></AppButton>
        </div>
      </div>
    </WinnerModalStyle>
  );
};
export default WinnerModal;

const WinnerModalStyle = styled.div`
  .winner-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 99;
  }
  .winner-modal {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .img-winner {
    display: flex;
    position: relative;
    justify-content: center;
    width: 550px;
  }
  .winner-number {
    position: absolute;
    top: 40px;
    color: var(--color-light);
    font-size: small;
  }
  .winner {
    width: 100%;
  }
  .winner-list {
    position: absolute;
    color: var(--color-light);
    bottom: 49px;
    font-weight: 700;
    margin: 0;
  }
`;
