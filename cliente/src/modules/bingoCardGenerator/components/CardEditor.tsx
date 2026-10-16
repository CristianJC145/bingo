import React, { useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import { UpdateBingoCardService } from "../services/updateBingoCard.service";

interface CardEditorProps { id: number; initialCard: number[][]; onClose: () => void; onSave: () => void; }

const updateBingoCardService = new UpdateBingoCardService();
const COLUMNS = [
  { letter: "B", start: 1, end: 15 },
  { letter: "I", start: 16, end: 30 },
  { letter: "N", start: 31, end: 45 },
  { letter: "G", start: 46, end: 60 },
  { letter: "O", start: 61, end: 75 },
];

const CardEditor: React.FC<CardEditorProps> = ({ id, initialCard, onClose, onSave }) => {
  const [card, setCard] = useState<number[][]>(initialCard.map((column) => [...column]));
  const [error, setError] = useState("");

  const handleCellChange = (columnIndex: number, rowIndex: number, rawValue: string) => {
    const value = rawValue === "" ? 0 : Number(rawValue);
    setCard((current) => current.map((column, currentColumn) => currentColumn === columnIndex ? column.map((cell, currentRow) => currentRow === rowIndex ? value : cell) : column));
    setError("");
  };

  const validate = (): string => {
    for (let columnIndex = 0; columnIndex < 5; columnIndex++) {
      const { letter, start, end } = COLUMNS[columnIndex];
      const values = card[columnIndex].filter((_, rowIndex) => !(columnIndex === 2 && rowIndex === 2));
      for (const value of values) {
        if (!Number.isInteger(value) || value < start || value > end) return `Los valores de la columna ${letter} deben estar entre ${start} y ${end}.`;
      }
      if (new Set(values).size !== values.length) return `La columna ${letter} tiene números repetidos.`;
    }
    return "";
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    try {
      const cardToSave = card.map((column) => [...column]);
      cardToSave[2][2] = id;
      await updateBingoCardService.run(id, cardToSave);
      toast.success(`Cartón #${id} actualizado correctamente`);
      onSave();
      onClose();
    } catch {
      toast.error("No fue posible guardar el cartón.");
    }
  };

  return (
    <CardEditorStyle>
      <div className="editor-label"><div><strong>Editando cartón #{id}</strong><small>Ajusta los números respetando el rango de cada columna.</small></div></div>
      {error && <div className="editor-error">{error}</div>}
      <div className="editor-grid">
        {COLUMNS.map((column, columnIndex) => (
          <div className="editor-column" key={column.letter}>
            <span className="column-letter">{column.letter}</span>
            {card[columnIndex].map((value, rowIndex) => {
              const isFree = columnIndex === 2 && rowIndex === 2;
              return isFree
                ? <div className="cell-input cell-free" key={rowIndex}>LIBRE</div>
                : <input
                    key={rowIndex}
                    type="number"
                    className="cell-input"
                    value={value}
                    min={column.start}
                    max={column.end}
                    onChange={(event) => handleCellChange(columnIndex, rowIndex, event.target.value)}
                  />;
            })}
          </div>
        ))}
      </div>
      <div className="editor-actions"><AppButton variant="transparent" label="Cancelar" onClick={onClose} /><AppButton icon="check" label="Guardar cambios" onClick={handleSave} /></div>
    </CardEditorStyle>
  );
};

export default CardEditor;

const CardEditorStyle = styled.div`
  .editor-label { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 1rem; }
  .editor-label strong { font-size: .8rem; font-weight: 600; }
  .editor-label small { display: block; margin-top: .2rem; color: var(--text-muted); font-size: .62rem; }
  .editor-error { margin-bottom: .8rem; padding: .6rem .8rem; color: var(--color-danger); background: rgba(var(--color-danger-rgb),.08); border: 1px solid rgba(var(--color-danger-rgb),.25); border-radius: 9px; font-size: .68rem; }
  .editor-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .5rem; }
  .editor-column { display: flex; flex-direction: column; gap: .4rem; }
  .column-letter { color: var(--text-muted); font-size: .64rem; font-weight: 700; text-align: center; letter-spacing: .08em; }
  .cell-input { width: 100%; padding: .5rem 0; color: var(--text-primary); text-align: center; background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 8px; outline: 0; font-size: .72rem; }
  .cell-input:focus { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.1); }
  .cell-free { display: grid; place-items: center; color: var(--color-accent); font-size: .58rem; font-weight: 700; }
  .editor-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
`;
