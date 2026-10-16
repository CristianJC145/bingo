import React from "react";
import styled from "styled-components";
import BingoCardVisual from "./BingoCardVisual";

/** Sin `label` el badge muestra solo su valor, en una sola línea. */
export interface CelebrationChip {
  label?: string;
  value: string;
  tone?: "violet" | "teal" | "gold" | "rose";
  /** Texto corto y fijo: nunca se recorta, el espacio lo ceden los demás. */
  fixed?: boolean;
}

export interface CelebrationCard {
  cardNumber: number;
  /** Cuadrícula del cartón por columnas B-I-N-G-O. */
  card?: number[][] | null;
  /** Casillas marcadas (para resaltar la figura ganadora en el bingo). */
  selected?: boolean[][];
  name?: string | null;
  /** Datos de la persona registrada; cada cartón muestra los suyos. */
  chips?: CelebrationChip[];
}

interface WinnerCelebrationProps {
  /** Rótulo dentro de cada marco, p. ej. "Cartón ganador". */
  eyebrow: string;
  /** Hasta tres se muestran; el primero va al centro, más grande y con corona. */
  winners: CelebrationCard[];
  /** Números de los ganadores restantes: hasta tres se listan uno a uno. */
  extraCardNumbers?: number[];
  /** Total real de ganadores, para decidir si la partida debe repetirse. */
  totalWinners?: number;
  /** Límite configurado por el administrador; al superarlo el bingo se repite. */
  repeatThreshold?: number;
  /** Datos comunes a la celebración; los propios de cada cartón tienen prioridad. */
  chips?: CelebrationChip[];
  footerText?: string;
  /** Ocupa toda la pantalla: permite cartones bastante más grandes. */
  fullscreen?: boolean;
  onClose?: () => void;
}

const MAX_VISIBLE_CARDS = 3;
const MAX_LISTED_EXTRAS = 3;
const CROWN_PATH = "M4 34 L10 10 L22 22 L32 4 L42 22 L54 10 L60 34 Z";

/** Cada marco conserva el mismo diseño; solo cambian sus colores para diferenciarlos. */
interface FrameTheme { panelTop: string; panelBottom: string; border: string; bulb: string; bulbGlow: string; }

const GOLD_THEME: FrameTheme = { panelTop: "#c9182a", panelBottom: "#6d0a16", border: "#ffcf5c", bulb: "#ffe08a", bulbGlow: "255,203,84" };
const TEAL_THEME: FrameTheme = { panelTop: "#0f7d6d", panelBottom: "#063f37", border: "#4ee0c4", bulb: "#a9f5e6", bulbGlow: "78,224,196" };
const VIOLET_THEME: FrameTheme = { panelTop: "#5b2a9e", panelBottom: "#2d1150", border: "#c58cff", bulb: "#e2c8ff", bulbGlow: "197,140,255" };

const THEMES_BY_COUNT: Record<number, FrameTheme[]> = {
  1: [GOLD_THEME],
  2: [TEAL_THEME, GOLD_THEME],
  3: [TEAL_THEME, GOLD_THEME, VIOLET_THEME],
};

/** Coloca el ganador principal al centro cuando hay dos o tres cartones. */
const arrangeWinners = (winners: CelebrationCard[]): CelebrationCard[] => {
  const visible = winners.slice(0, MAX_VISIBLE_CARDS);
  if (visible.length === 3) return [visible[1], visible[0], visible[2]];
  if (visible.length === 2) return [visible[1], visible[0]];
  return visible;
};

