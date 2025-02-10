import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { toast } from "react-toastify";
import AppIcon from "../../../shared/components/AppIcon";

interface ConfirmFinishProps {
    onClose: () => void;
    onSave: () => void;
}


const ConfirmFinish: React.FC<ConfirmFinishProps> = ({ onClose, onSave }) => {
    const handleFinish = () => {
        onClose();
        onSave();
        toast.success(`Juego Finalizado`);
    }
    return (
        <ConfirmFinishStyle>
            <div className="confirm-action">
                <div className="action-body">
                    <AppIcon icon="triangle-exclamation"></AppIcon>
                    ¿Seguro que quieres terminar el juego?
                </div>
                <div className="action-footer">
                    <AppButton outlined variant="transparent" className="text-light" onClick={onClose}>Cancelar</AppButton>
                    <AppButton variant="danger" onClick={handleFinish}>Confirmar</AppButton>
                </div>
            </div>
        </ConfirmFinishStyle>
    )
}

export default ConfirmFinish;

const ConfirmFinishStyle = styled.div`
    .confirm-action {
        width: 400px;
    }
    .action-body {
        display: flex;
        align-items: center;
        gap: .5rem;
        padding: 1rem 0;
        color: var(--color-light)
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