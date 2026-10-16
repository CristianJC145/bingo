import React from "react";
import styled from "styled-components";
import AppIcon from "./AppIcon";

interface BingoCardVisualProps {
  values?: (number | string | null)[][];
  selected?: boolean[][];
  interactive?: boolean;
  onCellClick?: (rowIndex: number, columnIndex: number) => void;
  cardId?: number | string;
  label?: string;
  compact?: boolean;
  className?: string;
}

const letters = ["B", "I", "N", "G", "O"];
const emptyPattern = () => Array.from({ length: 5 }, () => Array(5).fill(null));

const BingoCardVisual: React.FC<BingoCardVisualProps> = ({
  values = emptyPattern(),
  selected,
  interactive = false,
  onCellClick,
  cardId,
  label = "Cartón oficial",
  compact = false,
  className = "",
}) => {
  const rows = Array.from({ length: 5 }, (_, rowIndex) =>
    Array.from({ length: 5 }, (_, columnIndex) => values[rowIndex]?.[columnIndex] ?? null)
  );

  const renderContent = (rowIndex: number, columnIndex: number, value: number | string | null) => {
    const isFree = rowIndex === 2 && columnIndex === 2;
    const isSelected = Boolean(selected?.[rowIndex]?.[columnIndex]);

    if (isFree) return <><AppIcon icon="star" /><small>LIBRE</small></>;
    if (selected && isSelected && (value === null || value === "")) return <AppIcon icon="star" />;
    if (selected && !isSelected && (value === null || value === "")) return <span className="cell-dot" />;
    return value;
  };

  return (
    <CardShell className={`${compact ? "compact" : ""} ${className}`.trim()}>
      <div className="ticket-meta">
        <span className="ticket-brand"><i /> BINGO</span>
        <span className="ticket-label">{label}</span>
        {cardId !== undefined && <strong>#{String(cardId).padStart(4, "0")}</strong>}
      </div>
      <div className="letter-row">
        {letters.map((letter, columnIndex) => <span className={`column-${columnIndex}`} key={letter}>{letter}</span>)}
      </div>
      <div className="number-grid">
        {rows.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
          const isFree = rowIndex === 2 && columnIndex === 2;
          const isSelected = Boolean(selected?.[rowIndex]?.[columnIndex]);
          const classNames = `ticket-cell column-${columnIndex}${isFree ? " free" : ""}${isSelected ? " selected" : ""}`;
          const content = renderContent(rowIndex, columnIndex, value);

          return interactive && !isFree ? (
            <button
              type="button"
              className={classNames}
              key={`${rowIndex}-${columnIndex}`}
              onClick={() => onCellClick?.(rowIndex, columnIndex)}
              aria-label={`Fila ${rowIndex + 1}, columna ${columnIndex + 1}`}
              aria-pressed={isSelected}
            >{content}</button>
          ) : <span className={classNames} key={`${rowIndex}-${columnIndex}`}>{content}</span>;
        }))}
      </div>
      <div className="ticket-footer"><span>CONTROL STUDIO</span><i /><small>JUEGO VERIFICADO</small></div>
    </CardShell>
  );
};

export default BingoCardVisual;

