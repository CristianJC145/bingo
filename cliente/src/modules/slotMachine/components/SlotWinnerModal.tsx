import React from "react";
import WinnerCelebration from "../../../shared/components/WinnerCelebration";
import { buildWinnerChips } from "../../../shared/utils/winnerChips";
import { SlotResult } from "../services/slotMachine.service";

interface SlotWinnerModalProps {
  result: SlotResult;
  onClose?: () => void;
}

/** Las etiquetas se arman igual que en el bingo: mismos datos, orden, colores y reglas. */
const SlotWinnerModal: React.FC<SlotWinnerModalProps> = ({ result, onClose }) => (
  <WinnerCelebration
    eyebrow="Cartón ganador"
    winners={[{
      cardNumber: result.cardNumber,
      card: result.card,
      name: result.nombreCompleto,
      chips: buildWinnerChips(result),
    }]}
    onClose={onClose}
  />
);

export default SlotWinnerModal;
