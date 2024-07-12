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
              <div className='d-flex flex-column align-items-center gap-2 justify-content-center'>
                <span>Control de Tiempo</span>
                <div className='box time'>{formatTime(gameTime)}</div>
              </div>
              <div className='content-balls-played'>
                <small className='balls-played-title'>Balotas Jugadas</small>
                <div className="number-balls">
                    <h4 className="balls-total">{balls.length}</h4>
                </div>  
              </div>
              <div className='d-flex flex-column align-items-center gap-2 justify-content-center'>
                <div>Últimas Balotas Cantadas</div>
                <div className="d-flex gap-2">
                    {displayBalls.map((ball, index) => (
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
    border-radius: 12px;
    margin-bottom: 1rem;
    max-width: 1500px;
    margin: 1rem auto;
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
    background-color: #1e1d49;
    border-radius: 8px;
    color: var(--color-light);
    height: 90px;
  }
  .content-balls-played {
    display: flex;
    position: relative;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    background: linear-gradient(110deg, #15143c 0%, rgba(0,0,0,0.05) 100%);
    width: 350px;
  }
  .balls-played-title {
    position: absolute;
    top: -25px;
    z-index: 3;
    margin-top: .325rem;
    font-size: .825rem;
  }
  .content-balls-played::after {
    content: "";
    position: absolute;
    right: 0;
    width: 0;
    height: 0;
    border-left: 50px solid transparent;
    border-right: 50px solid #1e1d49;
    border-bottom: 90px solid transparent;
  }
  .content-balls-played::before {
    content: "";
    position: absolute;
    left: 0;
    width: 0;
    height: 0;
    border-right: 50px solid transparent;
    border-top: 90px solid #1e1d49;
  }
  .box {
    display: flex;
    border-radius: 4px;
    border-style: solid;
    border-width: 3px;
  }
  .time {
    border-radius: 4px;
    padding: 0 var(--p-5);
    font-size: 1.5rem;
    font-weight: 700;
    border-image: conic-gradient(rgba(135, 123, 255, 1) 0%, rgb(44, 42, 99) 80%, rgba(96, 86, 238, 1) 100%) 2;
  }
  .number-balls {
    display: flex;
    position: relative;
    justify-content: center;
    align-items: center;
    width: 70px;
    height: 70px;
    border-radius: 999px;
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
    background: radial-gradient(circle at 70% 10%, #ffffff, #6056ee 25%, #1d1c48 60%, #2d0f4b8a 90%);    border-radius: 999px;
    border: 3px solid rgb(119 183 206);
    box-shadow: 0 -1px 8px 3px rgb(99, 96, 255);
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
