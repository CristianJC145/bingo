import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { settings } from "../../../../src/shared/constant/settings.constants";

interface BallPanelProps {
  onSelectBall: (balls: number[]) => void;
  onRandomBall?: number[];
  isActivePanel: boolean;
  gameReset: boolean;
}

const BallPanel: React.FC<BallPanelProps> = ({
  onSelectBall,
  isActivePanel,
  onRandomBall,
  gameReset,
}) => {
  const [selectedBalls, setSelectedBalls] = useState<number[]>([]);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);
  const playSound = (ballNumber: number) => {
    const audio = new Audio(
      `${settings.appSounds}/sounds/ball/NUM${ballNumber}.wav`
    );
    audio.play();
  };
  useEffect(() => {
    if (onRandomBall && userInteracted && gameReset === false) {
      const ballsToAdd = Array.isArray(onRandomBall)
        ? onRandomBall
        : [onRandomBall];
      const updatedBallsSet = new Set([...selectedBalls, ...ballsToAdd]);
      const updatedBallsArray = Array.from(updatedBallsSet);
      setSelectedBalls(updatedBallsArray);
      playSound(updatedBallsArray[updatedBallsArray.length - 1]);
    }
    if (gameReset) {
      setSelectedBalls([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRandomBall, isActivePanel, gameReset]);

  useEffect(() => {
    const handleUserInteraction = () => setUserInteracted(true);
    const randomBallButton = document.getElementById("btn-game-random");

    if (randomBallButton) {
      randomBallButton.addEventListener("click", handleUserInteraction, {
        once: true,
      });
    }

    return () => {
      if (randomBallButton) {
        randomBallButton.removeEventListener("click", handleUserInteraction);
      }
    };
  }, []);

  const handleBallClick = (ball: number) => {
    setUserInteracted(true);
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
        {[...Array(75)].map((index, i) => {
          const ball = i + 1;
          return (
            <div
              className={
                selectedBalls.includes(ball)
                  ? "ball-container selected"
                  : "ball-container"
              }
              key={i}
            >
              <button
                key={`ball-${index}`}
                onClick={() => handleBallClick(ball)}
                disabled={isActivePanel}
                className={
                  selectedBalls.includes(ball) ? "ball selected" : "ball"
                }
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
    row-gap: 0.5rem;
  }
  .ball-container {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    width: 40px;
    height: 40px;
  }
  .ball-container.selected {
    background: linear-gradient(
      45deg,
      #1d1c48,
      #6056ee,
      #1d1c48,
      #6056ee,
      #32007f54
    );
    background-size: 300% 300%;
    box-shadow: 0 0 12px rgba(29, 28, 72, 0.5), 0 0 10px rgba(116, 43, 226, 0.5),
      0 0 14px rgba(138, 43, 226, 0.5);
    animation: gradient 4s ease infinite;
  }
  .ball {
    position: relative;
    width: 35px;
    height: 35px;
    border-radius: 900px;
    background: radial-gradient(
      circle at 70% 10%,
      #ffffff,
      #6056ee 25%,
      #1d1c48 60%,
      #2d0f4b8a 90%
    );
    color: var(--color-body);
    font-size: 1.125rem;
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
