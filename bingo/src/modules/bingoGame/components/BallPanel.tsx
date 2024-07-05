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
            <div className={selectedBalls.includes(ball) ? "ball-container selected" : "ball-container"}>
              <button
                key={ball}
                onClick={() => handleBallClick(ball)}
                disabled={!allReady}
                className={selectedBalls.includes(ball) ? "ball selected" : "ball"}
              >
                {ball}
              </button>
            </div>
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
  .ball-container {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    width: 45px;
    height: 45px;
  }
  .ball-container.selected {
    background: linear-gradient(45deg, #32007f54, #8A2BE2, #6a14b6, #8A2BE2, #32007f54);
    background-size: 300% 300%;
    box-shadow: 0 0 12px rgba(75, 0, 130, 0.5),
              0 0 10px rgba(138, 43, 226, 0.5),
              0 0 14px rgba(138, 43, 226, 0.5);
    animation: gradient 4s ease infinite;
  }
  .ball {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 900px;
    background: radial-gradient(circle at 70% 10%, #ffffff, #32007f54 25%, #430671 60%, #2d0f4b8a 90%);
    color: var(--color-body);
    font-size: 1.25rem;
    font-weight: 700;
    border: none;
    overflow: hidden;
    opacity: 0.15;
  }
  .ball.selected {
    opacity: 1;
  }
  @keyframes gradient {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
  }
`;
