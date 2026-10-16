import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import BingoCardVisual from "../../../shared/components/BingoCardVisual";
import { CreateOrUpdateFigureService } from "../services/createOrUpdateFigure.service";
import { GetAllFiguresService } from "../services/getAllFigures.service";

interface Figure { id: number; name: string; pattern: boolean[][]; }
interface FigureEditorProps { id?: number; onClose: () => void; onSave: () => void; }
const createOrUpdateFigureService = new CreateOrUpdateFigureService();
const getAllFiguresService = new GetAllFiguresService();
const emptyPattern = () => Array.from({ length: 5 }, () => Array(5).fill(false));

const FigureEditor: React.FC<FigureEditorProps> = ({ id, onClose, onSave }) => {
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState<boolean[][]>(emptyPattern());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setName(""); setPattern(emptyPattern()); return; }
    getAllFiguresService.run().then((result) => {
      const figure = result.data.find((item: Figure) => item.id === id);
      if (figure) { setName(figure.name); setPattern(figure.pattern); }
    });
  }, [id]);

  const handlePatternChange = (rowIndex: number, columnIndex: number) => {
    if (rowIndex === 2 && columnIndex === 2) return;
    setPattern((current) => current.map((row, currentRow) => row.map((cell, currentColumn) => currentRow === rowIndex && currentColumn === columnIndex ? !cell : cell)));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    try {
      await createOrUpdateFigureService.run({ data: { name: name.trim(), pattern, ...(id && { id }) } });
      toast.success(id ? "Figura actualizada correctamente" : `Figura “${name.trim()}” creada`);
      onSave();
      onClose();
    } catch {
      toast.error("No fue posible guardar la figura.");
    }
  };

  return (
    <FigureEditorStyle>
      <label className="name-field"><span>Nombre de la figura</span><input type="text" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} placeholder="Ej. Cuatro esquinas" className={`form-input ${error ? "error" : ""}`} />{error && <small>{error}</small>}</label>
      <div className="editor-label"><div><strong>Diseña el patrón</strong><small>Selecciona todas las casillas necesarias para ganar.</small></div><span>{pattern.flat().filter(Boolean).length} casillas</span></div>
      <div className="pattern-card"><BingoCardVisual selected={pattern} interactive onCellClick={handlePatternChange} label="Editor de figura" /></div>
      <div className="editor-actions"><AppButton variant="transparent" label="Cancelar" onClick={onClose} /><AppButton icon="check" label={id ? "Guardar cambios" : "Crear figura"} onClick={handleSave} /></div>
    </FigureEditorStyle>
  );
};

export default FigureEditor;

const FigureEditorStyle = styled.div`
  .name-field { display: flex; flex-direction: column; gap: .4rem; }
  .name-field > span { color: var(--text-muted); font-size: .62rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
  .name-field small { color: var(--color-danger); font-size: .6rem; }
  .form-input.error { border-color: rgba(var(--color-danger-rgb),.6) !important; }
  .editor-label { display: flex; align-items: flex-end; justify-content: space-between; margin: 1.25rem 0 .8rem; }
  .editor-label > div { display: flex; flex-direction: column; }
  .editor-label strong { font-size: .76rem; font-weight: 600; }
  .editor-label small { margin-top: .2rem; color: var(--text-muted); font-size: .6rem; }
  .editor-label > span { color: #b7a8ff; font-size: .6rem; }
  .pattern-card { display: flex; justify-content: center; }
  .editor-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-subtle); }
`;
