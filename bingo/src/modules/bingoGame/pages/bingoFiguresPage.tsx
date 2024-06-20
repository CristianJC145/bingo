// src/pages/BingoGamePage.tsx
import React from 'react';
// import BingoGame from '../components/BingoGame';
import AppButton from '../../../shared/components/Buttons/AppButton';
import styled from 'styled-components';
import FigureManager from '../components/FiguresManager';

const BingoFiguresPage: React.FC = () => {
  const handleAddFigure = () => {
    console.log("creando figura")
  }
  return (
    <BingoFiguresStyle>
      <div className="bingo-figures">
        <div className='figures-action'>
          <AppButton label='Crear Figura' onClick={handleAddFigure}></AppButton>
        </div>
        <h1>Figuras registradas</h1>
        <FigureManager />
      </div>
    </BingoFiguresStyle>
  );
};

export default BingoFiguresPage;

const BingoFiguresStyle = styled.div`
  .figures-action {
    width: 200px;
  }
`
