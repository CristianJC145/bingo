import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";

export interface ShowcaseFigure { id: number; name: string; pattern: boolean[][]; }

interface FigureShowcaseOverlayProps {
  figures: ShowcaseFigure[];
  /** Segundos totales que permanece visible antes de cerrarse solo. */
  seconds: number;
  onDone: () => void;
}

/**
 * Presenta la figura de la ronda a pantalla completa durante unos segundos,
 * para que el público entienda qué patrón hay que completar.
 */
const FigureShowcaseOverlay: React.FC<FigureShowcaseOverlayProps> = ({ figures, seconds, onDone }) => {
  const [isLeaving, setIsLeaving] = useState(false);

  // Con varias figuras se reparte el tiempo, pero cada una se ve lo suficiente.
  const visible = useMemo(() => figures.slice(0, 4), [figures]);

  useEffect(() => {
    setIsLeaving(false);
    const leaveAt = window.setTimeout(() => setIsLeaving(true), Math.max(600, seconds * 1000 - 500));
    const closeAt = window.setTimeout(onDone, Math.max(1000, seconds * 1000));
    return () => { window.clearTimeout(leaveAt); window.clearTimeout(closeAt); };
  }, [figures, seconds, onDone]);

  if (visible.length === 0) return null;

  return (
    <FigureShowcaseStyle className={`${isLeaving ? "is-leaving" : ""} count-${visible.length}`} aria-live="polite">
      <div className="showcase-glow" aria-hidden="true" />

      <header className="showcase-head">
        <span className="eyebrow"><AppIcon icon="vector-square" /> Figura de esta ronda</span>
        <strong>{visible.length === 1 ? visible[0].name : "Figuras en juego"}</strong>
      </header>

      <div className="figures-row">
        {visible.map((figure) => (
          <article className="figure-panel" key={figure.id}>
            <div className="figure-grid">
              <div className="letters">{["B", "I", "N", "G", "O"].map((letter) => <span key={letter}>{letter}</span>)}</div>
              <div className="cells">
                {figure.pattern.flatMap((row, rowIndex) => row.map((cell, cellIndex) => {
                  const isFree = rowIndex === 2 && cellIndex === 2;
                  return (
                    <span
                      className={isFree ? "free" : cell ? "active" : ""}
                      key={`${rowIndex}-${cellIndex}`}
                      style={{ "--delay": `${(rowIndex + cellIndex) * 45}ms` } as React.CSSProperties}
                    >
                      {isFree ? <AppIcon icon="star" /> : cell ? <i /> : ""}
                    </span>
                  );
                }))}
              </div>
            </div>
            {visible.length > 1 && <strong className="figure-label">{figure.name}</strong>}
          </article>
        ))}
      </div>

      <footer className="showcase-foot">
        <span className="hint">Completa este patrón en tu cartón para cantar bingo</span>
        <div className="timer" style={{ "--duration": `${seconds}s` } as React.CSSProperties}><i /></div>
      </footer>
    </FigureShowcaseStyle>
  );
};

export default FigureShowcaseOverlay;

