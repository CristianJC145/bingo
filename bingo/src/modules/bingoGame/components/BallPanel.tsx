import React, { useState } from "react";
import styled from "styled-components";
import { settings } from "../../../../src/shared/constant/settings.constants";

interface BallPanelProps {
  onSelectBall: (balls: number[]) => void;
  allReady: boolean;
}

const BallPanel: React.FC<BallPanelProps> = ({ onSelectBall, allReady }) => {
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const playSound = (ballNumber: number) => {
    const audio = new Audio(
      `${settings.appSounds}/sounds/ball/${ballNumber}.mp3`
    );
    audio.play();
  };

  const handleBallClick = (ball: number) => {
    const updatedBalls = selectedBalls.includes(ball)
      ? selectedBalls.filter((b) => b !== ball)
      : [...selectedBalls, ball];
    setSelectedBalls(updatedBalls);
    onSelectBall(updatedBalls);
    playSound(ball);
  };

  return (
    <BallPanelStyle className="w-100">
      <div className="ball-panel">
        {[...Array(75)].map((_, i) => {
          const ball = i + 1;
          return (
            <button
              key={ball}
              onClick={() => handleBallClick(ball)}
              disabled={!allReady}
              className={
                selectedBalls.includes(ball) ? "ball selected" : "ball"
              }
            >
              {ball}
            </button>
          );
        })}
      </div>
    </BallPanelStyle>
  );
};

export default BallPanel;

const BallPanelStyle = styled.div`
  .ball-panel {
    display: grid;
    grid-template-columns: repeat(15, 1fr);
    margin: auto;
    justify-items: center;
    row-gap: 1rem;
  }
  .ball {
    width: 40px;
    height: 40px;
    border-radius: 999px;
    background: rgba(var(--color-primary-rgb), 0.5);
    color: var(--color-body);
    font-size: 1.25rem;
    font-weight: 700;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .ball.selected {
    background: var(--color-primary);
  }
`;
