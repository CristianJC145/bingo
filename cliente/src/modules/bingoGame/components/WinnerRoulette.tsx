import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { RouletteCandidate } from "../services/winnerRoulette.service";
import { playPegHit, playRouletteLaunch, playRouletteWin, primeRouletteAudio } from "../utils/rouletteAudio";

interface WinnerRouletteProps {
  candidates: RouletteCandidate[];
  /** Puesto sorteado por el servidor; null mientras nadie ha girado. */
  winnerIndex: number | null;
  /** Marca de tiempo del giro: al cambiar, la rueda vuelve a lanzarse. */
  spunAt: number | null;
  durationMs: number;
  withSound?: boolean;
  /** Reconexión a mitad de sorteo: se muestra el resultado sin repetir la animación. */
  startResolved?: boolean;
}

/** Paleta de sectores; los tonos contiguos siempre contrastan entre sí. */
const SECTOR_COLORS = [
  { top: "#e8213b", bottom: "#8d0716", edge: "#ff8f9c" },
  { top: "#1f7ff0", bottom: "#0a3d84", edge: "#8ec6ff" },
  { top: "#f2b511", bottom: "#9a6802", edge: "#ffe08a" },
  { top: "#12a184", bottom: "#04594a", edge: "#6ff0d4" },
  { top: "#8d33cf", bottom: "#4a1178", edge: "#d69dff" },
  { top: "#ef6a13", bottom: "#8e3703", edge: "#ffb677" },
];

/** Vueltas completas antes de frenar: dan sensación de sorteo largo. */
const FULL_TURNS = 7;
const WHEEL_VIEWBOX = 400;
const CENTER = WHEEL_VIEWBOX / 2;
const RADIUS = 186;
const OUTER_BULBS = 48;
const INNER_BULBS = 24;
const CONFETTI_PIECES = 44;
const SPARKLES = 14;
/** Desvío máximo del fiel al ser empujado por un tope. */
const FLAPPER_MAX_DEG = 27;
/** Tope de golpes por fotograma: más allá de esto no se distinguirían de todos modos. */
const MAX_PEGS_PER_FRAME = 4;
const FRAME_SECONDS = 1 / 60;

/**
 * Frenada de la rueda. Arranca muy rápido y deja una cola larga, que es lo que
 * permite oír cómo se separan los golpes del fiel al final.
 */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4.2);

const polar = (angleDeg: number, radius: number) => {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
};

/** Sector circular como path SVG, medido en grados desde arriba. */
const sectorPath = (startDeg: number, endDeg: number, radius: number) => {
  const start = polar(startDeg, radius);
  const end = polar(endDeg, radius);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
};

/** Nombre corto del titular; vacío cuando el cartón no tiene registro. */
const shortName = (candidate: RouletteCandidate): string => {
  const name = candidate.nombreCompleto?.trim();
  if (!name) return "";
  const first = name.split(/\s+/)[0];
  return first.length > 11 ? `${first.slice(0, 10)}…` : first;
};

const cardLabel = (cardNumber: number): string => String(cardNumber).padStart(4, "0");

