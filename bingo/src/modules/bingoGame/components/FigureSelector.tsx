import React, { useEffect, useState } from "react";
import { GetAllFiguresService } from "../../bingoFigures/services/getAllFigures.service";
import AppIcon from "../../../shared/components/AppIcon";
import styled from "styled-components";
import AppModal from "../../../shared/components/AppModal";
import FigureSelectorModal from "./FigureSelectorModal";

const getAllFiguresService = new GetAllFiguresService();

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

interface FigureSelectorProps {
  onSelectFigure: (figures: Figure[]) => void;
}

const FigureSelector: React.FC<FigureSelectorProps> = ({ onSelectFigure }) => {
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(5).fill(Array(5).fill(false))
  );
  const [figures, setFigures] = useState<Figure[]>([]);
  const [selectedFigureIds, setSelectedFigureIds] = useState<number[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedFigure, setSelectedFigure] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFigures, setModalFigures] = useState<Figure[]>([]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const selectedIds = Array.from(options)
      .filter((option) => option.selected)
      .map((option) => Number(option.value));

    setSelectedFigureIds(selectedIds);
    onSelectFigure(modalFigures);
  };
  const handleSelectFigures = (selectedFigures: Figure[]) => {
    setModalFigures(selectedFigures);
    setPattern(selectedFigures[0].pattern);
  }
  const handleRowClick = (figure: Figure) => {
    setSelectedFigure(figure);
    setPattern(figure.pattern);
  };
  const handleOpenModal = ()=> {
    setIsModalOpen(!isModalOpen);
  }
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  const fetchFigures = async () => {
    const result = await getAllFiguresService.run();
    setFigures(result.data);
  };
  useEffect(() => {
    fetchFigures();
  }, []);

  return (
    <FigureSelectorStyle>
      <div className="figure-selector">
        <div className="left-side" onClick={handleOpenModal}>
          <div className="side-table">
            <div className="table-header">
              <h4>B</h4>
              <h4>I</h4>
              <h4>N</h4>
              <h4>G</h4>
              <h4>O</h4>
            </div>
            <div className="table-content">
              {pattern.map((row: boolean[], rowIndex: number) =>
                row.map((cell: boolean, cellIndex: number) => (
                  <div
                    key={`${rowIndex}-${cellIndex}`}
                    className={`${
                      rowIndex === 2 && cellIndex === 2
                        ? "free"
                        : cell
                        ? "cell filled"
                        : "cell"
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
        <select
          multiple
          value={selectedFigureIds.map(String)}
          onChange={handleSelectChange}
          className="form-select list-figures"
        >
          {modalFigures.map((figure) => (
            <option
              key={figure.id}
              value={figure.id}
              onClick={() => handleRowClick(figure)}
              defaultChecked
            >
              {figure.name}
            </option>
          ))}
        </select>
      </div>
      <AppModal title="Selecion de Figuras" size="md" isOpen={isModalOpen} onClose={handleCloseModal}>
        <FigureSelectorModal onClose={handleCloseModal} figures={figures} onSelectFigures={handleSelectFigures}></FigureSelectorModal>
      </AppModal>
    </FigureSelectorStyle>
  );
};

export default FigureSelector;

const FigureSelectorStyle = styled.div`
  .figure-selector {
    box-shadow: 1px 4px 6px rgba(0, 0, 0, .4);
    padding: 1rem;
    border-radius: 8px;
    display: flex;
    gap: 2rem;
  }
  .left-side {
    width: 140px;
    cursor: pointer;
  }
  .side-table {
    background-color: var(--color-primary);
    border-radius: 8px;
    padding: 0.5rem;
    height: fit-content;
    width: 140px;
  }
  .table-header {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    color: var(--color-body);
    justify-items: center;
  }
  .table-header h4 {
    font-weight: 700;
  }
  .table-content {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
  }
  .table-figure-name {
    color: var(--color-body);
    text-align: center;
    margin-top: 0.5rem;
    margin-bottom: 0;
    font-weight: 700;
    font-size: 12px;
  }
  .cell {
    background-color: var(--color-body);
    color: var(--color-primary);
    border-radius: 4px;
    display: inline-block;
    width: 20px;
    height: 20px;
    margin: 0.1rem;
  }
  .cell.filled {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    border: 1px dashed rgba(var(--color-body-rgb), 1);
  }
  .cell svg {
    font-size: 12px;
  }
  .free {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 9px;
  }
  .list-figures {
    min-width: 140px;
  }
`;
