import React, { useEffect, useState } from "react";
import { GetAllFiguresService } from "../../bingoFigures/services/getAllFigures.service";
import AppIcon from "../../../shared/components/AppIcon";
import styled from "styled-components";

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

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const selectedIds = Array.from(options)
      .filter((option) => option.selected)
      .map((option) => Number(option.value));

    setSelectedFigureIds(selectedIds);
    const selectedFigures = figures.filter((figure) =>
      selectedIds.includes(figure.id)
    );
    onSelectFigure(selectedFigures);
  };
  const handleRowClick = (figure: Figure) => {
    setPattern(figure.pattern);
    setSelectedFigure(figure);
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
        <div className="left-side">
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
            {selectedFigure && (
              <h6 className="table-figure-name">{selectedFigure.name}</h6>
            )}
          </div>
        </div>
        <select
          multiple
          value={selectedFigureIds.map(String)}
          onChange={handleSelectChange}
          className="form-select"
        >
          {figures.map((figure) => (
            <option
              key={figure.id}
              value={figure.id}
              onClick={() => handleRowClick(figure)}
            >
              {figure.name}
            </option>
          ))}
        </select>
      </div>
    </FigureSelectorStyle>
  );
};

export default FigureSelector;

const FigureSelectorStyle = styled.div`
  .figure-selector {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  .left-side {
    width: 50%;
  }
  .side-table {
    background-color: transparent;
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
`;
