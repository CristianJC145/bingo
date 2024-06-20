// src/pages/BingoGamePage.tsx
import React from 'react';
import BingoGame from '../components/BingoGame';

const BingoGamePage: React.FC = () => {
  return (
    <div className="bingo-game-page">
      <h1>Bingo Game</h1>
      <BingoGame />
    </div>
  );
};

export default BingoGamePage;