const CardShell = styled.div`
  position: relative;
  width: 100%;
  max-width: 390px;
  overflow: hidden;
  padding: .9rem;
  background:
    radial-gradient(circle at 100% 0, rgba(124,92,255,.14), transparent 36%),
    linear-gradient(155deg, #171d27 0%, #0e131b 100%);
  border: 1px solid rgba(151,163,184,.2);
  border-radius: 21px;
  box-shadow: 0 22px 55px rgba(0,0,0,.3), inset 0 1px rgba(255,255,255,.04);

  &::before { position: absolute; top: 0; left: 12%; width: 76%; height: 2px; content: ""; background: linear-gradient(90deg,transparent,#8f7aff,transparent); opacity: .85; }
  .ticket-meta { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: .65rem; min-height: 24px; margin-bottom: .65rem; }
  .ticket-brand { display: flex; align-items: center; gap: .35rem; color: #f7f8fb; font-family: "Poppins",sans-serif; font-size: .62rem; font-weight: 700; letter-spacing: .16em; }
  .ticket-brand i { width: 7px; height: 7px; background: #4bddc9; border-radius: 50%; box-shadow: 0 0 0 4px rgba(75,221,201,.1); }
  .ticket-label { color: #717d91; font-size: .48rem; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
  .ticket-meta strong { padding: .3rem .45rem; color: #bdb2ff; background: rgba(124,92,255,.1); border: 1px solid rgba(124,92,255,.18); border-radius: 7px; font-size: .52rem; letter-spacing: .06em; }
  .letter-row, .number-grid { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: .38rem; }
  .letter-row { margin-bottom: .42rem; }
  .letter-row span { display: grid; height: 30px; place-items: center; color: rgb(var(--column-rgb)); background: rgba(var(--column-rgb),.09); border: 1px solid rgba(var(--column-rgb),.16); border-radius: 9px; font-family: "Poppins",sans-serif; font-size: .72rem; font-weight: 700; box-shadow: inset 0 1px rgba(255,255,255,.03); }
  .column-0 { --column-rgb: 75,221,201; }
  .column-1 { --column-rgb: 112,158,255; }
  .column-2 { --column-rgb: 156,128,255; }
  .column-3 { --column-rgb: 221,119,255; }
  .column-4 { --column-rgb: 255,184,77; }
  .ticket-cell { position: relative; display: grid; min-width: 0; aspect-ratio: 1; place-items: center; padding: 0; color: #cbd2de; background: linear-gradient(145deg,#222a36,#1a212c); border: 1px solid #303a49; border-radius: 11px; font-family: "Poppins",sans-serif; font-size: clamp(.68rem,2.3vw,.9rem); font-weight: 650; box-shadow: inset 0 1px rgba(255,255,255,.035), 0 4px 9px rgba(0,0,0,.12); }
  button.ticket-cell { cursor: pointer; transition: transform .15s ease,border-color .15s ease,background .15s ease; }
  button.ticket-cell:hover { z-index: 1; background: #283241; border-color: rgba(var(--column-rgb),.55); transform: translateY(-2px); }
  button.ticket-cell:focus-visible { outline: 2px solid rgb(var(--column-rgb)); outline-offset: 2px; }
  .ticket-cell.selected { color: #fff; background: linear-gradient(145deg,rgba(var(--column-rgb),.95),rgba(105,71,240,.9)); border-color: rgba(var(--column-rgb),.72); box-shadow: 0 7px 16px rgba(82,56,190,.25), inset 0 1px rgba(255,255,255,.22); }
  .ticket-cell.free { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: .08rem; color: #ffc968; background: radial-gradient(circle at 50% 30%,rgba(255,184,77,.18),rgba(255,184,77,.06)); border-color: rgba(255,184,77,.32); }
  .ticket-cell.free svg { font-size: .68rem; }
  .ticket-cell.free small { font-size: .34rem; font-weight: 800; letter-spacing: .08em; }
  .ticket-cell > svg { font-size: .78rem; }
  .cell-dot { width: 4px; height: 4px; background: #424d5e; border-radius: 50%; }
  .ticket-footer { display: flex; align-items: center; gap: .5rem; margin-top: .65rem; color: #596579; }
  .ticket-footer span, .ticket-footer small { font-size: .38rem; font-weight: 700; letter-spacing: .11em; }
  .ticket-footer i { flex: 1; height: 1px; background: linear-gradient(90deg,rgba(255,255,255,.1),transparent); }
  &.compact { max-width: 320px; padding: .72rem; border-radius: 17px; }
  &.compact .ticket-meta { margin-bottom: .5rem; }
  &.compact .letter-row, &.compact .number-grid { gap: .3rem; }
  &.compact .letter-row span { height: 25px; border-radius: 7px; font-size: .62rem; }
  &.compact .ticket-cell { border-radius: 8px; font-size: .7rem; }
  &.compact .ticket-footer { margin-top: .5rem; }
`;
