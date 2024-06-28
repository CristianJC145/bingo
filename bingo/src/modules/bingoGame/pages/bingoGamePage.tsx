import React, { useEffect, useState } from 'react';
import BallPanel from '../components/BallPanel';
import FigureSelector from '../components/FigureSelector';
import CartonRangeSelector from '../components/CartonRangeSelector';
import AppButton from '../../../shared/components/Buttons/AppButton';

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

const BingoGamePage: React.FC = () => {
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const [selectedFigures, setSelectedFigures] = useState<Figure[]>([]);
  const [cartonRange, setCartonRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [isGameStarted, setIsGameStarted] = useState(false);

  useEffect(() => {
    if (selectedFigures.length > 0 && cartonRange.start > 0 && cartonRange.end > 0) {
      setIsGameStarted(true);
    } else {
      setIsGameStarted(false);
    }
  }, [selectedFigures, cartonRange]);

  const handleSelectBall = (balls: number[]) => {
    setSelectedBalls(balls);
    checkForWinner(balls);
  };

  const handleSelectFigure = (figures: Figure[]) => {
    setSelectedFigures(figures);
  };

  const handleSelectRange = (range: { start: number; end: number }) => {
    setCartonRange(range);
  };

  const checkForWinner = async (balls: number[]) => {
    if (!isGameStarted) return;

    const response = await fetch('http://localhost:3000/api/game/checkWinner', {
      method: 'POST',
      body: JSON.stringify({
        balls,
        figures: selectedFigures,
        range: cartonRange
      }),
    });

    const result = await response.json();
    if (result.winner) {
      alert(`¡Hay un ganador! Cartón: ${result.winningCard}`);
    }
  };

  return (
    <div className="bingo-game">
      <BallPanel onSelectBall={handleSelectBall} />
      <FigureSelector onSelectFigure={handleSelectFigure} />
      <CartonRangeSelector onSelectRange={handleSelectRange} />
      <AppButton
        onClick={() => setIsGameStarted(true)}
        disabled={!isGameStarted}
      >
        Iniciar Juego
      </AppButton>
    </div>
  );
};

export default BingoGamePage;
