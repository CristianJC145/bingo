import React, { useState } from 'react';

interface BallPanelProps {
  onSelectBall: (balls: number[]) => void;
}

const BallPanel: React.FC<BallPanelProps> = ({ onSelectBall }) => {
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);

  const handleBallClick = (ball: number) => {
    const updatedBalls = selectedBalls.includes(ball)
      ? selectedBalls.filter(b => b !== ball)
      : [...selectedBalls, ball];
    setSelectedBalls(updatedBalls);
    onSelectBall(updatedBalls);
  };

  return (
    <div className="ball-panel">
      {[...Array(75)].map((_, i) => {
        const ball = i + 1;
        return (
          <button
            key={ball}
            onClick={() => handleBallClick(ball)}
            className={selectedBalls.includes(ball) ? 'selected' : ''}
          >
            {ball}
          </button>
        );
      })}
    </div>
  );
};

export default BallPanel;
