import { useEffect, useState } from "react";
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
    selectedFigures: number[];
    onSelectFigures: (selectedFigures: number[]) => void;
}
const FigureSelectorModal: React.FC<FigureSelectorModalProps> = ({ onClose, figures, onSelectFigures, selectedFigures}) => {
  const [localSelectedFigures, setLocalSelectedFigures] = useState<number[]>(selectedFigures);  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pattern, setPattern] = useState<boolean[][]>(
      Array(5).
      fill(Array(5).fill(false))
    );
    const toggleFigureSelection = (figureId: number) => {
      setLocalSelectedFigures((prevSelected: number[]) => 
        prevSelected.includes(figureId) 
          ? prevSelected.filter(id => id !== figureId) 
          : [...prevSelected, figureId]
      );
    };
    const handleSave = () => {
      onSelectFigures(localSelectedFigures);
      onClose();
    };
    const handleRowClick = (figure: Figure) => {
      setPattern(figure.pattern);
      setSelectedIds((prevSelected) =>
        prevSelected.includes(figure.id)
          ? prevSelected.filter((selectedId) => selectedId !== figure.id)
          : [...prevSelected, figure.id]
      );
    };
    useEffect(() => {
      if (selectedFigures) {
        setSelectedIds(selectedFigures);
      }
      setLocalSelectedFigures(selectedFigures);
    },[selectedFigures]);
    return (
      <FigureSelectorModalStyle>
        <div className="modal-main-content">
          <div className="content-list">
            {figures.map(figure => (
              <div className={`list-item ${selectedIds.includes(figure.id) ? "selected" : ""}`} key={figure.id}>
                <input
                  type="checkbox"
                  checked={localSelectedFigures.includes(figure.id)}
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
            </div>
          </div>
        </div>
        
        <div className="figure-action">
          <AppButton className="text-white" variant="transparent" onClick={onClose}>Cancelar</AppButton>
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
    gap: 1.5rem;
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
    display: flex;
    flex-direction: column;
    gap: .5rem;
    max-height: 350px;
    max-width: 250px;
    min-width: 200px;
    overflow-y: auto;
  }
  .list-item {
    display: flex;
    align-items: center;
    gap: .5rem;
    background-color: #15143c;
    border-radius: 12px;
    padding: var(--p-3);
    width: 95%;
    opacity: .5;
  }
  .list-item.selected {
    opacity: 1;
  }
  .item-name {
    color: var(--color-light);
  }
  .content-list::-webkit-scrollbar {
    width: 7px;
  }
  .content-list::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
  }
  .content-list::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #9a98d1;
  }
`