/** Balotas decorativas que caen de fondo, con los colores de cada columna. */
const FALLING_BALLS = [
  { letter: "B", number: 7, color: "#40d1bb", left: 6, delay: 0, duration: 4.2 },
  { letter: "I", number: 23, color: "#5b96ff", left: 17, delay: 1.4, duration: 5.1 },
  { letter: "N", number: 41, color: "#bb8cff", left: 29, delay: 2.6, duration: 4.6 },
  { letter: "G", number: 58, color: "#ff78c4", left: 41, delay: 0.7, duration: 5.4 },
  { letter: "O", number: 66, color: "#ffab42", left: 53, delay: 3.1, duration: 4.4 },
  { letter: "B", number: 12, color: "#40d1bb", left: 66, delay: 1.9, duration: 5.6 },
  { letter: "N", number: 35, color: "#bb8cff", left: 78, delay: 3.7, duration: 4.8 },
  { letter: "O", number: 71, color: "#ffab42", left: 90, delay: 0.4, duration: 5.2 },
];

const CONFETTI = Array.from({ length: 26 }, (_, index) => index);
const CONFETTI_COLORS = ["#ffd85e", "#27d3b2", "#ff5d8f", "#7c5cff", "#ff9f43"];

const FRAME_TOP = 14;
const FRAME_SIDE = 8;
const TOTAL_FRAME_BULBS = FRAME_TOP * 2 + FRAME_SIDE * 2;

/**
 * Bombillas repartidas por los cuatro lados del marco.
 * Los desplazamientos salen del propio tamaño de la bombilla, así el marco conserva
 * sus proporciones cuando la celebración se amplía (por ejemplo, a 1920×1080 en OBS).
 */
const frameBulbCss = (): string => {
  const rules: string[] = [];
  const half = "calc(var(--bulb-size) / 2)";
  let index = 0;
  for (let i = 0; i < FRAME_TOP; i++) {
    const ratio = i / (FRAME_TOP - 1);
    rules.push(`.frame-bulbs i:nth-child(${++index}) { top: calc(${half} * -1); left: calc(${(ratio * 100).toFixed(2)}% - ${half}); }`);
  }
  for (let i = 0; i < FRAME_TOP; i++) {
    const ratio = i / (FRAME_TOP - 1);
    rules.push(`.frame-bulbs i:nth-child(${++index}) { bottom: calc(${half} * -1); left: calc(${(ratio * 100).toFixed(2)}% - ${half}); }`);
  }
  for (let i = 0; i < FRAME_SIDE; i++) {
    const ratio = (i + 1) / (FRAME_SIDE + 1);
    rules.push(`.frame-bulbs i:nth-child(${++index}) { left: calc(${half} * -1); top: calc(${(ratio * 100).toFixed(2)}% - ${half}); }`);
  }
  for (let i = 0; i < FRAME_SIDE; i++) {
    const ratio = (i + 1) / (FRAME_SIDE + 1);
    rules.push(`.frame-bulbs i:nth-child(${++index}) { right: calc(${half} * -1); top: calc(${(ratio * 100).toFixed(2)}% - ${half}); }`);
  }
  return rules.join("\n  ");
};

/** La cuadrícula llega por columnas B-I-N-G-O; el cartón se dibuja por filas. */
const toRows = (card: number[][]): (number | string | null)[][] =>
  card[0].map((_, rowIndex) => card.map((column) => column[rowIndex]));

