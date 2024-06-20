import React, { useState } from 'react';
import styled from 'styled-components';

interface FigureEditorProps {
  onSave: (figure: { name: string, pattern: boolean[][] }) => void;
}

const FigureEditor: React.FC<FigureEditorProps> = ({ onSave }) => {
  const [name, setName] = useState('');
  const [pattern, setPattern] = useState<boolean[][]>(Array(5).fill(Array(5).fill(false)));

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
        <div className="pattern-grid">
          {pattern.map((row, rowIndex) => (
            <div key={rowIndex} className="pattern-row">
              {row.map((cell, colIndex) => (
                <span 
                  key={colIndex} 
                  className={cell ? 'filled' : ''} 
                  onClick={() => handlePatternChange(rowIndex, colIndex)}
                >
                  ⬛
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
  .figure-editor {
    margin: 20px 0;
  }

  .pattern-grid {
    display: grid;
    gap: 5px;
  }

  .pattern-row {
    display: flex;
  }

  .pattern-row span {
    width: 30px;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #ccc;
    cursor: pointer;
  }

  .pattern-row span.filled {
    background-color: #000;
    color: #fff;
  }

  .figure-list {
    margin: 20px 0;
  }

  .figure-item {
    margin-bottom: 20px;
  }

  .figure-pattern {
    display: grid;
    grid-template-columns: repeat(5, 30px);
    gap: 5px;
  }

  .figure-row {
    display: flex;
  }

`

