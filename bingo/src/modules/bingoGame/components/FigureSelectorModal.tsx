import { useState } from "react";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import styled from "styled-components";

interface Figure {
    id: number;
    name: string;
    pattern: boolean[][];
}
interface FigureSelectorModalProps {
    onClose: () => void;
    figures: Figure[];
    onSelectFigures: (selectedFigures: Figure[]) => void;
}
const FigureSelectorModal: React.FC<FigureSelectorModalProps> = ({ onClose, figures, onSelectFigures,}) => {
    const [selectedFigureIds, setSelectedFigureIds] = useState<number[]>([]);
    const [pattern, setPattern] = useState<boolean[][]>(
      Array(5).
      fill(Array(5).fill(false))
    );
    const [selectedFigure, setSelectedFigure] = useState<any | null>(null);
    const toggleFigureSelection = (figureId: number) => {
      setSelectedFigureIds((prevSelected: number[]) => 
        prevSelected.includes(figureId) 
          ? prevSelected.filter(id => id !== figureId) 
          : [...prevSelected, figureId]
      );
    };
    const handleSave = () => {
      const selectedFigures = figures.filter(figure => selectedFigureIds.includes(figure.id));
      console.log(selectedFigures);
      onSelectFigures(selectedFigures);
      onClose();
    };
    const handleRowClick = (figure: Figure) => {
      setPattern(figure.pattern);
      setSelectedFigure(figure);
    };
    return (
      <FigureSelectorModalStyle>
        <div className="modal-main-content">
          <div className="content-list">
            {figures.map(figure => (
              <div className="list-item" key={figure.id}>
                <input
                  type="checkbox"
                  checked={selectedFigureIds.includes(figure.id)}
                  onChange={() => toggleFigureSelection(figure.id)}
                  onClick={()=> handleRowClick(figure)}
                  className="form-check-input"
                  id={`${figure.id}`}
                />
                <label className="item-name" htmlFor={`${figure.id}`}>{(figure.name)}</label>
              </div>
            ))}
          </div>

          <div>
            <div className="m-side-table">
              <div className="m-table-header">
                <h4>B</h4>
                <h4>I</h4>
                <h4>N</h4>
                <h4>G</h4>
                <h4>O</h4>
              </div>
              
              <div className="m-table-content">
                {pattern.map((row: boolean[], rowIndex: number) =>
                  row.map((cell: boolean, cellIndex: number) => (
                    <div
                      key={`${rowIndex}-${cellIndex}`}
                      className={`${
                      rowIndex === 2 && cellIndex === 2
                        ? "m-free"
                        : cell
                        ? "m-cell filled"
                        : "m-cell"
                      }`}
                    >
                      {rowIndex === 2 && cellIndex === 2 ? (
                        <span>FREE</span>
                      ) : cell ? (
                        <AppIcon icon="star"></AppIcon>
                      ) : (
                        ""
                      )}
                    </div>
                  ))
                )}
              </div>
              <h5 className="m-table-figure-name">{`${selectedFigure ? selectedFigure.name : "Figura"}`}</h5>
            </div>
          </div>
        </div>
        
        <div className="figure-action">
          <AppButton variant="transparent" onClick={onClose}>Cancelar</AppButton>
          <AppButton onClick={handleSave}>Guardar</AppButton>
        </div>
      </FigureSelectorModalStyle>
    )
}
export default FigureSelectorModal;

const FigureSelectorModalStyle = styled.div`
  .modal-figure-content {
    display: flex;
  }
  .modal-main-content {
    display: flex;
    padding-top: 1rem;
    gap: 2rem;
  }
  .m-table-header {
    display: flex;
    justify-content: space-between;
    margin-top: .5rem;
    margin-bottom: .5rem;
    color: var(--color-body);
  }
  .m-table-header h4 {
    width: 60px;
    text-align: center;
    margin-bottom: 0;
  }
  .m-side-table {
    background-color: var(--color-primary);
    border-radius: 8px;
    padding: .5rem;
    height: fit-content;
  }
  .m-table-content {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    row-gap: .2rem;
  }
  .m-cell {
    background-color: var(--color-body);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 50px;
    height: 50px;
    margin: 0.2rem;
  }
  .m-cell.filled {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
  }
  .m-cell svg {
    font-size: 24px;
  }
  .m-free {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 18px
  }
  .figure-action {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid rgba(var(--color-gray-300-rgb), .1);
    padding-top: 1rem;
    margin-top: 1rem;
  }
  .m-table-figure-name {
    color: var(--color-body);
    text-align: center;
    margin-top: .5rem;
    font-weight: 700;
  }
  .content-list {
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0, .05);
    box-shadow: 1px 2px 4px rgba(0, 0, 0, .3);
    max-height: 400px;
    overflow: auto;
  }
  .list-item {
    display: flex;
    gap: .5rem;
    height: 2rem;
  }
  .item-name {
    text-transform: uppercase;
  }
`