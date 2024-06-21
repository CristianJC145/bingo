import React from 'react';
import styled from 'styled-components';
import FigureManager from '../components/FiguresManager';

const BingoFiguresPage: React.FC = () => {
  return (
    <BingoFiguresStyle>
      <div className="bingo-figures">
        <FigureManager />
      </div>
    </BingoFiguresStyle>
  );
};

export default BingoFiguresPage;

const BingoFiguresStyle = styled.div`

`
