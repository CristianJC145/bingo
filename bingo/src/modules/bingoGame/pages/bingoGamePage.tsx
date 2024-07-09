import React, { useEffect, useState } from "react";
import BallPanel from "../components/BallPanel";
import FigureSelector from "../components/FigureSelector";
import CartonRangeSelector from "../components/CartonRangeSelector";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { CheckWinnerService } from "../services/checkWinner.service";
import { toast } from "react-toastify";
import styled from "styled-components";
import { getValidNumbers } from "../logic/getValidNumers";

const checkWinnerService = new CheckWinnerService();

interface Figure {
  id: number;
  name: string;
  pattern: boolean[][];
}

const BingoGamePage: React.FC = () => {
  const [selectedFigures, setSelectedFigures] = useState<Figure[]>([]);
  const [cartonRange, setCartonRange] = useState<{
    start?: number;
    end?: number;
    specific?: number[]
  }>({ start: 0, end: 0, specific: []});
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [allReady, setAllReady] = useState(false);
  const [balls, setBalls] = useState<number[]>([]);
  const [gameRandom, setGameRandom] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [cardsRangue, setCardsRangue] = useState(false);
  const [gameReset, setGameReset] = useState(false);

  useEffect(() => {
    if (
      selectedFigures.length > 0 && cartonRange !== undefined
    ) {
      setAllReady(true);
    } else {
      setAllReady(false);
    }
  }, [selectedFigures, cartonRange]);

  useEffect(() => {
    if (gameRandom && drawnNumbers.length > 0) {
      const updateBallSet = new Set ([...balls, ...drawnNumbers]);
      setBalls(Array.from(updateBallSet));
      checkForWinner(Array.from(updateBallSet));
    }
  },[drawnNumbers])

  const handleSelectBall = (balls: number[]) => {
    setBalls(balls);
    checkForWinner(balls);
  };
  const handleGameRandom = () => {
    setGameRandom(!gameRandom);
  }
  const handleCardsRangue = () => {
    setCardsRangue(!cardsRangue);
  }
  const handleSelectFigure = (figures: Figure[]) => {
    setSelectedFigures(figures);
  };

  const handleSelectRange = (range: {start?: number, end?: number, specific?: number[]}) => {
    if (cardsRangue) {
      setCartonRange(range);
    }
    setGameReset(false);
  };
  const handleStartOrFinishGame = () => {
    if (allReady && !isGameStarted) {
      setIsGameStarted(!isGameStarted);
      toast.success("Juego iniciado");
    } else if (isGameStarted) {
      setAllReady(false);
      setBalls([]);
      setCardsRangue(false);
      setDrawnNumbers([]);
      setGameRandom(false);
      setCartonRange({ start: 0, end: 0, specific: []} );
      setSelectedFigures([]);
      setIsGameStarted(false);
      setGameReset(true);
    }
  };
  const drawNumber = () => {
    const validNumbers = getValidNumbers(selectedFigures);
    if (validNumbers.length === 0) {
      return;
    }

    const availableNumbers = validNumbers.filter(num => !drawnNumbers.includes(num));
    if (availableNumbers.length === 0) {
      alert('All valid numbers have been drawn.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableNumbers.length);
    const drawnNumber = availableNumbers[randomIndex];
    setDrawnNumbers([...drawnNumbers, drawnNumber]);
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
          <BallPanel gameReset={gameReset} isActivePanel={gameRandom} onSelectBall={handleSelectBall} onRandomBall={drawnNumbers}/>
        </div>
        <div className="d-flex justify-content-between flex-sm-row flex-column">
          <div className="section balls">
            <div className="section-header">#Jugados</div>
            <div className="balls-list">
              {balls.map((ball, index) => (
                <span key={index} className="ball-number">
                  {ball}
                </span>
              ))}
            </div>
          </div>
          <div className="section">
            <div className="section-header">Cartones en Juego</div>
            <div className="d-flex justify-content-center mb-4 mt-3 align-items-center gap-4">
              <div className="d-flex flex-column gap-2 align-items-center">
                <div className="mt-3">
                  <span className="section-title">Especificos</span>
                </div>
                <div className="d-flex gap-3">
                  <div className="btn-action-on">
                    <AppButton 
                      disabled={cardsRangue}
                      onClick={handleCardsRangue} 
                      className={`${cardsRangue ? 'power-on selected' : 'power-on'}`} 
                      icon="power-off">
                    </AppButton>
                  </div>
                  <div className="btn-action-off">
                    <AppButton 
                      disabled={!cardsRangue}
                      onClick={handleCardsRangue} 
                      className={`${!cardsRangue ? 'power-off selected' : 'power-off'}`} 
                      icon="power-off">
                    </AppButton>
                  </div>
                </div>
              </div>
            </div>
            <CartonRangeSelector gameReset={gameReset} onCardsRangue={cardsRangue} onSelectRange={handleSelectRange} />
          </div>
          <div className="section">
            <div className="section-header">Juego</div>
            <div className="section-content">
              <div
                className={`${
                  allReady
                    ? isGameStarted
                      ? "btn-game-container rotate"
                      : "btn-game-container"
                    : "btn-game-container btn-disabled"
                }`}
              >
                <AppButton
                  onClick={handleStartOrFinishGame}
                  disabled={!allReady}
                  className="btn-game"
                  icon={!isGameStarted ? "play" : "rotate"}
                />
              </div>

              <div className="d-flex flex-column align-items-center gap-2">
                <div>
                  <span className="section-title">Balota Aleatoria</span>
                </div>
                <div className="d-flex gap-3">
                  <div className="btn-action-on">
                    <AppButton
                      className={`${isGameStarted ? gameRandom ? 'power-on selected' : 'power-on' : 'power-on disabled'}`}
                      icon="power-off"
                      onClick={handleGameRandom}
                      disabled={isGameStarted ? gameRandom ? true : false : true}
                    ></AppButton>
                  </div>
                  <div className="btn-action-off">
                    <AppButton
                      className={`${!gameRandom ? 'power-off selected' : 'power-off'}`}
                      icon="power-off"
                      onClick={handleGameRandom}
                      disabled={!gameRandom}
                    ></AppButton>
                  </div>
                </div>
              </div>
            </div>
            <AppButton className={`${gameRandom ? 'mt-3' : 'mt-3 disabled'}`} disabled={!gameRandom} onClick={drawNumber} label="Random" />
          </div>
          <FigureSelector gameReset={gameReset} onSelectFigure={handleSelectFigure} />
        </div>
      </div>
    </BingoGamePageStyle>
  );
};

export default BingoGamePage;

const BingoGamePageStyle = styled.div`
  .bingo-game {
    max-width: 1500px;
    margin: 0 auto;
  }
  .game-mainSection {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .btn-game-container {
    position: relative;
    box-shadow: 0 0 20px rgba(75, 0, 130, 0.5), 0 0 20px rgba(138, 43, 226, 0.5),
      0 0 30px rgba(138, 43, 226, 0.5);
    border-radius: 999px;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
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
      #1d1c48 0deg 120deg,
      #1d1c48 130deg 180deg,
      transparent 180deg 300deg,
      transparent 300deg 360deg,
      transparent 360deg
    );
    z-index: 1;
  }
  .rotate {
    animation: rotateBorder 4s linear infinite;
  }
  .btn-game-container::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 140%;
    height: 140%;
    border: 8px solid transparent;
    border-top-color: #f8ad2a;
    border-bottom-color: #f8ad2a;
    border-radius: 50%;
    transform: translate(-50%, -50%) rotate(0deg);
    box-sizing: border-box;
    animation: rotate 2s linear infinite;
    background-color: #2c2a63;
    z-index: 0;
  }
  .btn-game-container.btn-disabled {
    opacity: 0.5;
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
    box-shadow: 1px 3px 6px rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    background: linear-gradient(130deg, #2c2a63, #3e3a83);
    color: var(--color-light);
    min-width: 220px;
  }
  .section-title {
    font-size: 0.85rem;
    font-weight: 300;
  }
  .section-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 1rem;
    align-items: center;
    justify-content: center;
  }
  .btn-action-on {
    padding: 0.5rem;
    border-radius: 99px;
    background: linear-gradient(
      0deg,
      rgba(65, 255, 51, 0.2) 3%,
      rgba(4, 99, 30, 0.2) 80%,
      rgba(0, 0, 0, 0) 98%
    );
  }
  .btn-action-off {
    padding: 0.5rem;
    border-radius: 99px;
    background: linear-gradient(
      0deg,
      rgba(var(--color-danger-600-rgb), 0.3) 3%,
      rgba(var(--color-danger-600-rgb), 0.3) 80%,
      rgba(0, 0, 0, 0) 98%
    );
  }
  .btn-action-off .vs-btn:hover,
  .btn-action-on .vs-btn:hover {
    background-color: initial;
    opacity: 0.7;
  }
  .power-on {
    opacity: .5;
    border-radius: 99px;
    background: linear-gradient(
      0deg,
      rgba(167, 250, 159, 1) 0%,
      rgba(65, 255, 51, 1) 3%,
      rgba(4, 99, 30, 1) 60%,
      rgba(0, 0, 0, 0) 90%
    );
  }
  .power-off {
    opacity: .5;
    border-radius: 99px;
    background: linear-gradient(
      0deg,
      var(--color-pastel-red),
      var(--color-danger),
      var(--color-danger-600) 60%,
      rgba(0, 0, 0, 0)
    );
  }
  .power-off svg {
    transform: rotate(180deg);
  }
  .balls {
    max-width: 100px;
    width: 100%;
  }
  .section-header {
    text-align: center;
    padding-bottom: 1rem;
    border-bottom: 2px solid rgba(var(--color-light-rgb), 0.04);
  }
  .balls-list {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .ball-number {
    color: #fff;
    background-color: rgba(0, 0, 0, 0.3);
    text-align: center;
  }
  .selected {
    opacity: 1;
  }
  .selected:hover {
    opacity: 1 !important;
    cursor: unset;
  }
  .disabled {
    opacity: .5 !important;
    cursor: unset;
  }
  @media (min-width: 768px) {
    .balls {
      max-width: 350px;
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