const WinnerRoulette: React.FC<WinnerRouletteProps> = ({
  candidates, winnerIndex, spunAt, durationMs, withSound = true, startResolved = false,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [revealed, setRevealed] = useState(startResolved);
  const [pointerIndex, setPointerIndex] = useState(winnerIndex ?? 0);
  const spinRef = useRef<number | null>(null);
  /*
   * El giro se anima por fotograma en vez de con una transición CSS. Es la única forma
   * de conocer el ángulo exacto en cada instante y poder golpear el fiel —y hacer
   * sonar el tope— justo cuando un separador pasa por debajo de la aguja.
   */
  const wheelRef = useRef<HTMLDivElement>(null);
  const flapperRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number>();

  const sliceAngle = 360 / Math.max(1, candidates.length);

  /** Giro que deja el puesto ganador bajo el fiel (arriba, a 0°). */
  const targetRotation = useMemo(() => {
    if (winnerIndex === null) return 0;
    const sectorCenter = winnerIndex * sliceAngle + sliceAngle / 2;
    return FULL_TURNS * 360 + (360 - sectorCenter);
  }, [winnerIndex, sliceAngle]);

  /** Confeti y destellos se generan una vez: recalcularlos haría saltar la animación. */
  const confetti = useMemo(
    () => Array.from({ length: CONFETTI_PIECES }, (_, index) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2.2,
      duration: 2.6 + Math.random() * 2.4,
      drift: -60 + Math.random() * 120,
      spin: 360 + Math.random() * 720,
      size: 6 + Math.random() * 8,
      color: SECTOR_COLORS[index % SECTOR_COLORS.length].top,
      round: index % 3 === 0,
    })),
    []
  );

  const sparkles = useMemo(
    () => Array.from({ length: SPARKLES }, () => ({
      angle: Math.random() * 360,
      // Fracción del diámetro: quedan justo fuera del aro de bombillas.
      distance: (0.5 + Math.random() * 0.09).toFixed(3),
      delay: Math.random() * 1.6,
      scale: 0.55 + Math.random() * 0.8,
    })),
    []
  );

  useEffect(() => { if (withSound) primeRouletteAudio(); }, [withSound]);

  /** Coloca rueda y fiel sin pasar por React: se actualizan 60 veces por segundo. */
  const paint = (angle: number, flapperDeg: number) => {
    if (wheelRef.current) wheelRef.current.style.transform = `rotate(${angle}deg)`;
    if (flapperRef.current) flapperRef.current.style.transform = `rotate(${flapperDeg}deg)`;
  };

  useEffect(() => {
    const stop = () => { if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current); };

    // Sin giro nuevo no hay nada que animar; una reconexión ya llega revelada.
    if (spunAt === null || winnerIndex === null) { paint(0, 0); setPointerIndex(0); setRevealed(false); return stop; }
    if (startResolved) { paint(targetRotation, 0); setPointerIndex(winnerIndex); setRevealed(true); setIsSpinning(false); return stop; }
    if (spinRef.current === spunAt) return stop;

    spinRef.current = spunAt;
    setRevealed(false);
    setIsSpinning(true);
    if (withSound) playRouletteLaunch();

    const startedAt = performance.now();
    let lastPeg = 0;
    let previousAngle = 0;

    const step = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const angle = targetRotation * easeOut(progress);

      /*
       * La aguja está fija arriba (0°) y los separadores se sitúan en múltiplos del
       * sector. Cada vez que el ángulo cruza un múltiplo, un tope acaba de pasar.
       */
      const peg = Math.floor(angle / sliceAngle);
      const currentPointerIndex = Math.floor(((360 - (angle % 360)) % 360) / sliceAngle) % candidates.length;
      const degreesPerFrame = angle - previousAngle;
      previousAngle = angle;

      if (peg > lastPeg) {
        if (withSound) {
          // Velocidad normalizada: el golpe suena más agudo cuando la rueda va lanzada.
          const speed = Math.min(1, degreesPerFrame / 45);
          // A plena velocidad puede cruzarse más de un tope por fotograma: suenan todos,
          // repartidos dentro del fotograma para que no colapsen en un único chasquido.
          const crossings = Math.min(peg - lastPeg, MAX_PEGS_PER_FRAME);
          const stagger = FRAME_SECONDS / Math.max(1, crossings);
          for (let hit = 0; hit < crossings; hit++) playPegHit(speed, hit * stagger);
        }
        lastPeg = peg;
        setPointerIndex(currentPointerIndex);
      }

      /*
       * El fiel salta al pasar el tope y vuelve solo antes del siguiente. El desvío se
       * atenúa con la velocidad para que quede recto cuando la rueda ya paró.
       */
      const sinceePeg = angle / sliceAngle - peg;
      const speedFactor = Math.min(1, degreesPerFrame / 12);
      const flapperDeg = FLAPPER_MAX_DEG * Math.pow(1 - sinceePeg, 2.4) * speedFactor;

      paint(angle, flapperDeg);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
        return;
      }
      paint(targetRotation, 0);
      setPointerIndex(winnerIndex);
      setIsSpinning(false);
      setRevealed(true);
      if (withSound) playRouletteWin();
    };

    frameRef.current = requestAnimationFrame(step);
    return stop;
  }, [spunAt, winnerIndex, targetRotation, durationMs, sliceAngle, withSound, startResolved, candidates.length]);

  const winner = winnerIndex !== null ? candidates[winnerIndex] : null;
  // Con muchos sectores el hueco se estrecha y el número tiene que ceder.
  const numberSize = Math.max(11, Math.min(24, sliceAngle * 0.55));
  const nameSize = Math.max(7, Math.min(13, sliceAngle * 0.3));

  return (
    <WinnerRouletteStyle className={`${isSpinning ? "is-spinning" : ""} ${revealed ? "is-revealed" : ""}`}>
      {/* --- Fondo: rayos, focos y orbes --- */}
      <div className="bg-rays" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />
      <div className="spotlights" aria-hidden="true"><i /><i /><i /></div>
      <div className="orbs" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</div>
      <div className="vignette" aria-hidden="true" />

      {revealed && (
        <div className="confetti" aria-hidden="true">
          {confetti.map((piece, index) => (
            <i
              key={index}
              className={piece.round ? "round" : ""}
              style={{
                left: `${piece.left}%`,
                width: `${piece.size}px`,
                height: `${piece.size * (piece.round ? 1 : 1.7)}px`,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                ["--drift" as string]: `${piece.drift}px`,
                ["--spin" as string]: `${piece.spin}deg`,
              }}
            />
          ))}
        </div>
      )}

      <header className="roulette-head">
        <div className="marquee-lights" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div>
        <span className="eyebrow"><AppIcon icon="trophy" /> Empate a {candidates.length} cartones</span>
        <h1 data-text="RULETA DEL GANADOR">RULETA DEL GANADOR</h1>
        <p>{revealed ? "¡Tenemos un único ganador!" : isSpinning ? "Girando…" : "El premio se sortea entre los cartones empatados"}</p>
      </header>

      <main className="roulette-main">
      <section className="wheel-column">
      <div className="wheel-area">
        {/* Destellos alrededor del conjunto mientras gira. */}
        <div className="sparkles" aria-hidden="true">
          {sparkles.map((sparkle, index) => (
            <i
              key={index}
              style={{
                transform: `rotate(${sparkle.angle}deg) translateY(calc(var(--wheel) * -${sparkle.distance})) scale(${sparkle.scale})`,
                animationDelay: `${sparkle.delay}s`,
              }}
            />
          ))}
        </div>

        <div className="wheel-frame">
          {/* Dos coronas de bombillas persiguiéndose en sentidos opuestos. */}
          <div className="bulb-ring outer" aria-hidden="true">
            {Array.from({ length: OUTER_BULBS }, (_, index) => (
              <i
                key={index}
                className={`c${index % 3}`}
                style={{
                  // El desplazamiento va en fracción del diámetro, no en % del propio punto.
                  transform: `rotate(${(index * 360) / OUTER_BULBS}deg) translateY(calc(var(--wheel) * -0.478))`,
                  animationDelay: `${(index / OUTER_BULBS) * 1.2}s`,
                }}
              />
            ))}
          </div>
          <div className="bulb-ring inner" aria-hidden="true">
            {Array.from({ length: INNER_BULBS }, (_, index) => (
              <i
                key={index}
                style={{
                  transform: `rotate(${(index * 360) / INNER_BULBS}deg) translateY(calc(var(--wheel) * -0.448))`,
                  animationDelay: `${(1 - index / INNER_BULBS) * 0.9}s`,
                }}
              />
            ))}
          </div>

          <div className="bezel">
            <div className="bezel-shine" aria-hidden="true" />

            <div className="wheel" ref={wheelRef}>
              <svg viewBox={`0 0 ${WHEEL_VIEWBOX} ${WHEEL_VIEWBOX}`} width="100%" height="100%">
                <defs>
                  {SECTOR_COLORS.map((color, index) => (
                    <linearGradient id={`sector-${index}`} key={index} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color.top} />
                      <stop offset="100%" stopColor={color.bottom} />
                    </linearGradient>
                  ))}
                  <radialGradient id="wheelDepth" cx="50%" cy="50%">
                    <stop offset="55%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,.4)" />
                  </radialGradient>
                </defs>

                {candidates.map((candidate, index) => {
                  const start = index * sliceAngle;
                  const labelAngle = start + sliceAngle / 2;
                  // En la mitad inferior el texto se voltea para poder leerse.
                  const flip = labelAngle > 90 && labelAngle < 270;
                  const textAngle = labelAngle + (flip ? 180 : 0);
                  const numberPos = polar(labelAngle, RADIUS * 0.68);
                  const namePos = polar(labelAngle, RADIUS * 0.44);
                  const name = shortName(candidate);
                  const isWinnerSector = revealed && index === winnerIndex;

                  return (
                    <g key={candidate.cardNumber} className={`sector ${isWinnerSector ? "winner" : ""}`}>
                      <path d={sectorPath(start, start + sliceAngle, RADIUS)} fill={`url(#sector-${index % SECTOR_COLORS.length})`} />
                      {/* Separador biselado entre sectores. */}
                      <line
                        x1={CENTER} y1={CENTER}
                        x2={polar(start, RADIUS).x} y2={polar(start, RADIUS).y}
                        stroke="rgba(255,224,138,.75)" strokeWidth="1.6"
                      />
                      <circle cx={polar(start, RADIUS - 7).x} cy={polar(start, RADIUS - 7).y} r="3" fill="#ffe08a" stroke="#8a5c03" strokeWidth=".8" />

                      <text
                        x={numberPos.x} y={numberPos.y}
                        transform={`rotate(${textAngle} ${numberPos.x} ${numberPos.y})`}
                        textAnchor="middle" dominantBaseline="middle"
                        className="sector-number" style={{ fontSize: `${numberSize}px` }}
                      >
                        {cardLabel(candidate.cardNumber)}
                      </text>
                      {name && candidates.length <= 12 && (
                        <text
                          x={namePos.x} y={namePos.y}
                          transform={`rotate(${textAngle} ${namePos.x} ${namePos.y})`}
                          textAnchor="middle" dominantBaseline="middle"
                          className="sector-name" style={{ fontSize: `${nameSize}px` }}
                        >
                          {name}
                        </text>
                      )}
                      {isWinnerSector && (
                        <path className="winner-flash" d={sectorPath(start, start + sliceAngle, RADIUS)} fill="rgba(255,255,255,.55)" />
                      )}
                    </g>
                  );
                })}

                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#wheelDepth)" />
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="#ffd166" strokeWidth="3.5" />
              </svg>
            </div>

            {/* Reflejo fijo: no gira con la rueda, como el cristal de una máquina. */}
            <div className="gloss" aria-hidden="true" />
            {isSpinning && <div className="speed-blur" aria-hidden="true" />}
            {revealed && <div className="winner-rays" aria-hidden="true" />}

            {/*
              Fiel montado sobre el borde y apuntando hacia dentro: no sobresale de la
              rueda y su punta llega solo al filo de los sectores, sin tapar los números.
            */}
            <div className="flapper-mount" aria-hidden="true">
              <span className="flapper" ref={flapperRef}>
                <svg viewBox="0 0 40 72" width="100%" height="100%">
                  <path d="M20 68 L11.5 30 L28.5 30 Z" fill="url(#flapBlade)" stroke="#7a4a03" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M20 64 L16 32 L20 32 Z" fill="rgba(255,255,255,.5)" />
                  <circle cx="20" cy="20" r="15" fill="url(#flapKnob)" stroke="#6b3f02" strokeWidth="1.8" />
                  <circle cx="20" cy="20" r="8" fill="url(#flapKnobInner)" stroke="rgba(122,74,3,.55)" strokeWidth="1" />
                  <circle cx="15.5" cy="14.5" r="3.4" fill="rgba(255,255,255,.8)" />
                  <defs>
                    <linearGradient id="flapBlade" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#c98b08" /><stop offset="42%" stopColor="#fff3c4" /><stop offset="100%" stopColor="#b87c05" />
                    </linearGradient>
                    <radialGradient id="flapKnob" cx="32%" cy="26%">
                      <stop offset="0%" stopColor="#fffdf2" /><stop offset="52%" stopColor="#ffd35c" /><stop offset="100%" stopColor="#a86f04" />
                    </radialGradient>
                    <radialGradient id="flapKnobInner" cx="36%" cy="30%">
                      <stop offset="0%" stopColor="#fff8dc" /><stop offset="100%" stopColor="#e0a416" />
                    </radialGradient>
                  </defs>
                </svg>
              </span>
            </div>
          </div>

          <div className="hub" aria-hidden="true">
            <span className="hub-star"><AppIcon icon="star" /></span>
            <span className="hub-label">ASODIFI</span>
          </div>
        </div>
      </div>
      <div className="wheel-pedestal" aria-hidden="true"><span /><strong>ASODIFI</strong><span /></div>
      </section>

      <aside className="contestant-deck">
        <header className="deck-head">
          <span>FINALISTAS EN JUEGO</span>
          <strong>{candidates.length}</strong>
        </header>

        <div className={`candidate-board count-${Math.min(candidates.length, 12)}`}>
          {candidates.map((candidate, index) => (
            <article
              className={`candidate-card ${isSpinning && pointerIndex === index ? "is-current" : ""} ${revealed && winnerIndex === index ? "is-winner" : ""}`}
              key={candidate.cardNumber}
            >
              <span className="candidate-position">{String(index + 1).padStart(2, "0")}</span>
              <div><small>CARTÓN</small><strong>{cardLabel(candidate.cardNumber)}</strong></div>
              <p>{candidate.nombreCompleto || "Participante registrado"}</p>
              {candidate.municipioLabel && <em>{candidate.municipioLabel}</em>}
              <i className="candidate-light" />
            </article>
          ))}
        </div>

        {!revealed && (
          <div className={`roulette-status ${isSpinning ? "is-live" : ""}`}>
            <span className="status-icon"><AppIcon icon={isSpinning ? "rotate" : "trophy"} /></span>
            <div><small>{isSpinning ? "SELECCIÓN EN CURSO" : "SORTEO PREPARADO"}</small><strong>{isSpinning ? `Apuntando al cartón ${cardLabel(candidates[pointerIndex]?.cardNumber ?? 0)}` : "Esperando orden del administrador"}</strong></div>
            <i />
          </div>
        )}

        {revealed && winner && (
          <footer className="winner-banner">
            <span className="banner-shine" aria-hidden="true" />
            <span className="winner-crown"><AppIcon icon="trophy" /></span>
            <span className="banner-label">CARTÓN SELECCIONADO</span>
            <strong>{cardLabel(winner.cardNumber)}</strong>
            {winner.nombreCompleto && <em>{winner.nombreCompleto}</em>}
            {winner.municipioLabel && <small>{winner.municipioLabel}</small>}
          </footer>
        )}
      </aside>
      </main>

      <footer className="stage-footer" aria-hidden="true"><span /><i /><i /><i /><span /></footer>
    </WinnerRouletteStyle>
  );
};