const FigureShowcaseStyle = styled.div`
  /* El tamaño de la cuadrícula baja según cuántas figuras compartan la pantalla. */
  --grid-size: min(56vh, 56vw);
  &.count-2 { --grid-size: min(46vh, 34vw); }
  &.count-3 { --grid-size: min(38vh, 24vw); }
  &.count-4 { --grid-size: min(32vh, 19vw); }

  position: fixed;
  z-index: 70;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(1rem, 2.6vh, 2.2rem);
  inset: 0;
  padding: clamp(1rem, 3vh, 3rem);
  background: radial-gradient(circle at 50% 42%, rgba(38, 20, 74, .93), rgba(4, 5, 12, .97) 68%);
  backdrop-filter: blur(6px);
  animation: showcase-in .45s cubic-bezier(.2, .9, .3, 1.2);

  &.is-leaving { animation: showcase-out .5s ease forwards; }

  @keyframes showcase-in { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
  @keyframes showcase-out { to { opacity: 0; transform: scale(1.04); } }

  .showcase-glow {
    position: absolute;
    z-index: 0;
    width: min(90vw, 90vh);
    height: min(90vw, 90vh);
    background: radial-gradient(circle, rgba(124, 92, 255, .3), transparent 62%);
    filter: blur(40px);
    animation: breathe 3.4s ease-in-out infinite;
  }
  @keyframes breathe { 50% { transform: scale(1.12); opacity: .75; } }

  .showcase-head, .figures-row, .showcase-foot { position: relative; z-index: 1; }

  .showcase-head { display: flex; flex-direction: column; align-items: center; gap: .55rem; text-align: center; }
  .showcase-head .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    padding: .38rem .95rem;
    color: #ffd166;
    background: rgba(255, 209, 102, .1);
    border: 1px solid rgba(255, 209, 102, .3);
    border-radius: 99px;
    font-size: clamp(.6rem, 1.35vh, .95rem);
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
  }
  .showcase-head strong {
    color: #fff;
    font-family: "Poppins", sans-serif;
    font-size: clamp(1.6rem, 5.4vh, 4.2rem);
    font-weight: 700;
    line-height: 1.05;
    text-shadow: 0 0 26px rgba(168, 132, 255, .5);
  }

  .figures-row { display: flex; align-items: flex-start; justify-content: center; gap: clamp(1rem, 3vw, 3rem); }
  .figure-panel { display: flex; flex-direction: column; align-items: center; gap: .8rem; }

  .figure-grid {
    width: var(--grid-size);
    padding: calc(var(--grid-size) * .045);
    background: linear-gradient(160deg, #1b1338, #0b0817);
    border: calc(var(--grid-size) * .01) solid rgba(255, 209, 102, .45);
    border-radius: calc(var(--grid-size) * .06);
    box-shadow: 0 30px 70px rgba(0, 0, 0, .6), 0 0 0 calc(var(--grid-size) * .006) rgba(124, 92, 255, .3);
  }
  .letters, .cells { display: grid; grid-template-columns: repeat(5, 1fr); gap: calc(var(--grid-size) * .022); }
  .letters {
    margin-bottom: calc(var(--grid-size) * .028);
    color: #c8b3ff;
    font-family: "Poppins", sans-serif;
    font-size: calc(var(--grid-size) * .078);
    font-weight: 700;
    letter-spacing: .05em;
    text-align: center;
  }
  .cells span {
    display: grid;
    aspect-ratio: 1;
    place-items: center;
    background: rgba(255, 255, 255, .045);
    border: 1px solid rgba(255, 255, 255, .05);
    border-radius: calc(var(--grid-size) * .022);
  }
  /* Las casillas del patrón se encienden en cascada al aparecer. */
  .cells span.active {
    background: linear-gradient(150deg, #8a6bff, #5c3ce0);
    border-color: rgba(255, 255, 255, .22);
    box-shadow: 0 0 calc(var(--grid-size) * .05) rgba(124, 92, 255, .55);
    animation: cell-pop .4s backwards;
    animation-delay: var(--delay);
  }
  .cells span.active i {
    width: 38%;
    height: 38%;
    background: rgba(255, 255, 255, .92);
    border-radius: 50%;
  }
  .cells span.free { color: #ffd166; background: rgba(255, 209, 102, .12); border-color: rgba(255, 209, 102, .3); font-size: calc(var(--grid-size) * .06); }
  @keyframes cell-pop { from { opacity: 0; transform: scale(.55); } }

  .figure-label { color: #fff; font-size: clamp(.8rem, 2.1vh, 1.5rem); font-weight: 600; }

  .showcase-foot { display: flex; flex-direction: column; align-items: center; gap: .8rem; width: min(520px, 70vw); }
  .hint { color: rgba(255, 255, 255, .66); font-size: clamp(.68rem, 1.7vh, 1.15rem); text-align: center; }
  .timer { width: 100%; height: 5px; overflow: hidden; background: rgba(255, 255, 255, .1); border-radius: 99px; }
  .timer i {
    display: block;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, #ffd166, #ff8e53);
    border-radius: inherit;
    transform-origin: left;
    animation: timer-run var(--duration) linear forwards;
  }
  @keyframes timer-run { from { transform: scaleX(1); } to { transform: scaleX(0); } }
`;
