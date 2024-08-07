import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import AppButton from '../../../shared/components/Buttons/AppButton';
import { CreateOrUpdateFigureService } from '../services/createOrUpdateFigure.service';
import { toast } from 'react-toastify';
import { GetAllFiguresService } from '../services/getAllFigures.service';
import AppIcon from '../../../shared/components/AppIcon';

const createOrUpdateFigureService = new CreateOrUpdateFigureService();

interface FigureEditorProps {
  id?: number;
  onClose: () => void;
  onSave: () => void
}

const getAllFiguresService = new GetAllFiguresService()

const FigureEditor: React.FC<FigureEditorProps> = ({ id, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<boolean[][]>(Array(5).fill(Array(5).fill(false)));
  const [error, setError] = useState('');

  const fetchFigure = async () => {
    if (id) {
      const result = await getAllFiguresService.run();
      const figure = result.data.find((f: any) => f.id === id);
      if (figure) {
        setName(figure.name);
        setPattern(figure.pattern);
      }
    }
  };
  useEffect(() => {
    fetchFigure();
  }, [id]);

  const handlePatternChange = (rowIndex: number, colIndex: number) => {
    const newPattern = pattern.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rowIndex === rIdx && colIndex === cIdx ? !cell : cell
      )
    );
    setPattern(newPattern);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
  
    const dataSend = {
      data: {
        name: name,
        pattern: pattern,
        ...(id && { id: id }),
      },
    };
  
    try {
      if (id) {
        await createOrUpdateFigureService.run(dataSend);
        toast.success('¡Se ha actualizado la figura correctamente!');
      } else {
        await createOrUpdateFigureService.run(dataSend);
        toast.success(`¡Se ha creado la figura ${name} correctamente!`);
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Hubo un problema al guardar la figura.');
    }
  };
  

  return (
    <FigureEditorStyle>
      <div className="figure-editor">
        <div className='form-group'>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de Figura"
            className={error ? 'form-input mb-2 w-100 error' : 'form-input mb-2 w-100 py-2'}
            id='figure-name'
          />
          {error && <p className="error-message">{error}</p>}
        </div>

        <div className='side-table'>
          <div className='pattern-header'>
            <h5>B</h5>
            <h5>I</h5>
            <h5>N</h5>
            <h5>G</h5>
            <h5>O</h5>
          </div>
          <div className="pattern-grid">
            {pattern.map((row, rowIndex) => (
              <div key={rowIndex} className="pattern-row">
                {row.map((cell, colIndex) => (
                  <div
                    key={colIndex}
                    className={`${rowIndex === 2 && colIndex === 2 ? "free" : cell ?  "cell filled" : "cell"}`}
                    onClick={() => handlePatternChange(rowIndex, colIndex)}
                  >
                    {rowIndex === 2 && colIndex === 2 ? (
                      <span>FREE</span>
                    ): cell ? (
                      <AppIcon icon="star"></AppIcon>
                    ): ("")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className='figure-action'>
          <AppButton variant="light" className='bg-transparent' onClick={onClose}>Cancelar</AppButton>
          <AppButton onClick={handleSave}>Guardar</AppButton>
        </div>
      </div>
    </FigureEditorStyle>
  );
};

export default FigureEditor;

const FigureEditorStyle = styled.div`
  .pattern-grid {
    display: flex;
    flex-direction: column;
    margin-bottom: 1rem;
  }
  .pattern-row {
    display: flex;
    justify-content: space-between;
  }
  .pattern-header {
    display: flex;
    justify-content: space-between;
    margin-top: .5rem;
    margin-bottom: .5rem;
    color: var(--color-body);
  }
  .pattern-header h5 {
    width: 60px;
    text-align: center;
    font-size: 22px;
    margin-bottom: 0;
  }

  .cell {
    background-color: var(--color-body);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 50px;
    height: 50px;
    margin: 0.2rem;
    cursor: pointer;
  }
  .cell.filled {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
  }
  .figure-action {
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid rgba(var(--color-gray-300-rgb), .1);
    padding-top: 1rem;
    margin-top: 1rem;
  }
  .error-message {
    color: red;
    font-size: 0.875em;
  }
  input.error {
    border-color: red;
    box-shadow: 0 0 0 .25rem rgba(253,13,13,.25)
  }
`
