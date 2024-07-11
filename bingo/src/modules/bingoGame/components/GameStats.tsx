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
          <div className="header-content">
              <div>
                <span>Control de Tiempo</span>
                <div className='box time'>{formatTime(gameTime)}</div>
              </div>
              <div>
                <span>Control de Tiempo</span>
                <div className="number-balls">
                    <h4 className="balls-total">{balls.length}</h4>
                </div>  
              </div>
              <div>
                <div>Últimas Balotas Cantadas</div>
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
        </div>
    </GameStatsStyle>
  );
};

export default GameStats;
const GameStatsStyle = styled.div`
  .bingo-header {
    border-radius: 8px;
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
    padding: 0 var(--p-6);
    justify-content: space-between;
    align-items: center;
    background-color: #1e1d49;
    border-radius: 8px;
    color: var(--color-light);
    height: 120px;
    overflow: hidden  ;
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
    position: relative;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 999px;
  }
  .number-balls::before {
    content: "";
    position: absolute;
    top: -7px;
    bottom: -7px;
    left: -7px;
    right: -7px;
    border-radius: 999px;
    border-bottom: 2px solid rgba(var(--color-light-rgb), .15);
    background: linear-gradient(0deg, rgba(80, 103, 218, 0.5) 50%, rgba(25, 66, 113, 0.5) 90%, rgba(0, 0, 0, 0));
    z-index: 2;
  }
  .number-balls::after {
    content: "";
    position: absolute;
    top: -15px;
    bottom: -15px;
    left: -15px;
    right: -15px;
    border-radius: 999px;
    background: linear-gradient(0deg, rgba(80, 103, 218, 0.3) 50%, rgba(25, 66, 113, 0.3) 90%, rgba(0, 0, 0, 0));
  }

  .balls-total {
    color: var(--color-light);
    display: flex;
    width: 100%;
    height: 100%;
    font-size: 1.75rem;
    font-weight: 700;
    z-index: 3;
    margin: 0;
    justify-content: center;
    align-items: center;
    background: linear-gradient(0deg, #5068da 60%, rgba(0, 0, 0, 0) 100%);
    border-radius: 999px;
    box-shadow: inset 0 -1px 1px rgba(var(--color-light-rgb), .5);
    z-index: 3;
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
