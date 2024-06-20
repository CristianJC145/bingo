// src/modules/BingoGame/FigureEditor.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import AppDataTable from '../../../shared/components/DataTable/AppDataTable';

interface FigureEditorProps {
  onSave: (figure: { name: string, pattern: boolean[][] }) => void;
  figure?: { id?: number, name: string, pattern: boolean[][] } | null;
}

const FigureEditor: React.FC<FigureEditorProps> = ({ onSave, figure }) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<boolean[][]>(Array(5).fill(Array(5).fill(false)));
  const columns = [
    {
      Header: "Stock",
      accessor: "",
      HeaderClassName: "text-center",
      columnClassName: "text-center",
    },
  ]

  const params = {
    id: 1,
  };

  useEffect(() => {
    if (figure) {
      setName(figure.name);
      setPattern(figure.pattern);
    } else {
      setName('');
      setPattern(Array(5).fill(Array(5).fill(false)));
    }
  }, [figure]);

  const handlePatternChange = (rowIndex: number, colIndex: number) => {
    const newPattern = pattern.map((row, rIdx) => 
      row.map((cell, cIdx) => 
        rowIndex === rIdx && colIndex === cIdx ? !cell : cell
      )
    );
    setPattern(newPattern);
  };

  const handleSave = () => {
    if (name.trim()) {
      onSave({ name, pattern });
      setName('');
      setPattern(Array(5).fill(Array(5).fill(false)));
    }
  };

  return (
    <FigureEditorStyle>
      <div className="figure-editor">
        <input 
          type="text" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Figure Name" 
        />
        <AppDataTable
          columns={columns}
          params={params}
          service={"sdfsd"}
        >
        </AppDataTable>
        <div className="pattern-grid">
          {pattern.map((row, rowIndex) => (
            <div key={rowIndex} className="pattern-row">
              {row.map((cell, colIndex) => (
                <span 
                  key={colIndex} 
                  className={cell ? 'cell filled' : 'cell'} 
                  onClick={() => handlePatternChange(rowIndex, colIndex)}
                >
                -
                </span>
              ))}
            </div>
          ))}
        </div>
        <button onClick={handleSave}>Save Figure</button>
      </div>
    </FigureEditorStyle>
  );
};

export default FigureEditor;

const FigureEditorStyle = styled.div`
  .pattern-grid {

  }
  .pattern-row {

  }
  .cell {
    background-color: var(--color-primary);
    color: var(--color-primary);
    border-radius: 8px;
    display: inline-block;
    width: 50px;
    height: 50px;
    margin: 0.2rem; 
  }
  .cell.filled {
    background-color: var(--color-pastel-green);
    color: var(--color-pastel-green);
  }
`
