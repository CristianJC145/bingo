import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface GameStatsProps {
  balls: number[];
  isGameStarted: boolean;
}

const GameStats: React.FC<GameStatsProps> = ({ balls, isGameStarted }) => {
  const [gameTime, setGameTime] = useState<number>(0);
  const displayBalls = [...balls.slice(-5)];
  while (displayBalls.length < 5) {
    displayBalls.unshift(-1);
  }

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isGameStarted) {
        timer = setInterval(() => {
          setGameTime(prevTime => prevTime + 1);
        }, 1000);
    } else {
        setGameTime(0)
    }
    return () => clearInterval(timer);
  }, [isGameStarted]);

  return (
    <GameStatsStyle>
        <div className="bingo-header">
            <div className="header-title">
                <div>Control de Tiempo</div>
                <div>Balotas jugadas</div>
                <div>Últimas Balotas Cantadas</div>
            </div>
            <div className="header-content">
                <div className='box time'>{formatTime(gameTime)}</div>
                <div className="number-balls">
                    <div>{balls.length}</div>
                </div>  
                <div className="d-flex gap-2">
                    {displayBalls.map((ball, index) => (
                     console.log("balotas:", displayBalls),
                     <div key={index} className='ball'>
                       {ball === -1 ? '-' : ball}
                     </div>
                    ))}
                </div>  
            </div>
        </div>
    </GameStatsStyle>
  );
};

export default GameStats;
const GameStatsStyle = styled.div`
    .bingo-header {
        border-radius: 8px;
        padding: 0 var(--p-6);
        margin-bottom: 1rem;
    }
    .header-title {
        color: rgba(var(--color-light-rgb), .6);
        display: flex;
        justify-content: space-between;
        padding: 0 var(--p-4);
        font-size: small;
        margin-bottom: .5rem;
    }
    .header-content {
        display: flex;
        padding: 0 var(--p-4);
        justify-content: space-between;
        align-items: center;
        background: linear-gradient(130deg, #2c2a63, #3e3a83);
        border-radius: 8px;
        color: var(--color-light);
    }
    .box {
        display: flex;
        border-radius: 4px;
        border-style: solid;
        border-width: 3px;
    }
    .time {
        border-radius: 4px;
        padding: 0 var(--p-2);
        font-size: 1.5rem;
        font-weight: 700;
        border-image: conic-gradient(rgba(135, 123, 255, 1) 0%, rgb(44, 42, 99) 80%, rgba(96, 86, 238, 1) 100%) 2;
    }
    .number-balls {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 150px;
        height: 75px;
        border-bottom-left-radius: 999px;
        border-bottom-right-radius: 999px;
        background: linear-gradient(0deg, var(--color-pastel-red), var(--color-danger), var(--color-danger-600) 60%, rgba(0, 0, 0, 0));
    }
    .ball {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      width: 45px;
      height: 45px;
      background: linear-gradient(110deg, rgba(96, 86, 238, 1) 0%, rgba(135, 123, 255, 1) 100%);
      border: 3px solid rgba(50, 47, 125, 0.767);
    }
`