export default WinnerRoulette;

const WinnerRouletteStyle = styled.div`
  position: fixed;
  z-index: 75;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(.6rem, 1.8vh, 1.8rem);
  inset: 0;
  overflow: hidden;
  padding: clamp(.6rem, 2vh, 2.2rem);
  background: radial-gradient(circle at 50% 44%, #3a1566 0%, #170a28 52%, #050308 100%);

  /* ---- Fondo ---- */
  .bg-rays {
    position: absolute;
    z-index: 0;
    width: 260vmax;
    height: 260vmax;
    background: repeating-conic-gradient(from 0deg, rgba(255, 209, 102, .085) 0deg 6deg, transparent 6deg 12deg);
    animation: sweep 52s linear infinite;
  }
  @keyframes sweep { to { transform: rotate(360deg); } }

  .bg-glow {
    position: absolute;
    z-index: 0;
    width: min(100vh, 100vw);
    height: min(100vh, 100vw);
    background: radial-gradient(circle, rgba(255, 209, 102, .2), rgba(214, 60, 140, .1) 45%, transparent 66%);
    filter: blur(46px);
    animation: pulse-glow 3.4s ease-in-out infinite;
  }
  @keyframes pulse-glow { 50% { transform: scale(1.12); opacity: .68; } }

  /* Tres focos barriendo el escenario a ritmos distintos. */
  .spotlights { position: absolute; z-index: 0; inset: 0; overflow: hidden; }
  .spotlights i {
    position: absolute;
    bottom: -30%;
    left: 50%;
    width: 26vmax;
    height: 150vmax;
    background: linear-gradient(to top, rgba(255, 240, 190, .16), transparent 72%);
    clip-path: polygon(42% 100%, 58% 100%, 100% 0, 0 0);
    transform-origin: 50% 100%;
    mix-blend-mode: screen;
  }
  .spotlights i:nth-child(1) { animation: swing-a 11s ease-in-out infinite; }
  .spotlights i:nth-child(2) { background: linear-gradient(to top, rgba(255, 120, 190, .14), transparent 72%); animation: swing-b 14s ease-in-out infinite; }
  .spotlights i:nth-child(3) { background: linear-gradient(to top, rgba(130, 190, 255, .13), transparent 72%); animation: swing-c 9s ease-in-out infinite; }
  @keyframes swing-a { 0%, 100% { transform: translateX(-50%) rotate(-26deg); } 50% { transform: translateX(-50%) rotate(22deg); } }
  @keyframes swing-b { 0%, 100% { transform: translateX(-50%) rotate(30deg); } 50% { transform: translateX(-50%) rotate(-18deg); } }
  @keyframes swing-c { 0%, 100% { transform: translateX(-50%) rotate(-8deg); } 50% { transform: translateX(-50%) rotate(14deg); } }

  .orbs { position: absolute; z-index: 0; inset: 0; }
  .orbs i {
    position: absolute;
    width: 10px;
    height: 10px;
    background: radial-gradient(circle, #fff3c4, rgba(255, 200, 80, 0) 68%);
    border-radius: 50%;
    animation: float-orb 9s ease-in-out infinite;
  }
  .orbs i:nth-child(1) { top: 14%; left: 8%; animation-delay: 0s; }
  .orbs i:nth-child(2) { top: 68%; left: 5%; animation-delay: 1.1s; }
  .orbs i:nth-child(3) { top: 32%; left: 92%; animation-delay: 2.2s; }
  .orbs i:nth-child(4) { top: 82%; left: 88%; animation-delay: .6s; }
  .orbs i:nth-child(5) { top: 8%; left: 74%; animation-delay: 3.1s; }
  .orbs i:nth-child(6) { top: 90%; left: 42%; animation-delay: 1.8s; }
  .orbs i:nth-child(7) { top: 22%; left: 30%; animation-delay: 4s; }
  .orbs i:nth-child(8) { top: 58%; left: 96%; animation-delay: 2.6s; }
  .orbs i:nth-child(9) { top: 46%; left: 3%; animation-delay: 3.6s; }
  @keyframes float-orb { 0%, 100% { opacity: .25; transform: translateY(0) scale(1); } 50% { opacity: 1; transform: translateY(-22px) scale(1.5); } }

  .vignette { position: absolute; z-index: 0; inset: 0; background: radial-gradient(circle at 50% 46%, transparent 52%, rgba(0, 0, 0, .62) 100%); }

  /* ---- Confeti al revelar ---- */
  .confetti { position: absolute; z-index: 4; inset: 0; overflow: hidden; pointer-events: none; }
  .confetti i {
    position: absolute;
    top: -6%;
    border-radius: 2px;
    animation: confetti-fall linear forwards;
  }
  .confetti i.round { border-radius: 50%; }
  @keyframes confetti-fall {
    from { opacity: 1; transform: translate(0, 0) rotate(0); }
    to { opacity: .1; transform: translate(var(--drift), 112vh) rotate(var(--spin)); }
  }

  .roulette-head, .wheel-area, .winner-banner { position: relative; z-index: 2; }

  /* ---- Título ---- */
  .roulette-head { display: flex; flex-direction: column; align-items: center; gap: .45rem; text-align: center; }
  .roulette-head .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    padding: .3rem .9rem;
    color: #ffd166;
    background: rgba(255, 209, 102, .12);
    border: 1px solid rgba(255, 209, 102, .38);
    border-radius: 99px;
    box-shadow: 0 0 18px rgba(255, 209, 102, .22);
    font-size: clamp(.52rem, 1.25vh, .86rem);
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
  }
  .roulette-head h1 {
    position: relative;
    margin: 0;
    background: linear-gradient(180deg, #fff8dc 0%, #ffd85e 44%, #ef9f1c 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-family: "Poppins", sans-serif;
    font-size: clamp(1.4rem, 4.7vh, 3.6rem);
    font-weight: 800;
    letter-spacing: .045em;
    line-height: 1;
    filter: drop-shadow(0 4px 14px rgba(255, 190, 60, .55));
    animation: title-beat 2.6s ease-in-out infinite;
  }
  /* Brillo que recorre el título de izquierda a derecha. */
  .roulette-head h1::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, .95) 50%, transparent 62%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    content: attr(data-text);
    animation: title-shine 3.6s ease-in-out infinite;
  }
  @keyframes title-beat { 50% { transform: scale(1.028); } }
  @keyframes title-shine { 0%, 100% { background-position: -220% 0; } 55% { background-position: 220% 0; } }
  .roulette-head h1, .roulette-head h1::after { background-size: 220% 100%; }
  .roulette-head p { margin: 0; color: rgba(255, 255, 255, .72); font-size: clamp(.62rem, 1.6vh, 1.05rem); }

  /* ---- Conjunto de la rueda ---- */
  .wheel-area { --wheel: min(60vh, 60vw); display: grid; width: var(--wheel); place-items: center; }

  .sparkles { position: absolute; inset: 0; opacity: 0; transition: opacity .3s ease; }
  &.is-spinning .sparkles, &.is-revealed .sparkles { opacity: 1; }
  .sparkles i {
    position: absolute;
    top: 50%;
    left: 50%;
    width: calc(var(--wheel) * .05);
    height: calc(var(--wheel) * .05);
    margin: calc(var(--wheel) * -.025) 0 0 calc(var(--wheel) * -.025);
    background: conic-gradient(from 0deg, transparent 0deg, #fff6d0 8deg, transparent 16deg, transparent 90deg, #fff6d0 98deg, transparent 106deg, transparent 180deg, #fff6d0 188deg, transparent 196deg, transparent 270deg, #fff6d0 278deg, transparent 286deg);
    transform-origin: 50% 50%;
    animation: twinkle 1.5s ease-in-out infinite;
  }
  @keyframes twinkle { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

  /*
   * El fiel vive dentro del bisel: su eje queda sobre el aro y la hoja entra hacia el
   * centro. El giro que recibe por fotograma pivota justo en ese eje.
   */
  .flapper-mount {
    position: absolute;
    top: calc(var(--wheel) * -.006);
    left: 50%;
    z-index: 4;
    width: calc(var(--wheel) * .078);
    margin-left: calc(var(--wheel) * -.039);
    pointer-events: none;
  }
  .flapper {
    display: block;
    width: 100%;
    filter: drop-shadow(0 3px 7px rgba(0, 0, 0, .65));
    /* El pivote coincide con el centro del eje dorado del SVG (20/40, 20/72). */
    transform-origin: 50% 27.8%;
  }
  .flapper svg { display: block; width: 100%; height: auto; }

  .wheel-frame { position: relative; display: grid; width: var(--wheel); height: var(--wheel); place-items: center; }

  /*
   * Coronas de bombillas. Cada punto nace en el centro y se empuja hacia fuera con
   * translateY sobre una fracción del diámetro: así el radio no depende del tamaño
   * del propio punto y el anillo queda concéntrico con la rueda.
   */
  .bulb-ring { position: absolute; inset: 0; }
  .bulb-ring i {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    animation: bulb-chase 1.2s linear infinite;
  }
  .bulb-ring.outer i {
    width: calc(var(--wheel) * .026);
    height: calc(var(--wheel) * .026);
    margin: calc(var(--wheel) * -.013) 0 0 calc(var(--wheel) * -.013);
  }
  .bulb-ring.outer i.c0 { background: #ffe08a; box-shadow: 0 0 calc(var(--wheel) * .03) rgba(255, 203, 84, .95); }
  .bulb-ring.outer i.c1 { background: #fff6ff; box-shadow: 0 0 calc(var(--wheel) * .03) rgba(255, 255, 255, .9); }
  .bulb-ring.outer i.c2 { background: #ff9ec7; box-shadow: 0 0 calc(var(--wheel) * .03) rgba(255, 120, 180, .9); }
  .bulb-ring.inner i {
    width: calc(var(--wheel) * .015);
    height: calc(var(--wheel) * .015);
    margin: calc(var(--wheel) * -.0075) 0 0 calc(var(--wheel) * -.0075);
    background: #fff4cf;
    box-shadow: 0 0 calc(var(--wheel) * .018) rgba(255, 240, 190, .9);
    animation-duration: .9s;
    animation-name: bulb-chase-soft;
  }
  /*
   * Las animaciones solo tocan la opacidad y el filtro: el transform en línea es lo
   * que coloca cada bombilla en su ángulo, y una animación sobre él lo sobreescribiría.
   */
  @keyframes bulb-chase { 0%, 74% { opacity: .16; filter: brightness(.6); } 10% { opacity: 1; filter: brightness(1.5); } }
  @keyframes bulb-chase-soft { 0%, 70% { opacity: .2; } 14% { opacity: 1; } }
  .bulb-ring i { will-change: opacity; }

  .bezel {
    position: relative;
    display: grid;
    width: calc(var(--wheel) * .86);
    height: calc(var(--wheel) * .86);
    place-items: center;
    padding: calc(var(--wheel) * .026);
    background:
      conic-gradient(from 210deg, #6b4a12, #ffe9a8 12%, #b98a1c 26%, #6b4a12 40%, #ffe9a8 55%, #a8791a 70%, #6b4a12 84%, #ffe9a8 96%, #6b4a12);
    border-radius: 50%;
    box-shadow:
      0 0 0 calc(var(--wheel) * .008) #2b1208,
      inset 0 0 calc(var(--wheel) * .03) rgba(0, 0, 0, .6),
      0 26px 70px rgba(0, 0, 0, .7);
  }
  /* Reflejo que recorre el aro metálico. */
  .bezel-shine {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, .5) 18deg, transparent 44deg);
    border-radius: 50%;
    mix-blend-mode: overlay;
    animation: bezel-turn 5.5s linear infinite;
  }
  @keyframes bezel-turn { to { transform: rotate(360deg); } }

  .wheel {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    /* El ángulo lo escribe el bucle de animación: sin transición que lo suavice. */
    transform-origin: 50% 50%;
    will-change: transform;
  }
  .wheel svg { display: block; width: 100%; height: 100%; }

  .sector-number {
    fill: #fff;
    font-family: "Poppins", sans-serif;
    font-weight: 800;
    paint-order: stroke;
    stroke: rgba(0, 0, 0, .5);
    stroke-width: 3.4px;
  }
  .sector-name { fill: rgba(255, 255, 255, .88); font-weight: 600; paint-order: stroke; stroke: rgba(0, 0, 0, .35); stroke-width: 2.4px; }
  .sector.winner path:first-of-type { filter: brightness(1.4) saturate(1.2); }
  .winner-flash { animation: winner-flash 1.05s ease-out infinite; }
  @keyframes winner-flash { 0% { opacity: .75; } 100% { opacity: 0; } }

  /* Cristal fijo sobre la rueda. */
  .gloss {
    position: absolute;
    z-index: 2;
    inset: calc(var(--wheel) * .026);
    background:
      radial-gradient(ellipse 62% 40% at 30% 16%, rgba(255, 255, 255, .3), transparent 70%),
      radial-gradient(ellipse 40% 26% at 74% 84%, rgba(255, 255, 255, .12), transparent 72%);
    border-radius: 50%;
    pointer-events: none;
  }

  .speed-blur {
    position: absolute;
    z-index: 2;
    inset: calc(var(--wheel) * .026);
    background: repeating-conic-gradient(from 0deg, rgba(255, 255, 255, .11) 0deg 2deg, transparent 2deg 5deg);
    border-radius: 50%;
    animation: sweep .45s linear infinite;
    pointer-events: none;
  }

  /* Rayos que estallan desde el centro al revelar. */
  .winner-rays {
    position: absolute;
    z-index: 0;
    width: 190%;
    height: 190%;
    background: repeating-conic-gradient(from 0deg, rgba(255, 236, 160, .3) 0deg 3deg, transparent 3deg 11deg);
    border-radius: 50%;
    mask-image: radial-gradient(circle, transparent 26%, #000 42%, transparent 74%);
    -webkit-mask-image: radial-gradient(circle, transparent 26%, #000 42%, transparent 74%);
    /* Solo la rotación toca el transform; la entrada se hace con opacidad para no pisarlo. */
    animation: sweep 14s linear infinite, rays-in .6s ease-out;
    pointer-events: none;
  }
  @keyframes rays-in { from { opacity: 0; } }

  .hub {
    position: absolute;
    z-index: 5;
    display: grid;
    width: calc(var(--wheel) * .2);
    height: calc(var(--wheel) * .2);
    place-items: center;
    background: radial-gradient(circle at 34% 28%, #fffdf2, #ffd35c 44%, #c98b08 78%, #8a5c02);
    border: calc(var(--wheel) * .007) solid #6b3f02;
    border-radius: 50%;
    box-shadow: 0 8px 22px rgba(0, 0, 0, .6), inset 0 0 calc(var(--wheel) * .02) rgba(255, 255, 255, .65);
  }
  .hub-star {
    position: absolute;
    color: rgba(255, 255, 255, .5);
    font-size: calc(var(--wheel) * .085);
    animation: hub-turn 7s linear infinite;
  }
  @keyframes hub-turn { to { transform: rotate(360deg); } }
  .hub-label {
    position: relative;
    color: #5c3a02;
    font-family: "Poppins", sans-serif;
    font-size: calc(var(--wheel) * .027);
    font-weight: 800;
    letter-spacing: .09em;
    text-shadow: 0 1px 0 rgba(255, 255, 255, .55);
  }

  /* ---- Banda del ganador ---- */
  .winner-banner {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .15rem;
    overflow: hidden;
    padding: clamp(.45rem, 1.3vh, .95rem) clamp(1.3rem, 3.2vw, 2.8rem);
    background: linear-gradient(160deg, rgba(214, 26, 46, .95), rgba(112, 8, 22, .95));
    border: 2px solid #ffcf5c;
    border-radius: 18px;
    box-shadow: 0 18px 44px rgba(0, 0, 0, .6), inset 0 1px rgba(255, 255, 255, .18), 0 0 26px rgba(255, 203, 84, .25);
    animation: banner-in .55s cubic-bezier(.2, .9, .3, 1.35);
  }
  @keyframes banner-in { from { opacity: 0; transform: translateY(22px) scale(.92); } }
  .banner-shine {
    position: absolute;
    top: 0;
    left: -60%;
    width: 45%;
    height: 100%;
    background: linear-gradient(105deg, transparent, rgba(255, 255, 255, .3), transparent);
    animation: banner-sweep 2.8s ease-in-out infinite;
  }
  @keyframes banner-sweep { 0% { left: -60%; } 60%, 100% { left: 120%; } }
  .banner-label { display: inline-flex; align-items: center; gap: .35rem; color: #ffd166; font-size: clamp(.48rem, 1.15vh, .76rem); font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
  .winner-banner strong { color: #fff; font-family: "Poppins", sans-serif; font-size: clamp(1.05rem, 3.2vh, 2.3rem); font-weight: 800; line-height: 1.1; text-shadow: 0 3px 14px rgba(0, 0, 0, .5); }
  .winner-banner em { color: #ffe9a8; font-size: clamp(.72rem, 1.9vh, 1.35rem); font-style: normal; font-weight: 600; }
  .winner-banner small { color: rgba(255, 255, 255, .62); font-size: clamp(.55rem, 1.3vh, .88rem); }

  /* ---- Escenario de concurso 2026 ---- */
  & {
    display: grid;
    grid-template-rows: clamp(112px, 13vh, 142px) minmax(0, 1fr) 24px;
    align-items: stretch;
    justify-content: stretch;
    gap: clamp(8px, 1vh, 14px);
    padding: clamp(14px, 1.6vh, 22px) clamp(24px, 2.4vw, 48px) 12px;
    background:
      radial-gradient(ellipse at 24% 51%, rgba(80, 229, 216, .13), transparent 29%),
      radial-gradient(ellipse at 78% 43%, rgba(255, 73, 169, .2), transparent 35%),
      linear-gradient(128deg, #090620 0%, #1a0c3e 38%, #2b0d49 68%, #09061d 100%);
    animation: roulette-scene-in .7s cubic-bezier(.18,.8,.24,1) both;
  }
  &::before {
    position: absolute;
    inset: 0;
    z-index: 0;
    content: "";
    background:
      linear-gradient(115deg, transparent 0 18%, rgba(255,255,255,.025) 18.1% 18.35%, transparent 18.45% 72%, rgba(255,255,255,.02) 72.1% 72.3%, transparent 72.4%),
      radial-gradient(circle at 50% 112%, transparent 0 26%, rgba(255,210,88,.12) 26.2% 26.45%, transparent 26.7% 39%, rgba(78,231,216,.08) 39.2% 39.4%, transparent 39.6%);
    pointer-events: none;
  }
  @keyframes roulette-scene-in { from { opacity: 0; transform: scale(1.035); filter: brightness(1.55); } }

  .roulette-head {
    position: relative;
    z-index: 5;
    display: flex;
    width: min(1180px, 76vw);
    min-height: 0;
    align-self: center;
    justify-self: center;
    justify-content: center;
    gap: .25rem;
    padding: clamp(14px, 1.4vh, 20px) 84px 12px;
    overflow: hidden;
    background:
      radial-gradient(ellipse at 50% 110%, rgba(255,85,170,.24), transparent 58%),
      linear-gradient(100deg, rgba(26,19,74,.96), rgba(91,30,129,.95) 50%, rgba(25,20,75,.96));
    border: 2px solid rgba(255,211,91,.78);
    border-radius: 30px 30px 18px 18px;
    box-shadow: inset 0 0 0 4px rgba(255,255,255,.035), 0 15px 35px rgba(4,2,18,.42), 0 0 26px rgba(255,77,167,.14);
  }
  .roulette-head::before,
  .roulette-head::after { position:absolute;top:50%;width:72px;height:2px;content:"";background:linear-gradient(90deg,transparent,#56e4d7,#ffd35d);box-shadow:0 0 10px rgba(87,229,215,.4); }
  .roulette-head::before { left: 22px; }
  .roulette-head::after { right: 22px; transform: scaleX(-1); }
  .marquee-lights { position:absolute;top:7px;right:18px;left:18px;display:flex;justify-content:space-between;pointer-events:none; }
  .marquee-lights i { width:7px;aspect-ratio:1;background:#fff6be;border-radius:50%;box-shadow:0 0 8px #ffd45e;animation:marquee-chase 1.4s linear infinite; }
  .marquee-lights i:nth-child(3n+2){background:#67ecdf;box-shadow:0 0 8px #53e0d3;animation-delay:-.45s}
  .marquee-lights i:nth-child(3n){background:#ff72b7;box-shadow:0 0 8px #ff5caa;animation-delay:-.9s}
  @keyframes marquee-chase { 50% { opacity:.3; transform:scale(.7); } }
  .roulette-head .eyebrow { padding:.22rem .7rem;font-size:clamp(.56rem,.72vw,.82rem);box-shadow:none; }
  .roulette-head h1 { font-size:clamp(2rem,3.25vw,3.65rem);letter-spacing:.055em; }
  .roulette-head p { color:#d8d0e5;font-size:clamp(.72rem,.92vw,1.05rem);font-weight:600; }

  .roulette-main {
    position: relative;
    z-index: 3;
    display: grid;
    width: min(1780px, 96vw);
    min-height: 0;
    grid-template-columns: minmax(0, 1fr) clamp(355px, 25vw, 470px);
    align-items: center;
    justify-self: center;
    gap: clamp(24px, 2.4vw, 48px);
  }
  .wheel-column { position:relative;display:grid;min-height:0;grid-template-rows:minmax(0,1fr) 52px;place-items:center; }
  .wheel-column::before { position:absolute;bottom:28px;width:min(720px,72%);height:80px;content:"";background:radial-gradient(ellipse,rgba(255,187,55,.22),rgba(255,72,163,.08) 42%,transparent 72%);filter:blur(15px); }
  .wheel-area { --wheel:min(69vh, 58vw); width:var(--wheel);max-width:100%;align-self:center; }
  .wheel-frame { filter:drop-shadow(0 28px 28px rgba(1,1,12,.45)); }
  .bezel { background:conic-gradient(from 210deg,#765013,#fff2bd 10%,#bd8616 23%,#6c4510 36%,#ffe8a0 50%,#ac7411 64%,#5d390c 78%,#f7d67b 91%,#765013);box-shadow:0 0 0 calc(var(--wheel)*.01) rgba(255,224,139,.26),inset 0 0 calc(var(--wheel)*.035) rgba(0,0,0,.62),0 32px 70px rgba(0,0,0,.68),0 0 32px rgba(255,190,55,.2); }
  .sector-number { letter-spacing:.025em;stroke-width:3.8px; }
  .hub { border-width:calc(var(--wheel)*.009);box-shadow:0 10px 25px rgba(0,0,0,.62),inset 0 0 calc(var(--wheel)*.026) rgba(255,255,255,.72),0 0 0 calc(var(--wheel)*.012) rgba(96,46,118,.55),0 0 30px rgba(255,208,77,.42); }
  .flapper-mount { z-index:8; }
  .wheel-pedestal { position:relative;z-index:5;display:grid;width:min(500px,62%);height:42px;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;padding:0 24px;color:#fff0a0;background:linear-gradient(180deg,#542173,#1b103e);border:2px solid #d79b32;border-radius:10px 10px 26px 26px;box-shadow:inset 0 1px rgba(255,255,255,.15),0 13px 25px rgba(3,2,20,.52);font-size:.72rem;font-weight:900;letter-spacing:.24em; }
  .wheel-pedestal span { height:3px;background:linear-gradient(90deg,transparent,#55e4d6,#ffd157);border-radius:4px; }
  .wheel-pedestal span:last-child { transform:scaleX(-1); }

  .contestant-deck {
    position: relative;
    display: grid;
    min-height: min(72vh, 750px);
    max-height: 76vh;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 13px;
    overflow: hidden;
    padding: 18px;
    background:
      radial-gradient(circle at 100% 0, rgba(255,90,177,.16), transparent 30%),
      linear-gradient(155deg, rgba(39,24,91,.96), rgba(10,13,42,.97));
    border: 1px solid rgba(100,235,220,.42);
    border-radius: 30px 12px 30px 12px;
    box-shadow: inset 0 0 0 5px rgba(255,255,255,.025), 0 26px 55px rgba(2,1,17,.48), 0 0 28px rgba(77,226,214,.09);
  }
  .contestant-deck::before { position:absolute;right:0;left:0;height:4px;content:"";background:linear-gradient(90deg,#55e4d6,#ffd45e,#ff5cae,#8d6fff,#55e4d6);box-shadow:0 0 12px rgba(255,95,175,.35); }
  .deck-head { display:grid;grid-template-columns:1fr auto;align-items:center;padding:7px 8px 12px;border-bottom:1px solid rgba(255,255,255,.1); }
  .deck-head span { color:#74eee1;font-size:.84rem;font-weight:900;letter-spacing:.14em; }
  .deck-head strong { display:grid;width:42px;aspect-ratio:1;place-items:center;color:#55234e;background:linear-gradient(145deg,#fff5b2,#ffbd43);border:2px solid #fff1a0;border-radius:50%;box-shadow:0 0 15px rgba(255,197,65,.28);font-size:1.1rem; }
  .candidate-board { display:grid;min-height:0;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(82px,1fr);align-content:stretch;gap:10px;overflow:hidden; }
  .candidate-board.count-2 { grid-template-columns:1fr;grid-auto-rows:minmax(125px,155px);align-content:center; }
  .candidate-card { position:relative;display:grid;min-height:76px;grid-template-columns:auto 1fr;align-content:center;column-gap:10px;overflow:hidden;padding:10px 11px;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(8,10,35,.42));border:1px solid rgba(255,255,255,.1);border-radius:15px;box-shadow:inset 0 1px rgba(255,255,255,.05);transition:transform .12s,border-color .12s,background .12s,box-shadow .12s; }
  .candidate-position { display:grid;width:28px;aspect-ratio:1;place-items:center;align-self:start;color:#9288aa;background:rgba(8,7,32,.48);border:1px solid rgba(255,255,255,.08);border-radius:8px;font-size:.54rem;font-weight:900; }
  .candidate-card>div { display:flex;min-width:0;flex-direction:column; }
  .candidate-card>div small { color:#8a809f;font-size:.42rem;font-weight:900;letter-spacing:.12em; }
  .candidate-card>div strong { margin-top:1px;color:#f8f1ff;font-size:clamp(1.05rem,1.55vw,1.7rem);line-height:1;letter-spacing:.04em; }
  .candidate-card p { grid-column:1/3;margin:6px 0 0;overflow:hidden;color:#d7cfdf;font-size:.72rem;font-weight:600;text-overflow:ellipsis;white-space:nowrap; }
  .candidate-card em { grid-column:1/3;margin-top:3px;overflow:hidden;color:#9990aa;font-size:.58rem;font-style:normal;text-overflow:ellipsis;white-space:nowrap; }
  .candidate-light { position:absolute;top:9px;right:9px;width:7px;aspect-ratio:1;background:#4a4260;border-radius:50%; }
  .candidate-card.is-current { z-index:2;background:linear-gradient(145deg,rgba(255,206,73,.22),rgba(255,79,167,.12));border-color:#ffd35d;box-shadow:0 0 0 3px rgba(255,201,67,.09),0 0 22px rgba(255,181,44,.22);transform:scale(1.035); }
  .candidate-card.is-current .candidate-position { color:#50204d;background:linear-gradient(145deg,#fff3a4,#ffbc3e); }
  .candidate-card.is-current .candidate-light { background:#ffe274;box-shadow:0 0 10px #ffd45a; }
  .candidate-card.is-winner { background:linear-gradient(145deg,rgba(79,228,212,.25),rgba(129,72,225,.18));border-color:#6aeee0;box-shadow:0 0 0 4px rgba(82,230,215,.1),0 0 30px rgba(74,229,214,.26);animation:winner-card-pulse 1s ease-in-out infinite alternate; }
  .candidate-card.is-winner .candidate-position { color:#103e42;background:linear-gradient(145deg,#a0fff2,#3ed2c7); }
  .candidate-card.is-winner .candidate-light { background:#6cf4e5;box-shadow:0 0 12px #5de9da; }
  @keyframes winner-card-pulse { to { filter:brightness(1.18);transform:scale(1.025); } }

  .roulette-status { display:grid;min-height:76px;grid-template-columns:auto 1fr auto;align-items:center;gap:11px;padding:11px 13px;background:rgba(8,8,34,.5);border:1px solid rgba(255,255,255,.09);border-radius:15px; }
  .status-icon { display:grid;width:42px;aspect-ratio:1;place-items:center;color:#9a8bb3;background:#28204e;border-radius:12px;font-size:.9rem; }
  .roulette-status>div { display:flex;min-width:0;flex-direction:column; }
  .roulette-status small { color:#8c829f;font-size:.54rem;font-weight:900;letter-spacing:.12em; }
  .roulette-status strong { margin-top:3px;overflow:hidden;color:#d9d2e4;font-size:.74rem;text-overflow:ellipsis;white-space:nowrap; }
  .roulette-status>i { width:8px;aspect-ratio:1;background:#756b8d;border-radius:50%; }
  .roulette-status.is-live { border-color:rgba(255,207,77,.35); }
  .roulette-status.is-live .status-icon { color:#54224e;background:linear-gradient(145deg,#fff3a4,#ffbc42);animation:status-turn 1.1s linear infinite; }
  .roulette-status.is-live>i { background:#ffd257;box-shadow:0 0 10px #ffd257;animation:status-blink .5s ease-in-out infinite alternate; }
  @keyframes status-turn { to { transform:rotate(360deg); } }
  @keyframes status-blink { to { opacity:.25;transform:scale(.7); } }

  .winner-banner { align-self:end;min-height:190px;justify-content:center;gap:.22rem;padding:18px;background:radial-gradient(circle at 50% 28%,rgba(255,237,153,.19),transparent 42%),linear-gradient(155deg,#b61d50,#5a174c 58%,#17214f);border-color:#ffe079;border-radius:24px 9px 24px 9px; }
  .winner-crown { display:grid;width:46px;aspect-ratio:1;place-items:center;color:#5b254d;background:linear-gradient(145deg,#fff8c4,#ffc442);border:2px solid #fff0a0;border-radius:50%;box-shadow:0 0 20px rgba(255,206,70,.38);font-size:1rem; }
  .banner-label { margin-top:5px;font-size:.65rem; }
  .winner-banner strong { color:#fff5b0;font-size:clamp(2.6rem,3.8vw,4.4rem);letter-spacing:.05em;line-height:1; }
  .winner-banner em { max-width:100%;overflow:hidden;font-size:1.05rem;text-overflow:ellipsis;white-space:nowrap; }
  .winner-banner small { font-size:.72rem; }

  .stage-footer { position:relative;z-index:3;display:grid;width:min(1500px,82vw);grid-template-columns:1fr auto auto auto 1fr;align-items:center;justify-self:center;gap:18px; }
  .stage-footer span { height:3px;background:linear-gradient(90deg,transparent,#7555ce,#55e4d6,#ffd259);border-radius:5px; }
  .stage-footer span:last-child { transform:scaleX(-1); }
  .stage-footer i { width:8px;aspect-ratio:1;background:#ff5bab;border:1px solid rgba(255,255,255,.7);border-radius:50%;box-shadow:0 0 9px #ff5bab; }
  .stage-footer i:nth-of-type(2){background:#ffd35d;box-shadow:0 0 9px #ffd35d}.stage-footer i:nth-of-type(3){background:#55e4d6;box-shadow:0 0 9px #55e4d6}

  @media(max-aspect-ratio:4/3){
    .roulette-main{grid-template-columns:minmax(0,1fr) 330px;gap:18px}.wheel-area{--wheel:min(62vh,62vw)}.contestant-deck{min-height:68vh;padding:13px}.candidate-card{min-height:68px;padding:8px}.roulette-head{width:88vw}
  }
`;
