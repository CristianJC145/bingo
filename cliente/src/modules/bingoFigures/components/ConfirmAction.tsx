import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { DeleteFigureService } from "../services/deleteFigure.service";
import { toast } from "react-toastify";
import AppIcon from "../../../shared/components/AppIcon";

interface ConfirmActionProps {
    figureData?: any;
    onClose: () => void;
    onSave: () => void;
}

const deleteFigureService = new DeleteFigureService();

const ConfirmAction: React.FC<ConfirmActionProps> = ({ onClose, figureData, onSave }) => {
    const handleDelete = async() => {
        if (figureData.id) {
            await deleteFigureService.run(figureData.id);
            onClose();
            onSave();
        }
        toast.success(`¡Se ha eliminado la figura ${figureData.name} correctamente!`);
    }
    return (
        <ConfirmActionStyle>
            <div className="confirm-action">
                <div className="action-body">
                    <AppIcon icon="triangle-exclamation"></AppIcon>
                    Estas a punto de eliminar la figura
                    <span className="fw-bold">{figureData.name}</span>
                </div>
                <div className="action-footer">
                    <AppButton outlined variant="dark" onClick={onClose}>Cancelar</AppButton>
                    <AppButton variant="danger" onClick={handleDelete}>Confirmar</AppButton>
                </div>
            </div>
        </ConfirmActionStyle>
    )
}

export default ConfirmAction;

const ConfirmActionStyle = styled.div`
    .confirm-action {
        width: 400px;
    }
    .action-body {
        display: flex;
        align-items: center;
        gap: .5rem;
        padding: 1rem 0;
    }
    .action-body svg {
        color: var(--color-danger);
        font-size: 16px;
    }
    .action-footer {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding: 1rem 0;
    }
`