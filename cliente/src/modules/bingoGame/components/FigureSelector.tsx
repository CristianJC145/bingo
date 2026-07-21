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
  gameReset: boolean;
}

const FigureSelector: React.FC<FigureSelectorProps> = ({ onSelectFigure, gameReset }) => {
  const [pattern, setPattern] = useState<boolean[][]>(
    Array(5).fill(Array(5).fill(false))
  );
  const [figures, setFigures] = useState<Figure[]>([]);
  const [selectedFigureIds, setSelectedFigureIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [figuresModal, setFiguresModal] = useState<number[]>([]);

  useEffect(() => {
    const fetchFigures = async () => {
      const result = await getAllFiguresService.run();
      setFigures(result.data);
    };

    fetchFigures();
  }, []);

  useEffect(() => {
    if (figuresModal.length > 0) {
      setSelectedFigureIds([figuresModal[0]]);
      const pattern = figures.find(
        (figure) => figure.id === selectedFigureIds[0]
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      setPattern(pattern?.pattern!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [figures, figuresModal]);
  useEffect(() => {
    if (gameReset) {
      setSelectedFigureIds([]);
      setFiguresModal([]);
      setPattern(Array(5).fill(Array(5).fill(false)));
    }
  },[gameReset]);

  const handleSelectFigures = (selectedFigureIds: number[]) => {
    setFiguresModal(selectedFigureIds);
    setSelectedFigureIds(selectedFigureIds);

    const selectedFigures: Figure[] = selectedFigureIds
      .map((id) => {
        return figures.find((figure) => figure.id === id);
      })
      .filter((figure): figure is Figure => figure !== undefined);

    onSelectFigure(selectedFigures);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(event.target.selectedOptions).map((option) =>
      Number(option.value)
    );
    setSelectedFigureIds(selectedIds);
  };
  const handleRowClick = (figureId: number) => {
    const selectedFigure = figures.find((figure) => figure.id === figureId);
    if (selectedFigure) {
      setPattern(selectedFigure.pattern);
    }
  };
  return (
    <FigureSelectorStyle>
      <div className="section figure-selector">
        <span className="section-header">Figuras en juego</span>
        <div className="selector-content">
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
            className="form-select list-figures"
            onChange={handleSelectChange}
          >
            {figuresModal.map((id) => {
              const figure = figures.find((figure) => figure.id === id);
              return (
                <option key={id} value={id} onClick={() => handleRowClick(id)}>
                  {figure ? figure.name : `Figure ${id}`}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <AppModal
        title="Seleccion de Figuras"
        size="md"
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      >
        <FigureSelectorModal
          onClose={handleCloseModal}
          figures={figures}
          selectedFigures={figuresModal}
          onSelectFigures={handleSelectFigures}
        />
      </AppModal>
    </FigureSelectorStyle>
  );
};

export default FigureSelector;

const FigureSelectorStyle = styled.div`
  .figure-selector {
    box-shadow: 1px 4px 6px rgba(0, 0, 0, 0.4);
    padding: 1rem;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
  }
  .section-header {
    text-align: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(var(--color-light-rgb), 0.04);
  }
  .selector-content {
    display: flex;
    gap: 2rem;
    margin-top: 1rem;
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
    background-color: rgba(0, 0, 0, 0.3);
    border: none;
    color: var(--color-light);
  }
  .list-figures:focus {
    box-shadow: 0 0 4px 4px rgba(0, 0, 0, 0.07);
  }
  .list-figures::-webkit-scrollbar {
    width: 8px;
  }
  .list-figures::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
`;
