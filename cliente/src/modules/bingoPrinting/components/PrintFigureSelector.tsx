import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import { GetAllFiguresService } from "../../bingoFigures/services/getAllFigures.service";
import type { PrintFigure } from "../utils/generateTemplateBingoCardsPdf";

const getAllFiguresService = new GetAllFiguresService();

interface PrintFigureSelectorProps {
  selectedIds: number[];
  onChange: (figures: PrintFigure[]) => void;
}

const ordinal = (index: number) => ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Séptima", "Octava"][index] ?? `${index + 1}.ª`;

const MiniPattern: React.FC<{ figure: PrintFigure }> = ({ figure }) => (
  <span className="mini-grid">
    {figure.pattern.flatMap((row, rowIndex) => row.map((cell, cellIndex) => (
      <i className={rowIndex === 2 && cellIndex === 2 ? "free" : cell ? "filled" : ""} key={`${rowIndex}-${cellIndex}`} />
    )))}
  </span>
);

const PrintFigureSelector: React.FC<PrintFigureSelectorProps> = ({ selectedIds, onChange }) => {
  const [figures, setFigures] = useState<PrintFigure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllFiguresService.run()
      .then((result) => {
        const loaded = result.data as PrintFigure[];
        setFigures(loaded);
        onChange(selectedIds.map((id) => loaded.find((figure) => figure.id === id)).filter((figure): figure is PrintFigure => Boolean(figure)));
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
    // La carga inicial restaura exactamente el orden guardado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (ids: number[]) => onChange(ids.map((id) => figures.find((figure) => figure.id === id)).filter((figure): figure is PrintFigure => Boolean(figure)));
  const toggle = (id: number) => emit(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[target]] = [next[target], next[index]];
    emit(next);
  };

  if (isLoading) return <PrintFigureSelectorStyle><div className="state"><AppIcon icon="rotate" className="spin" />Cargando figuras…</div></PrintFigureSelectorStyle>;
  if (figures.length === 0) return <PrintFigureSelectorStyle><div className="state"><AppIcon icon="vector-square" />Todavía no hay figuras creadas.</div></PrintFigureSelectorStyle>;

  const selectedFigures = selectedIds.map((id) => figures.find((figure) => figure.id === id)).filter((figure): figure is PrintFigure => Boolean(figure));

  return (
    <PrintFigureSelectorStyle>
      <div className="sequence-head">
        <div><strong>Orden de juego</strong><small>Este mismo orden aparecerá impreso en la hoja.</small></div>
        <span>{selectedFigures.length} seleccionadas</span>
      </div>

      {selectedFigures.length > 0 ? (
        <div className="sequence-list">
          {selectedFigures.map((figure, index) => (
            <div className="sequence-item" key={figure.id}>
              <span className="ordinal"><small>{ordinal(index)}</small><strong>Figura</strong></span>
              <MiniPattern figure={figure} />
              <b>{figure.name}</b>
              <span className="move-actions">
                <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Mover antes"><AppIcon icon="angle-up" /></button>
                <button type="button" disabled={index === selectedFigures.length - 1} onClick={() => move(index, 1)} aria-label="Mover después"><AppIcon icon="angle-down" /></button>
                <button type="button" className="remove" onClick={() => toggle(figure.id)} aria-label="Quitar"><AppIcon icon="times" /></button>
              </span>
            </div>
          ))}
        </div>
      ) : <div className="empty-sequence">Selecciona abajo la primera figura que se jugará.</div>}

      <div className="library-head">
        <span>Biblioteca de figuras</span>
        <div><button type="button" onClick={() => emit(figures.map((figure) => figure.id))}>Todas</button><button type="button" onClick={() => emit([])} disabled={!selectedIds.length}>Ninguna</button></div>
      </div>
      <div className="figure-grid">
        {figures.map((figure) => {
          const isSelected = selectedIds.includes(figure.id);
          return (
            <button type="button" className={`figure-option ${isSelected ? "selected" : ""}`} key={figure.id} onClick={() => toggle(figure.id)} aria-pressed={isSelected}>
              <MiniPattern figure={figure} />
              <strong>{figure.name}</strong>
              {isSelected && <span className="order-badge">{selectedIds.indexOf(figure.id) + 1}</span>}
            </button>
          );
        })}
      </div>
    </PrintFigureSelectorStyle>
  );
};

export default PrintFigureSelector;

const PrintFigureSelectorStyle = styled.div`
  .state { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 1.6rem; color: var(--text-muted); font-size: .7rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .sequence-head, .library-head { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
  .sequence-head > div { display: flex; flex-direction: column; }
  .sequence-head strong { color: var(--text-secondary); font-size: .7rem; }
  .sequence-head small { margin-top: .1rem; color: var(--text-muted); font-size: .58rem; }
  .sequence-head > span { color: #b7a8ff; font-size: .6rem; font-weight: 700; }
  .sequence-list { display: flex; flex-direction: column; gap: .4rem; margin-top: .65rem; }
  .sequence-item { display: grid; grid-template-columns: 58px 36px minmax(0,1fr) auto; align-items: center; gap: .6rem; padding: .45rem .55rem; background: linear-gradient(90deg, rgba(var(--color-primary-rgb),.12), rgba(0,0,0,.1)); border: 1px solid rgba(var(--color-primary-rgb),.24); border-radius: 10px; }
  .ordinal { display: flex; flex-direction: column; color: #c7bcff; line-height: 1.05; text-transform: uppercase; }
  .ordinal small { font-size: .52rem; font-weight: 700; }
  .ordinal strong { font-size: .63rem; }
  .sequence-item b { overflow: hidden; color: var(--text-primary); font-size: .66rem; text-overflow: ellipsis; white-space: nowrap; }
  .move-actions { display: flex; gap: .25rem; }
  .move-actions button { display: grid; width: 26px; height: 26px; place-items: center; color: var(--text-muted); background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); border-radius: 7px; font-size: .52rem; cursor: pointer; }
  .move-actions button:disabled { opacity: .3; cursor: not-allowed; }
  .move-actions .remove { color: #ff8e99; }
  .empty-sequence { margin-top: .65rem; padding: .8rem; color: var(--text-muted); text-align: center; background: rgba(0,0,0,.1); border: 1px dashed var(--border-subtle); border-radius: 10px; font-size: .63rem; }
  .library-head { margin: .9rem 0 .5rem; color: var(--text-muted); font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .library-head div { display: flex; gap: .3rem; }
  .library-head button { padding: .25rem .55rem; color: var(--text-secondary); background: rgba(255,255,255,.04); border: 1px solid var(--border-subtle); border-radius: 7px; font-size: .56rem; font-weight: 600; cursor: pointer; }
  .library-head button:disabled { opacity: .4; cursor: not-allowed; }
  .figure-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: .5rem; max-height: 220px; overflow-y: auto; padding-right: .2rem; }
  .figure-option { position: relative; display: flex; flex-direction: column; align-items: center; gap: .4rem; padding: .55rem .4rem; color: var(--text-secondary); background: rgba(0,0,0,.16); border: 1px solid var(--border-subtle); border-radius: 11px; cursor: pointer; transition: border-color .16s ease, background .16s ease; }
  .figure-option:hover { border-color: var(--border-strong); }
  .figure-option.selected { color: var(--text-primary); background: rgba(var(--color-primary-rgb),.1); border-color: rgba(var(--color-primary-rgb),.4); }
  .figure-option > strong { overflow: hidden; max-width: 100%; font-size: .58rem; font-weight: 600; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
  .mini-grid { display: grid; width: 36px; grid-template-columns: repeat(5, 1fr); gap: 1.5px; }
  .figure-option .mini-grid { width: 46px; }
  .mini-grid i { aspect-ratio: 1; background: #252c38; border-radius: 1.5px; }
  .mini-grid i.filled { background: var(--color-primary); }
  .mini-grid i.free { background: rgba(255,184,77,.55); }
  .order-badge { position: absolute; top: .28rem; right: .28rem; display: grid; width: 17px; height: 17px; place-items: center; color: #fff; background: var(--color-primary); border-radius: 50%; font-size: .48rem; font-weight: 700; }
`;
