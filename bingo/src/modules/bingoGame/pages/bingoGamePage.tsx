import React, { useEffect, useState } from "react";
import BallPanel from "../components/BallPanel";
import FigureSelector from "../components/FigureSelector";
import CartonRangeSelector from "../components/CartonRangeSelector";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { CheckWinnerService } from "../services/checkWinner.service";
import { toast } from "react-toastify";
import styled from "styled-components";

const checkWinnerService = new CheckWinnerService();

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

const BingoGamePage: React.FC = () => {
  const [selectedFigures, setSelectedFigures] = useState<Figure[]>([]);
  const [cartonRange, setCartonRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 0 });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [balls, setBalls] = useState<number[]>([])

  useEffect(() => {
    if (
      selectedFigures.length > 0 &&
      cartonRange.start > 0 &&
      cartonRange.end > 0
    ) {
      setAllReady(true);
    } else {
      setAllReady(false);
    }
  }, [selectedFigures, cartonRange]);

  const handleSelectBall = (balls: number[]) => {
    setBalls(balls);
    checkForWinner(balls);
    console.log(balls)
  };

  const handleSelectFigure = (figures: Figure[]) => {
    setSelectedFigures(figures);
  };

  const handleSelectRange = (range: { start: number; end: number }) => {
    setCartonRange(range);
  };
  const handleStartOrFinishGame = () => {
    if (allReady) {
      setIsGameStarted(!isGameStarted);
      toast.success("Juego iniciado");
    }
  };

  const checkForWinner = async (balls: number[]) => {
    if (!isGameStarted) return;
    const data = {
      balls: balls,
      figures: selectedFigures,
      range: cartonRange,
    };

    const response = await checkWinnerService.run(data);

    const { winner, winningCards } = response;

    if (winner) {
      toast.success(`¡Hay un ganador! Cartón: ${winningCards}`);
    }
  };

  return (
    <BingoGamePageStyle>
      <div className="bingo-game">
        <div className="game-mainSection">
          <BallPanel allReady={isGameStarted} onSelectBall={handleSelectBall} />
        </div>
        <div className="d-flex justify-content-between flex-sm-row flex-column">
          <div className="section balls">
            <div className="balls-header">#Jugados</div>
            <div className="balls-list">
              {balls.map((ball, index) => (
                <span key={index} className="ball-number">{ball}</span>
              ))}
            </div>
          </div>
          <div className="section">
            <div className="d-flex justify-content-center mb-4 mt-3">
            <div className={`${allReady ? isGameStarted ? "btn-game-container rotate" : "btn-game-container" : "btn-game-container btn-disabled"}`}>
              <AppButton
                onClick={handleStartOrFinishGame}
                disabled={!allReady}
                className="btn-game"
                icon={!isGameStarted ? "play" : "rotate"}
              />
            </div>
            </div>
            <CartonRangeSelector onSelectRange={handleSelectRange} />
            <AppButton
              disabled={!allReady}
              label="Random"
            />
          </div>
          <FigureSelector onSelectFigure={handleSelectFigure} />
        </div>
      </div>
    </BingoGamePageStyle>
  );
};

export default BingoGamePage;

const BingoGamePageStyle = styled.div`
  .game-mainSection {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .btn-game-container {
    position: relative;
    box-shadow: 0 0 20px rgba(75, 0, 130, 0.5),
        0 0 20px rgba(138, 43, 226, 0.5),
        0 0 30px rgba(138, 43, 226, 0.5);
    border-radius: 999px;
  }
  .btn-game-container::before {
    content: "";
    position: absolute;
    top: -8px;
    left: -8px;
    right: -8px;
    bottom: -8px;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      #8A2BE2 0deg 120deg,
      transparent 120deg 180deg,
      #430f87 180deg 300deg,
      transparent 300deg 360deg,
      blue 360deg
    );
    z-index: 1;
  }
  .rotate {
    animation: rotateBorder 4s linear infinite;
  }
  .btn-game-container::after {
    content: "";
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border-radius: 50%;
    background-color: white;
    z-index: 0;
  }
  .btn-game-container.btn-disabled {
    opacity: .5;
    box-shadow: none;
  }
  .btn-game-container.btn-disabled::before {
    animation: unset;
  }
  .btn-game-container.btn-disabled .btn-game {
    cursor: unset;
  }
  .btn-game {
    position: relative;
    background-color: var(--color-primary);
    border-radius: 999px;
    width: 60px;
    height: 60px;
    font-size: 24px;
    z-index: 2;
  }
  .section {
    padding: 1rem;
    box-shadow: 1px 3px 6px rgba(0, 0, 0, .2);
    border-radius: 16px;
    background-color: #343c57;
    color: var(--color-light);
  }
  .balls {
    min-width: 300px;
  }
  .balls-header {
    text-align: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-gray-800);
  }
  .balls-list {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1rem;
    margin-top: 1rem; 
  }
  .ball-number {
    color: #fff;
    background-color: rgba(0,0,0, .3);
    text-align: center;
  }
  @media (min-width: 768px) {
    .balls {
      min-width: 600px;
    }
  }
  @keyframes rotateBorder {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
