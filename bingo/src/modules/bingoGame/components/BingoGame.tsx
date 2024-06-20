// src/modules/BingoGame/BingoGame.tsx
import React, { useState } from 'react';
import FigureEditor from './FigureEditor';

const BingoGame: React.FC = () => {
  const [figures, setFigures] = useState<{ name: string, pattern: boolean[][] }[]>([]);

  const addFigure = (figure: { name: string, pattern: boolean[][] }) => {
    setFigures([...figures, figure]);
  };

  return (
    <div>
      <h2>Manage Bingo Figures</h2>
      <FigureEditor onSave={addFigure} />
      <div className="figure-list">
        {figures.map((figure, index) => (
          <div key={index} className="figure-item">
            <h3>{figure.name}</h3>
            <div className="figure-pattern">
              {figure.pattern.map((row, rowIndex) => (
                <div key={rowIndex} className="figure-row">
                  {row.map((cell, cellIndex) => (
                    <span key={cellIndex} className={cell ? 'filled' : ''}>⬛</span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BingoGame;
