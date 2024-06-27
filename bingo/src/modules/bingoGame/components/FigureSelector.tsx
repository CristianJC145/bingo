import React, { useEffect, useState } from 'react';
import { GetAllFiguresService } from '../../bingoFigures/services/getAllFigures.service'; 

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
    const [figures, setFigures] = useState<Figure[]>([]);
    const [selectedFigureIds, setSelectedFigureIds] = useState<number[]>([]);
  
    useEffect(() => {
      const fetchFigures = async () => {
        const result = await getAllFiguresService.run();
        setFigures(result.data);
      };
      fetchFigures();
    }, []);
  
    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const options = event.target.options;
      const selectedIds = Array.from(options)
        .filter(option => option.selected)
        .map(option => Number(option.value));
      
      setSelectedFigureIds(selectedIds);
      const selectedFigures = figures.filter(figure => selectedIds.includes(figure.id));
      onSelectFigure(selectedFigures);
    };
  
    return (
      <div className="figure-selector">
        <select multiple value={selectedFigureIds.map(String)} onChange={handleSelectChange}>
          {figures.map(figure => (
            <option key={figure.id} value={figure.id}>{figure.name}</option>
          ))}
        </select>
      </div>
    );
  };
  
  export default FigureSelector;