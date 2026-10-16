import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import AppButton from "../../../shared/components/Buttons/AppButton";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";

interface Figure { id: number; name: string; pattern: boolean[][]; }
interface FigureSelectorModalProps { onClose: () => void; figures: Figure[]; selectedFigures: number[]; onSelectFigures: (selectedFigures: number[]) => void; }
const emptyPattern = () => Array.from({ length: 5 }, () => Array(5).fill(false));

const FigureSelectorModal: React.FC<FigureSelectorModalProps> = ({ onClose, figures, onSelectFigures, selectedFigures }) => {
  const [localSelected, setLocalSelected] = useState<number[]>(selectedFigures);
  const [previewId, setPreviewId] = useState<number | null>(selectedFigures[0] ?? figures[0]?.id ?? null);
  useEffect(() => { setLocalSelected(selectedFigures); }, [selectedFigures]);
  const preview = useMemo(() => figures.find((figure) => figure.id === previewId), [figures, previewId]);

  const toggleSelection = (id: number) => setLocalSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const handleSave = () => { onSelectFigures(localSelected); onClose(); };

  return (
    <FigureSelectorModalStyle>
      <div className="selector-layout">
        <div className="figure-list"><div className="list-heading"><span>Biblioteca</span><small>{localSelected.length} seleccionada{localSelected.length === 1 ? "" : "s"}</small></div>{figures.map((figure) => <div className={`list-item ${previewId === figure.id ? "previewing" : ""}`} key={figure.id} onClick={() => setPreviewId(figure.id)}><input type="checkbox" checked={localSelected.includes(figure.id)} onChange={() => toggleSelection(figure.id)} onClick={(event) => event.stopPropagation()} aria-label={`Seleccionar ${figure.name}`} /><span>{figure.name}</span><b>{previewId === figure.id ? "Vista" : ""}</b></div>)}</div>
        <div className="modal-preview"><div className="preview-heading"><div><span>Vista previa</span><strong>{preview?.name ?? "Selecciona una figura"}</strong></div>{preview && <small>ID {preview.id}</small>}</div><div className="pattern-card"><BingoCardVisual selected={preview?.pattern ?? emptyPattern()} cardId={preview?.id} label="Patrón seleccionado" compact /></div><p>Puedes seleccionar varias figuras para comprobarlas simultáneamente durante la partida.</p></div>
      </div>
      <div className="selector-actions"><AppButton variant="transparent" label="Cancelar" onClick={onClose} /><AppButton icon="check" label="Aplicar selección" onClick={handleSave} disabled={localSelected.length === 0} /></div>
    </FigureSelectorModalStyle>
  );
};

export default FigureSelectorModal;

const FigureSelectorModalStyle = styled.div`
  .selector-layout { display: grid; grid-template-columns: minmax(200px,.7fr) minmax(300px,1fr); gap: 1.25rem; }
  .figure-list { max-height: 390px; overflow: auto; padding-right: .25rem; }
  .list-heading { display: flex; justify-content: space-between; margin-bottom: .65rem; color: var(--text-muted); font-size: .6rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .list-item { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: .6rem; margin-bottom: .4rem; padding: .72rem; color: var(--text-secondary); background: rgba(255,255,255,.025); border: 1px solid transparent; border-radius: 11px; cursor: pointer; }
  .list-item:hover, .list-item.previewing { color: #fff; background: rgba(255,255,255,.045); border-color: var(--border-subtle); }
  .list-item input { width: 15px; height: 15px; accent-color: var(--color-primary); }
  .list-item span { font-size: .7rem; }
  .list-item b { color: #ad9cff; font-size: .52rem; text-transform: uppercase; }
  .modal-preview { padding: 1rem; background: rgba(0,0,0,.16); border: 1px solid var(--border-subtle); border-radius: 16px; }
  .preview-heading { display: flex; align-items: flex-start; justify-content: space-between; }
  .preview-heading > div { display: flex; flex-direction: column; }
  .preview-heading span { color: var(--color-secondary); font-size: .58rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
  .preview-heading strong { margin-top: .25rem; font-size: .78rem; }
  .preview-heading small { color: var(--text-muted); font-size: .55rem; }
  .pattern-card { display: flex; justify-content: center; margin: 1rem auto; }
  .modal-preview p { margin: 0; color: var(--text-muted); font-size: .62rem; line-height: 1.5; text-align: center; }
  .selector-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.15rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
  @media (max-width: 650px) { .selector-layout { grid-template-columns: 1fr; } .figure-list { max-height: 210px; } }
`;