const WinnerCelebration: React.FC<WinnerCelebrationProps> = ({
  eyebrow, winners, extraCardNumbers = [], totalWinners, repeatThreshold,
  chips = [], footerText = "¡Felicitaciones!", fullscreen = false, onClose,
}) => {
  const arranged = arrangeWinners(winners);
  const isSingle = arranged.length === 1;
  const primary = winners[0];
  const themes = THEMES_BY_COUNT[arranged.length] ?? THEMES_BY_COUNT[3];
  const listedExtras = extraCardNumbers.slice(0, MAX_LISTED_EXTRAS);
  const total = totalWinners ?? winners.length;
  const mustRepeat = Boolean(repeatThreshold && total > repeatThreshold);

  return (
    <WinnerCelebrationStyle className={fullscreen ? "is-fullscreen" : ""} role="dialog" aria-label="Cartón ganador" onClick={onClose}>
      <span className="rays" aria-hidden="true" />

      <div className="falling-balls" aria-hidden="true">
        {FALLING_BALLS.map((ball, index) => (
          <span
            key={index}
            className="drop-ball"
            style={{
              left: `${ball.left}%`,
              background: `radial-gradient(circle at 34% 28%, #fff, ${ball.color} 58%, rgba(0,0,0,.35))`,
              animationDelay: `${ball.delay}s`,
              animationDuration: `${ball.duration}s`,
            }}
          >
            <b>{ball.letter}{ball.number}</b>
          </span>
        ))}
      </div>

      <div className="confetti" aria-hidden="true">
        {CONFETTI.map((index) => (
          <i
            key={index}
            style={{
              left: `${(index * 3.9) % 100}%`,
              background: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
              animationDelay: `${(index % 9) * 0.24}s`,
              animationDuration: `${2.6 + (index % 5) * 0.4}s`,
            }}
          />
        ))}
      </div>

      <div className="celebration" onClick={(event) => event.stopPropagation()}>
        {/* Cada ganador lleva su propio marco de casino, independiente de los demás. */}
        <div className={`frames-row count-${arranged.length}`}>
          {arranged.map((winner, index) => {
            const rows = winner.card ? toRows(winner.card) : undefined;
            const isPrimary = winner.cardNumber === primary?.cardNumber;
            const theme = themes[index];
            return (
              <div className={`frame-slot ${isPrimary ? "is-primary" : ""}`} key={winner.cardNumber}>
                <div
                  className="casino-frame"
                  style={{
                    ["--panel-top" as string]: theme.panelTop,
                    ["--panel-bottom" as string]: theme.panelBottom,
                    ["--border" as string]: theme.border,
                    ["--bulb" as string]: theme.bulb,
                    ["--bulb-glow" as string]: theme.bulbGlow,
                  }}
                >
                  <div className="frame-bulbs" aria-hidden="true">
                    {Array.from({ length: TOTAL_FRAME_BULBS }, (_, bulbIndex) => (
                      <i key={bulbIndex} style={{ animationDelay: `${(bulbIndex % 6) * 0.11}s` }} />
                    ))}
                  </div>

                  {/* Con dos ganadores comparten protagonismo: ambos llevan corona. */}
                  {(isPrimary || arranged.length === 2) && (
                    <span className="crown" aria-hidden="true">
                      <svg viewBox="0 0 64 40" width="100%" height="100%">
                        {/* Identificador propio por cartón: pueden coexistir dos coronas. */}
                        <path d={CROWN_PATH} fill={`url(#crownGold-${winner.cardNumber})`} stroke="#a9700c" strokeWidth="1.5" strokeLinejoin="round" />
                        <defs>
                          <linearGradient id={`crownGold-${winner.cardNumber}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffe9a8" /><stop offset="55%" stopColor="#ffc93c" /><stop offset="100%" stopColor="#e09612" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </span>
                  )}

                  <div className="frame-inner">
                    <span className="ribbon"><i />{eyebrow}<i /></span>

                    <strong className="winner-name">{winner.name || `Cartón N° ${winner.cardNumber}`}</strong>

                    {!isSingle && <span className="card-number-chip">N° {winner.cardNumber}</span>}

                    {(() => {
                      // Cada cartón muestra sus propios datos; los comunes solo cuando hay uno.
                      const cardChips = winner.chips ?? (isSingle ? chips : []);
                      if (cardChips.length === 0) return null;
                      return (
                        <div className="meta-row">
                          {cardChips.map((chip) => (
                            <span className={`meta-chip ${chip.tone ?? "violet"} ${chip.fixed ? "is-fixed" : ""}`} key={`${chip.label ?? ""}-${chip.value}`} title={chip.value}>
                              {chip.label && <b>{chip.label}</b>}<span>{chip.value}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="card-stage">
                      <span className="card-glow" aria-hidden="true" />
                      {rows
                        ? <BingoCardVisual values={rows} selected={winner.selected} cardId={winner.cardNumber} label="Cartón ganador" />
                        : <div className="card-missing"><strong>N° {winner.cardNumber}</strong><span>Fuera del inventario</span></div>}
                    </div>

                    {isSingle && <span className="congrats">{footerText}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {listedExtras.length > 0 && (
          <div className="extras-row">
            <span className="extras-label">También ganaron</span>
            {listedExtras.map((cardNumber) => (
              <span className="extra-box" key={cardNumber}><b>N°</b><strong>{cardNumber}</strong></span>
            ))}
          </div>
        )}

        {mustRepeat && (
          <div className="repeat-notice" role="status">
            <span className="notice-badge">{total}</span>
            <span className="notice-copy">
              <strong>Más de {repeatThreshold} cartones ganadores</strong>
              <small>La partida se repite</small>
            </span>
          </div>
        )}

        {!isSingle && <span className="congrats">{footerText}</span>}
      </div>
    </WinnerCelebrationStyle>
  );
};

export default WinnerCelebration;

const WinnerCelebrationStyle = styled.div`
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  overflow: hidden;
  place-items: center;
  padding: clamp(8px, 1.4vh, 18px);
  background: radial-gradient(circle at 50% 42%, rgba(46,12,30,.9), rgba(8,4,14,.97));
  border-radius: 32px;
  animation: modal-in .45s cubic-bezier(.18,.9,.24,1);
  backdrop-filter: blur(7px);
  @keyframes modal-in { from { opacity: 0; transform: scale(.94); } }

  /* Rayos de luz girando detrás de los marcos. */
  .rays {
    position: absolute;
    top: 50%; left: 50%;
    width: 190%; aspect-ratio: 1;
    background: repeating-conic-gradient(from 0deg, rgba(255,205,90,.14) 0deg 7deg, transparent 7deg 20deg);
    transform: translate(-50%, -50%);
    animation: rays 26s linear infinite;
    pointer-events: none;
  }
  @keyframes rays { to { transform: translate(-50%, -50%) rotate(360deg); } }

  .falling-balls, .confetti { position: absolute; inset: 0; pointer-events: none; }
  .drop-ball {
    position: absolute;
    top: -60px;
    display: grid;
    width: clamp(28px, 4.4vh, 44px);
    aspect-ratio: 1;
    place-items: center;
    border-radius: 50%;
    box-shadow: inset -3px -4px 8px rgba(0,0,0,.35), 0 4px 12px rgba(0,0,0,.4);
    animation: drop linear infinite;
  }
  .drop-ball b { color: rgba(255,255,255,.95); font-family: "Poppins", sans-serif; font-size: clamp(.5rem, .95vh, .68rem); font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,.4); }
  @keyframes drop {
    0% { opacity: 0; transform: translateY(0) rotate(0deg); }
    8% { opacity: .95; }
    88% { opacity: .8; }
    100% { opacity: 0; transform: translateY(112vh) rotate(420deg); }
  }
  .confetti i { position: absolute; top: -14px; width: 9px; height: 15px; border-radius: 2px; animation: fall linear infinite; }
  @keyframes fall {
    0% { opacity: 0; transform: translateY(-10px) rotate(0deg); }
    12% { opacity: 1; }
    100% { opacity: .1; transform: translateY(112vh) rotate(640deg); }
  }

  .celebration { position: relative; z-index: 1; display: flex; max-width: 100%; max-height: 100%; flex-direction: column; align-items: center; gap: clamp(.55rem, 1.6vh, 1.1rem); }

  /* ---- Fila de marcos independientes ---- */
  .frames-row { display: flex; min-height: 0; align-items: center; justify-content: center; gap: clamp(.6rem, 1.8vw, 1.6rem); }
  .frame-slot { display: flex; min-height: 0; }
  .cards-fallback { display: none; }

  .casino-frame {
    /* Tamaño de referencia del cartón: todo el marco se dimensiona a partir de él. */
    --cw: 390px;
    --bulb-size: 12px;
    position: relative;
    display: flex;
    flex-direction: column;
    padding: clamp(.5rem, 1.2vh, 1rem);
    background: linear-gradient(180deg, var(--panel-top) 0%, var(--panel-bottom) 100%);
    border: 4px solid var(--border);
    border-radius: 24px;
    box-shadow: 0 26px 60px rgba(0,0,0,.6), inset 0 3px 0 rgba(255,255,255,.2), 0 0 44px rgba(var(--bulb-glow), .28);
    animation: pop .5s cubic-bezier(.18,.9,.24,1);
  }
  @keyframes pop { 0% { transform: scale(.84); } 62% { transform: scale(1.03); } 100% { transform: scale(1); } }

  .frame-bulbs { position: absolute; inset: 0; pointer-events: none; }
  .frame-bulbs i {
    position: absolute;
    width: var(--bulb-size); height: var(--bulb-size);
    background: var(--bulb);
    border-radius: 50%;
    box-shadow: 0 0 calc(var(--bulb-size) * 1) calc(var(--bulb-size) / 3) rgba(var(--bulb-glow), .85);
    animation: bulb 1.05s ease-in-out infinite;
  }
  ${frameBulbCss()}
  @keyframes bulb { 50% { background: #fff; box-shadow: 0 0 20px 6px rgba(var(--bulb-glow), .95); } }

  .crown { position: absolute; top: clamp(-30px, -3.4vh, -22px); left: 50%; z-index: 3; width: clamp(46px, 7vh, 74px); transform: translateX(-50%); filter: drop-shadow(0 4px 12px rgba(255,190,60,.7)); animation: crown-bob 2.2s ease-in-out infinite; }
  @keyframes crown-bob { 50% { transform: translateX(-50%) translateY(-5px); } }

  .frame-inner {
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    gap: clamp(.3rem, .8vh, .6rem);
    padding: clamp(.75rem, 1.7vh, 1.35rem) clamp(.7rem, 1.5vw, 1.3rem) clamp(.6rem, 1.3vh, 1rem);
    background: radial-gradient(circle at 50% 12%, rgba(255,205,90,.12), transparent 60%), linear-gradient(180deg, #1a0a20, #0c0614);
    border: 2px solid rgba(255,207,92,.35);
    border-radius: 16px;
    box-shadow: inset 0 0 40px rgba(0,0,0,.6);
  }

  .ribbon { position: relative; display: flex; align-items: center; gap: .5rem; color: var(--border); font-size: clamp(.4rem, .95vh, .6rem); font-weight: 800; letter-spacing: .28em; text-transform: uppercase; }
  .ribbon i { display: block; width: clamp(14px, 3vw, 40px); height: 2px; background: linear-gradient(90deg, transparent, var(--border)); border-radius: 2px; }
  .ribbon i:last-child { background: linear-gradient(90deg, var(--border), transparent); }

  .winner-name {
    /* Un nombre largo baja de línea dentro del cartón en vez de ensanchar el marco. */
    max-width: var(--cw);
    overflow: hidden;
    background: linear-gradient(180deg, #fff8dc 0%, #ffd85e 48%, #f0a92b 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-family: "Poppins", sans-serif;
    font-weight: 800;
    line-height: 1.15;
    text-align: center;
    text-overflow: ellipsis;
    filter: drop-shadow(0 3px 10px rgba(255,190,60,.45));
    animation: name-glow 2.4s ease-in-out infinite;
  }
  @keyframes name-glow { 50% { filter: drop-shadow(0 3px 18px rgba(255,216,94,.85)); } }

  /* Una sola fila, del ancho del cartón: los datos nunca ensanchan el marco ni saltan de línea. */
  .meta-row { display: flex; flex-wrap: nowrap; justify-content: center; gap: .35rem; width: var(--cw); max-width: 100%; }
  .meta-chip { display: flex; min-width: 0; flex-direction: column; align-items: center; gap: .1rem; padding: .24rem .5rem; color: #e6dcff; background: rgba(124,92,255,.16); border: 1px solid rgba(124,92,255,.35); border-radius: 9px; font-size: clamp(.44rem, .85vh, .58rem); font-weight: 700; }
  /* Los textos fijos y cortos no ceden espacio; los datos variables se recortan. */
  .meta-chip.is-fixed { flex: 0 0 auto; }
  .meta-chip > span { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta-chip b { color: rgba(255,255,255,.45); font-size: clamp(.34rem, .66vh, .42rem); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  .meta-chip.teal { color: #a9f2e2; background: rgba(39,211,178,.13); border-color: rgba(39,211,178,.32); }
  .meta-chip.gold { color: #ffd85e; background: rgba(255,216,94,.13); border-color: rgba(255,216,94,.4); }
  .meta-chip.rose { color: #ffb3c7; background: rgba(255,110,150,.13); border-color: rgba(255,110,150,.36); }
  /* Con varios cartones el espacio manda: los datos se compactan. */
  .count-2 .meta-chip, .count-3 .meta-chip { padding: .22rem .5rem; }

  .card-number-chip { padding: .22rem .6rem; color: var(--border); background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14); border-radius: 99px; font-family: "Poppins", sans-serif; font-size: clamp(.5rem, 1.1vh, .72rem); font-weight: 800; }

  .card-stage { position: relative; display: grid; min-height: 0; place-items: center; margin-top: .15rem; }
  .card-glow { position: absolute; inset: -14px; background: radial-gradient(circle, rgba(255,216,94,.28), transparent 68%); animation: card-pulse 2s ease-in-out infinite; pointer-events: none; }
  @keyframes card-pulse { 50% { opacity: .5; transform: scale(1.06); } }
  .card-stage > div { position: relative; z-index: 1; width: var(--cw); max-width: 100%; }

  /* Tamaños: --cw es el ancho del cartón y gobierna todo lo que debe alinearse con él. */
  .count-1 .winner-name { font-size: clamp(1.2rem, 3.6vh, 2.4rem); }
  .count-1 .casino-frame { --cw: clamp(230px, 42vh, 430px); }

  .count-2 .winner-name, .count-3 .winner-name { font-size: clamp(.72rem, 1.8vh, 1.15rem); }
  .count-2 .is-primary .winner-name, .count-3 .is-primary .winner-name { font-size: clamp(.85rem, 2.1vh, 1.35rem); }

  /* Con dos ganadores ambos pesan igual; solo con tres se destaca el central. */
  .count-2 .casino-frame { --cw: clamp(150px, 28vh, 340px); }
  .count-3 .casino-frame { --cw: clamp(112px, 20vh, 260px); }
  .count-3 .is-primary .casino-frame { --cw: clamp(134px, 24vh, 310px); }

  /* ---- Pantalla completa ----
     Todo (marco, bombillas, radios, textos y el interior del cartón) se calcula a partir
     de --cw, el ancho del cartón. Así la pieza conserva sus proporciones en cualquier
     resolución: a 1920×1080 en OBS se ve igual de redondeada y gruesa que en el equipo. */
  &.is-fullscreen .frames-row { gap: clamp(.8rem, 2.2vw, 2.2rem); }
  &.is-fullscreen .count-1 .casino-frame { --cw: min(42vw, 50vh); }
  &.is-fullscreen .count-2 .casino-frame,
  &.is-fullscreen .count-2 .is-primary .casino-frame { --cw: min(32vw, 44vh); }
  &.is-fullscreen .count-3 .casino-frame { --cw: min(25vw, 37vh); }
  &.is-fullscreen .count-3 .is-primary .casino-frame { --cw: min(30vw, 43vh); }

  /* Chrome del marco proporcional al cartón. */
  &.is-fullscreen .casino-frame {
    --bulb-size: calc(var(--cw) * .032);
    padding: calc(var(--cw) * .034);
    border-width: calc(var(--cw) * .012);
    border-radius: calc(var(--cw) * .066);
  }
  &.is-fullscreen .frame-inner {
    gap: calc(var(--cw) * .022);
    padding: calc(var(--cw) * .052) calc(var(--cw) * .045) calc(var(--cw) * .04);
    border-width: calc(var(--cw) * .006);
    border-radius: calc(var(--cw) * .044);
  }
  &.is-fullscreen .crown { top: calc(var(--cw) * -.085); width: calc(var(--cw) * .17); }
  &.is-fullscreen .ribbon { gap: calc(var(--cw) * .022); font-size: calc(var(--cw) * .028); }
  &.is-fullscreen .ribbon i { width: calc(var(--cw) * .1); }
  &.is-fullscreen .card-number-chip { padding: calc(var(--cw) * .012) calc(var(--cw) * .04); font-size: calc(var(--cw) * .04); }
  /* Los datos escalan con el marco para que OBS los muestre legibles a 1920×1080. */
  &.is-fullscreen .meta-row { gap: calc(var(--cw) * .014); }
  &.is-fullscreen .meta-chip { gap: calc(var(--cw) * .004); padding: calc(var(--cw) * .016) calc(var(--cw) * .026); border-radius: calc(var(--cw) * .022); font-size: calc(var(--cw) * .034); }
  &.is-fullscreen .meta-chip b { font-size: calc(var(--cw) * .022); }

  /* Los selectores repiten .count-N y .is-primary para superar en especificidad a las
     reglas del modo normal; si no, el cartón central se quedaba con el ancho antiguo. */
  &.is-fullscreen .count-2 .winner-name,
  &.is-fullscreen .count-3 .winner-name,
  &.is-fullscreen .count-2 .is-primary .winner-name,
  &.is-fullscreen .count-3 .is-primary .winner-name { font-size: calc(var(--cw) * .072); }
  &.is-fullscreen .count-1 .winner-name { font-size: calc(var(--cw) * .1); }

  /* Interior del cartón: sus medidas nativas son fijas en px, aquí se reescalan. */
  &.is-fullscreen .count-1 .card-stage > div,
  &.is-fullscreen .count-2 .card-stage > div,
  &.is-fullscreen .count-3 .card-stage > div,
  &.is-fullscreen .count-2 .is-primary .card-stage > div,
  &.is-fullscreen .count-3 .is-primary .card-stage > div {
    width: var(--cw);
    max-width: none;
    padding: calc(var(--cw) * .037);
    border-radius: calc(var(--cw) * .054);
  }
  &.is-fullscreen .card-stage .ticket-meta { gap: calc(var(--cw) * .017); min-height: 0; margin-bottom: calc(var(--cw) * .017); }
  &.is-fullscreen .card-stage .ticket-brand { gap: calc(var(--cw) * .009); font-size: calc(var(--cw) * .026); }
  &.is-fullscreen .card-stage .ticket-brand i { width: calc(var(--cw) * .018); height: calc(var(--cw) * .018); }
  &.is-fullscreen .card-stage .ticket-label { font-size: calc(var(--cw) * .02); }
  &.is-fullscreen .card-stage .ticket-meta strong { padding: calc(var(--cw) * .008) calc(var(--cw) * .012); border-radius: calc(var(--cw) * .018); font-size: calc(var(--cw) * .022); }
  &.is-fullscreen .card-stage .letter-row, &.is-fullscreen .card-stage .number-grid { gap: calc(var(--cw) * .0097); }
  &.is-fullscreen .card-stage .letter-row { margin-bottom: calc(var(--cw) * .011); }
  &.is-fullscreen .card-stage .letter-row span { height: calc(var(--cw) * .077); border-radius: calc(var(--cw) * .023); font-size: calc(var(--cw) * .046); }
  &.is-fullscreen .card-stage .ticket-cell { border-radius: calc(var(--cw) * .028); font-size: calc(var(--cw) * .062); }
  &.is-fullscreen .card-stage .ticket-cell.free svg { font-size: calc(var(--cw) * .046); }
  &.is-fullscreen .card-stage .ticket-cell.free small { font-size: calc(var(--cw) * .019); }
  &.is-fullscreen .card-stage .ticket-footer { gap: calc(var(--cw) * .013); margin-top: calc(var(--cw) * .017); }
  &.is-fullscreen .card-stage .ticket-footer span, &.is-fullscreen .card-stage .ticket-footer small { font-size: calc(var(--cw) * .017); }

  &.is-fullscreen .congrats { font-size: min(1.5vw, 2vh); }

  .card-missing { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .35rem; aspect-ratio: 3 / 4; padding: 1rem; text-align: center; }
  .card-missing strong { color: #fff; font-family: "Poppins", sans-serif; font-size: clamp(1.1rem, 3vh, 2rem); font-weight: 800; }
  .card-missing span { color: rgba(255,255,255,.5); font-size: clamp(.46rem, .95vh, .62rem); line-height: 1.4; }

  /* ---- Ganadores adicionales ---- */
  .extras-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .45rem; }
  .extras-label { color: rgba(255,255,255,.55); font-size: clamp(.44rem, .95vh, .6rem); font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
  .extra-box { display: flex; align-items: baseline; gap: .28rem; padding: .3rem .75rem; background: linear-gradient(180deg, rgba(255,216,94,.18), rgba(255,216,94,.06)); border: 2px solid rgba(255,216,94,.45); border-radius: 11px; box-shadow: inset 0 0 14px rgba(255,216,94,.12), 0 0 14px rgba(255,216,94,.12); }
  .extra-box b { color: rgba(255,216,94,.75); font-size: clamp(.44rem, .9vh, .56rem); font-weight: 800; letter-spacing: .1em; }
  .extra-box strong { color: #ffd85e; font-family: "Poppins", sans-serif; font-size: clamp(.78rem, 1.9vh, 1.15rem); font-weight: 800; text-shadow: 0 0 12px rgba(255,216,94,.6); }

  /* ---- Aviso de partida repetida ---- */
  .repeat-notice { display: flex; align-items: center; gap: .7rem; padding: .42rem 1rem .42rem .5rem; background: linear-gradient(120deg, rgba(239,91,103,.28), rgba(255,159,67,.16)); border: 2px solid rgba(255,140,120,.55); border-radius: 14px; box-shadow: 0 0 26px rgba(239,91,103,.28); animation: notice-pulse 1.8s ease-in-out infinite; }
  @keyframes notice-pulse { 50% { box-shadow: 0 0 38px rgba(239,91,103,.5); } }
  .notice-badge { display: grid; min-width: clamp(28px, 4.4vh, 40px); aspect-ratio: 1; place-items: center; color: #2a0509; background: linear-gradient(145deg, #ffd0a8, #ff8e7a); border-radius: 11px; font-family: "Poppins", sans-serif; font-size: clamp(.8rem, 2vh, 1.15rem); font-weight: 800; }
  .notice-copy { display: flex; flex-direction: column; line-height: 1.2; }
  .notice-copy strong { color: #ffd7cf; font-size: clamp(.56rem, 1.25vh, .8rem); font-weight: 800; }
  .notice-copy small { margin-top: .1rem; color: rgba(255,255,255,.7); font-size: clamp(.44rem, .95vh, .62rem); font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }

  .congrats { color: #ffd85e; font-size: clamp(.58rem, 1.35vh, .88rem); font-weight: 800; letter-spacing: .22em; text-transform: uppercase; animation: glow 1.5s ease-in-out infinite; }
  @keyframes glow { 50% { color: #fff; text-shadow: 0 0 20px rgba(255,216,94,.95); } }

  @media (max-width: 760px) { .frames-row { flex-wrap: wrap; } }
`;
