import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";

const ConfirmAction: React.FC = () => {
    return (
        <ConfirmActionStyle>
            <div className="confirm-action">
                <div className="action-body">
                    Estas a punto de eliminar la figura
                </div>
                <div className="action-footer">
                    <AppButton outlined variant="dark">Cancelar</AppButton>
                    <AppButton variant="danger">Confirmar</AppButton>
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
        padding: 1rem 0;
    }
    .action-footer {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        padding: 1rem 0;
    }
`