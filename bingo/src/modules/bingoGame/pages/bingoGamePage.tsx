import React, { useEffect, useState } from "react";
import BallPanel from "../components/BallPanel";
import FigureSelector from "../components/FigureSelector";
import CartonRangeSelector from "../components/CartonRangeSelector";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { CheckWinnerService } from "../services/checkWinner.service";
import { toast } from "react-toastify";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";

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
    checkForWinner(balls);
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
          <BallPanel allReady={allReady} onSelectBall={handleSelectBall} />
        </div>
        <div className="d-flex justify-content-between">
          <textarea name="" id=""></textarea>
          <textarea name="" id=""></textarea>
          <div className="section">
            <div className="d-flex justify-content-center mb-3">
            <AppButton
              onClick={handleStartOrFinishGame}
              disabled={!allReady}
              className={`${!allReady ? "btn-game btn-disabled" : "btn-game"}`}
              icon={!isGameStarted ? "play" : "rotate"}
            />
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
  .btn-disabled:hover {
    background-color: rgba(var(--color-primary-rgb), 0.8);
  }
  .game-mainSection {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .btn-game {
    background-color: var(--color-primary);
    border-radius: 999px;
    width: 70px;
    height: 70px;
    font-size: 24px;
  }
  .btn-game.btn-disabled {
    background-color: rgba(var(--color-primary-rgb), 0.8);
  }
  .section {
    padding: 1rem;
    box-shadow: 1px 3px 6px rgba(0, 0, 0, .2);
    border-radius: 16px;
  }
`;
