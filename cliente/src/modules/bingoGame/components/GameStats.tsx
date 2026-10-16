import React, { useEffect, useState } from "react";
import styled from "styled-components";

interface GameStatsProps { balls: number[]; isGameStarted: boolean; startedAt?: number | null; }

const GameStats: React.FC<GameStatsProps> = ({ balls, isGameStarted, startedAt }) => {
  const [gameTime, setGameTime] = useState(() => (startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0));
  const recentBalls = balls.slice(-5).reverse();

  useEffect(() => {
    if (!isGameStarted) { setGameTime(0); return; }
    const timer = window.setInterval(() => setGameTime((time) => time + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isGameStarted]);

  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return [hours, minutes, seconds].map((value) => value.toString().padStart(2, "0")).join(":");
  };

  return (
    <GameStatsStyle>
      <div className="stats-grid">
        <div className="stat-item"><span className="stat-kicker">Tiempo de partida</span><strong>{formatTime(gameTime)}</strong><small>{isGameStarted ? "Cronómetro activo" : "En espera"}</small></div>
        <div className="stat-item primary-stat"><span className="stat-kicker">Balotas jugadas</span><div><strong>{balls.length}</strong><span>/ 75</span></div><small>{Math.round((balls.length / 75) * 100)}% del tablero</small></div>
        <div className="stat-item recent-stat"><span className="stat-kicker">Últimas cantadas</span><div className="recent-balls">{Array.from({ length: 5 }, (_, index) => <span className={recentBalls[index] ? "filled" : ""} key={index}>{recentBalls[index] ?? "—"}</span>)}</div><small>La más reciente aparece primero</small></div>
      </div>
    </GameStatsStyle>
  );
};

export default GameStats;

const GameStatsStyle = styled.div`
  margin-bottom: 1rem;
  .stats-grid { display: grid; grid-template-columns: .9fr .7fr 1.4fr; overflow: hidden; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 18px; box-shadow: var(--shadow-panel); }
  .stat-item { position: relative; display: flex; min-height: 84px; flex-direction: column; justify-content: center; padding: .85rem 1.25rem; border-right: 1px solid var(--border-subtle); }
  .stat-item:last-child { border-right: 0; }
  .stat-kicker { color: var(--text-muted); font-size: .65rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .stat-item strong { margin-top: .35rem; color: var(--text-primary); font-family: "Poppins", sans-serif; font-size: 1.4rem; letter-spacing: .03em; }
  .stat-item small { margin-top: .25rem; color: var(--text-muted); font-size: .62rem; }
  .primary-stat { background: linear-gradient(145deg, rgba(124,92,255,.13), rgba(124,92,255,.025)); }
  .primary-stat > div { display: flex; align-items: baseline; gap: .3rem; }
  .primary-stat strong { font-size: 2rem; }
  .primary-stat > div span { color: #8173bc; font-size: .75rem; font-weight: 700; }
  .recent-balls { display: flex; gap: .42rem; margin-top: .55rem; }
  .recent-balls span { display: grid; width: 32px; height: 32px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 9px; font-size: .7rem; font-weight: 700; }
  .recent-balls span.filled { color: #18130a; background: linear-gradient(145deg, #ffd27d, #f0a438); border-color: transparent; }
  @media (max-width: 720px) { .stats-grid { grid-template-columns: 1fr 1fr; } .recent-stat { grid-column: span 2; border-top: 1px solid var(--border-subtle); } .stat-item { min-height: 94px; } }
`;
