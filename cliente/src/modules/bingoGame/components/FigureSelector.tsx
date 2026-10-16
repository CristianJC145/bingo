import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { GetAllFiguresService } from "../../bingoFigures/services/getAllFigures.service";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import FigureSelectorModal from "./FigureSelectorModal";

const getAllFiguresService = new GetAllFiguresService();
interface Figure { id: number; name: string; pattern: boolean[][]; }
interface FigureSelectorProps {
  onSelectFigure: (figures: Figure[]) => void;
  /** Vuelve a presentar las figuras en grande sobre la transmisión, antes de iniciar. */
  onShowcase?: () => void;
  gameReset: boolean;
  disabled?: boolean;
  initialSelectedIds?: number[];
}
const emptyPattern = () => Array.from({ length: 5 }, () => Array(5).fill(false));

const FigureSelector: React.FC<FigureSelectorProps> = ({ onSelectFigure, onShowcase, gameReset, disabled = false, initialSelectedIds }) => {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [selectedFigureIds, setSelectedFigureIds] = useState<number[]>(initialSelectedIds ?? []);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { getAllFiguresService.run().then((result) => setFigures(result.data)); }, []);
  useEffect(() => { if (gameReset) setSelectedFigureIds([]); }, [gameReset]);
  useEffect(() => { if (disabled) setIsModalOpen(false); }, [disabled]);

  const selectedFigures = useMemo(() => selectedFigureIds.map((id) => figures.find((figure) => figure.id === id)).filter((figure): figure is Figure => Boolean(figure)), [figures, selectedFigureIds]);
  const preview = selectedFigures[0]?.pattern ?? emptyPattern();

  const handleSelectFigures = (ids: number[]) => {
    setSelectedFigureIds(ids);
    onSelectFigure(ids.map((id) => figures.find((figure) => figure.id === id)).filter((figure): figure is Figure => Boolean(figure)));
  };

  return (
    <FigureSelectorStyle className={`surface-card ${disabled ? "is-disabled" : ""}`} aria-disabled={disabled}>
      <div className="control-header">
        <div><h2>Figuras</h2><p>{selectedFigures.length ? `${selectedFigures.length} seleccionada${selectedFigures.length === 1 ? "" : "s"}` : disabled ? "Define primero los cartones" : "Selecciona los patrones ganadores"}</p></div>
        {/* La presentación vive en la cabecera para no robar altura a la tarjeta. */}
        {onShowcase && selectedFigures.length > 0 && (
          <button type="button" className="showcase-button" onClick={onShowcase} disabled={disabled} title="Muestra la figura en grande sobre la transmisión durante los segundos configurados">
            <AppIcon icon="ad" /><span>Presentar</span>
          </button>
        )}
        <span className={`step-state ${selectedFigures.length ? "complete" : disabled ? "locked" : ""}`}><AppIcon icon={selectedFigures.length ? "check" : disabled ? "lock" : "vector-square"} /></span>
      </div>
      <button className="figure-preview" type="button" disabled={disabled} onClick={() => setIsModalOpen(true)}>
        <div className="mini-card">
          <div className="mini-header">{["B", "I", "N", "G", "O"].map((letter) => <span key={letter}>{letter}</span>)}</div>
          <div className="mini-grid">{preview.flatMap((row, rowIndex) => row.map((cell, cellIndex) => <span className={rowIndex === 2 && cellIndex === 2 ? "free" : cell ? "filled" : ""} key={`${rowIndex}-${cellIndex}`}>{rowIndex === 2 && cellIndex === 2 ? "•" : cell ? <AppIcon icon="star" /> : ""}</span>))}</div>
        </div>
        <div className="preview-copy"><strong>{selectedFigures[0]?.name ?? "Elegir figuras"}</strong><small>{selectedFigures.length > 1 ? `y ${selectedFigures.length - 1} más` : "Abre la biblioteca de patrones"}</small></div>
        <span className="preview-arrow">→</span>
      </button>
      {selectedFigures.length > 0 && <div className="figure-chips">{selectedFigures.map((figure) => <span key={figure.id}>{figure.name}</span>)}</div>}
      <AppModal title="Seleccionar figuras" size="md" isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}><FigureSelectorModal onClose={() => setIsModalOpen(false)} figures={figures} selectedFigures={selectedFigureIds} onSelectFigures={handleSelectFigures} /></AppModal>
    </FigureSelectorStyle>
  );
};

export default FigureSelector;

const FigureSelectorStyle = styled.section`
  padding: 1.1rem;
  .control-header { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
  /* El título absorbe el ancho sobrante: el botón y el indicador quedan pegados a la derecha. */
  .control-header > div:first-child { min-width: 0; flex: 1; }
  .control-header > div:first-child p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .panel-index { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.035); border: 1px solid var(--border-subtle); border-radius: 10px; font-family: "Poppins", sans-serif; font-size: .62rem; font-weight: 700; }
  h2 { margin: 0; color: var(--text-primary); font-size: .92rem; font-weight: 600; }
  p { margin: .22rem 0 0; color: var(--text-muted); font-size: .68rem; }
  .figure-preview { display: flex; width: 100%; align-items: center; gap: .75rem; margin-bottom: .75rem; padding: .7rem; color: var(--text-primary); text-align: left; background: rgba(0,0,0,.16); border: 1px solid var(--border-subtle); border-radius: 13px; cursor: pointer; }
  .figure-preview:hover { border-color: var(--border-strong); }
  .mini-card { width: 66px; flex: 0 0 66px; padding: .35rem; background: #11161e; border: 1px solid var(--border-subtle); border-radius: 9px; }
  .mini-header, .mini-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 2px; }
  .mini-header { margin-bottom: 3px; color: #aa98ff; font-size: .37rem; font-weight: 700; text-align: center; }
  .mini-grid span { display: grid; aspect-ratio: 1; place-items: center; color: transparent; background: #252c38; border: 1px solid rgba(255,255,255,.035); border-radius: 2px; font-size: .3rem; }
  .mini-grid span.filled { color: #fff; background: var(--color-primary); }
  .mini-grid span.free { color: var(--color-accent); background: rgba(255,184,77,.08); }
  .preview-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
  .preview-copy strong { overflow: hidden; font-size: .73rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .preview-copy small { margin-top: .25rem; color: var(--text-muted); font-size: .58rem; }
  .preview-arrow { color: var(--color-primary); }
  .figure-chips { display: flex; flex-wrap: wrap; gap: .35rem; margin: -.2rem 0 .75rem; }
  .figure-chips span { padding: .3rem .5rem; color: #b7a9ff; background: rgba(var(--color-primary-rgb),.08); border: 1px solid rgba(var(--color-primary-rgb),.15); border-radius: 7px; font-size: .56rem; }
  /* Presentación previa al juego: una vez iniciada la partida ya no se interrumpe. */
  .showcase-button { display: flex; flex: 0 0 auto; align-items: center; gap: .35rem; height: 28px; padding: 0 .55rem; color: var(--color-accent); background: rgba(255,184,77,.08); border: 1px solid rgba(255,184,77,.22); border-radius: 9px; font-size: .58rem; font-weight: 600; white-space: nowrap; cursor: pointer; transition: background .16s ease, border-color .16s ease; }
  .showcase-button:hover:not(:disabled) { background: rgba(255,184,77,.16); border-color: rgba(255,184,77,.38); }
  .showcase-button:disabled { cursor: not-allowed; }
  .showcase-button svg { font-size: .62rem; }
`;
