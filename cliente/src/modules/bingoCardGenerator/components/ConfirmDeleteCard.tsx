import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import { DeleteBingoCardService } from "../services/deleteBingoCard.service";

interface CardData { id: number; }
interface ConfirmDeleteCardProps { cardData: CardData; onClose: () => void; onSave: () => void; }

const deleteBingoCardService = new DeleteBingoCardService();

const ConfirmDeleteCard: React.FC<ConfirmDeleteCardProps> = ({ onClose, cardData, onSave }) => {
  const handleDelete = async () => {
    await deleteBingoCardService.run(cardData.id);
    onClose();
    onSave();
    toast.success(`¡Se ha eliminado el cartón #${cardData.id} correctamente!`);
  };

  return (
    <ConfirmDeleteCardStyle>
      <div className="confirm-action">
        <div className="action-body">
          <AppIcon icon="triangle-exclamation" />
          Estás a punto de eliminar el cartón
          <span className="fw-bold">#{cardData.id}</span>
        </div>
        <div className="action-footer">
          <AppButton outlined variant="dark" onClick={onClose}>Cancelar</AppButton>
          <AppButton variant="danger" onClick={handleDelete}>Confirmar</AppButton>
        </div>
      </div>
    </ConfirmDeleteCardStyle>
  );
};

export default ConfirmDeleteCard;

const ConfirmDeleteCardStyle = styled.div`
  .confirm-action { width: 400px; }
  .action-body { display: flex; align-items: center; gap: .5rem; padding: 1rem 0; }
  .action-body svg { color: var(--color-danger); font-size: 16px; }
  .action-footer { display: flex; gap: 1rem; justify-content: flex-end; padding: 1rem 0; }
`;
