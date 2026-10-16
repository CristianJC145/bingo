import React, { useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import TemplatePdfPreview from "./TemplatePdfPreview";
import { SavePrintTemplateConfigService } from "../services/printTemplate.service";
import { PrintTemplate, TemplateField, TemplateNumberGrid } from "../types/printTemplate.types";
import { services } from "../../../shared/constant/services";
import { buildSampleCard } from "../utils/sampleCard";

interface TemplateEditorProps {
  template: PrintTemplate;
  onSaved: (template: PrintTemplate) => void;
}

type DragInfo =
  | { kind: "field"; fieldId: string; startClientX: number; startClientY: number; containerWidth: number; containerHeight: number; startXPct: number; startYPct: number }
  | { kind: "gridMove"; startClientX: number; startClientY: number; containerWidth: number; containerHeight: number; startXPct: number; startYPct: number }
  | { kind: "gridResize"; startClientX: number; startClientY: number; containerWidth: number; containerHeight: number; startWidthPct: number; startHeightPct: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const createFieldId = () => `field-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const savePrintTemplateConfigService = new SavePrintTemplateConfigService();

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onSaved }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const [fields, setFields] = useState<TemplateField[]>(template.config.fields);
  const [numberGrid, setNumberGrid] = useState<TemplateNumberGrid>(template.config.numberGrid);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sampleCard] = useState(() => buildSampleCard());

  const imageUrl = `${services.api_url}${template.url}`;
  const sampleValues = Object.fromEntries(fields.filter((field) => field.source === "manual").map((field) => [field.id, field.label]));

  const handlePointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dxPct = ((event.clientX - drag.startClientX) / drag.containerWidth) * 100;
    const dyPct = ((event.clientY - drag.startClientY) / drag.containerHeight) * 100;

    if (drag.kind === "field") {
      setFields((current) => current.map((field) => field.id === drag.fieldId
        ? { ...field, xPct: clamp(drag.startXPct + dxPct, 0, 100), yPct: clamp(drag.startYPct + dyPct, 0, 100) }
        : field));
    } else if (drag.kind === "gridMove") {
      setNumberGrid((current) => ({
        ...current,
        xPct: clamp(drag.startXPct + dxPct, 0, 100 - current.widthPct),
        yPct: clamp(drag.startYPct + dyPct, 0, 100 - current.heightPct),
      }));
    } else if (drag.kind === "gridResize") {
      setNumberGrid((current) => ({
        ...current,
        widthPct: clamp(drag.startWidthPct + dxPct, 12, 100 - current.xPct),
        heightPct: clamp(drag.startHeightPct + dyPct, 12, 100 - current.yPct),
      }));
    }
  };

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", stopDrag);
  };

  const startDrag = (event: React.PointerEvent, drag: DragInfo) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = drag;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
  };

  const beginFieldDrag = (event: React.PointerEvent, field: TemplateField) => {
    setSelectedFieldId(field.id);
    const rect = containerRef.current!.getBoundingClientRect();
    startDrag(event, { kind: "field", fieldId: field.id, startClientX: event.clientX, startClientY: event.clientY, containerWidth: rect.width, containerHeight: rect.height, startXPct: field.xPct, startYPct: field.yPct });
  };

  const beginGridMoveDrag = (event: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    startDrag(event, { kind: "gridMove", startClientX: event.clientX, startClientY: event.clientY, containerWidth: rect.width, containerHeight: rect.height, startXPct: numberGrid.xPct, startYPct: numberGrid.yPct });
  };

  const beginGridResizeDrag = (event: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    startDrag(event, { kind: "gridResize", startClientX: event.clientX, startClientY: event.clientY, containerWidth: rect.width, containerHeight: rect.height, startWidthPct: numberGrid.widthPct, startHeightPct: numberGrid.heightPct });
  };

  const handleAddField = () => {
    const newField: TemplateField = { id: createFieldId(), label: "Nuevo campo", source: "manual", xPct: 50, yPct: 50, fontSize: 12, align: "center", color: "dark" };
    setFields((current) => [...current, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, patch: Partial<TemplateField>) => {
    // Solo un campo puede ser el número de cartón: al activarlo en uno, se desactiva en los demás.
    setFields((current) => current.map((field) => {
      if (field.id !== id) return patch.source === "cardNumber" ? { ...field, source: field.source === "cardNumber" ? "manual" : field.source } : field;
      return { ...field, ...patch };
    }));
  };

  const removeField = (id: string) => {
    setFields((current) => current.filter((field) => field.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await savePrintTemplateConfigService.run({ fields, numberGrid });
      toast.success("Plantilla guardada. Ya puedes usarla para imprimir.");
      onSaved(saved);
    } catch (error) {
      console.error("Error guardando la configuración de la plantilla:", error);
      toast.error("No fue posible guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TemplateEditorStyle>
      <section className="editor-canvas surface-card">
        <div className="canvas-top">
          <div><span className="card-kicker">Editor visual</span><h2>Arrastra los campos y la cuadrícula sobre tu plantilla</h2></div>
          <div className="canvas-legend"><span className="legend-item field">Campo</span><span className="legend-item grid">Numeración</span></div>
        </div>
        <div className="canvas-wrapper" ref={containerRef} style={{ aspectRatio: `${template.width} / ${template.height}` }}>
          <img src={imageUrl} alt="Plantilla" draggable={false} />

          <div
            className="grid-overlay"
            style={{ left: `${numberGrid.xPct}%`, top: `${numberGrid.yPct}%`, width: `${numberGrid.widthPct}%`, height: `${numberGrid.heightPct}%` }}
            onPointerDown={beginGridMoveDrag}
          >
            <div className="grid-lines">{Array.from({ length: 25 }, (_, index) => <span key={index} />)}</div>
            <span className="grid-label">Numeración 5×5</span>
            <div className="resize-handle" onPointerDown={beginGridResizeDrag} />
          </div>

          {fields.map((field) => (
            <div
              key={field.id}
              className={`field-pin ${selectedFieldId === field.id ? "selected" : ""}`}
              style={{ left: `${field.xPct}%`, top: `${field.yPct}%` }}
              onPointerDown={(event) => beginFieldDrag(event, field)}
            >
              {field.label}
            </div>
          ))}
        </div>
      </section>

      <section className="editor-panel surface-card">
        <div className="preview-slot">
          <TemplatePdfPreview size="sm" template={template} config={{ fields, numberGrid }} card={sampleCard} values={sampleValues} />
        </div>

        <div className="panel-block">
          <div className="panel-heading"><span className="card-kicker">Campos de información</span><AppButton icon="plus" variant="light" label="Agregar campo" onClick={handleAddField} /></div>
          {fields.length === 0 && <p className="empty-note">Esta plantilla no tiene campos todavía. Agrega los que necesites (lugar, fecha, hora, lo que sea).</p>}
          <div className="field-list">
            {fields.map((field) => (
              <div className={`field-row ${selectedFieldId === field.id ? "selected" : ""}`} key={field.id} onClick={() => setSelectedFieldId(field.id)}>
                <input className="form-input" value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} />
                <label className="mini-field"><span>Tamaño</span><input type="number" min="4" max="60" className="form-input" value={field.fontSize} onChange={(event) => updateField(field.id, { fontSize: Number(event.target.value) })} /></label>
                <label className="mini-field"><span>Alinear</span>
                  <select className="form-input" value={field.align} onChange={(event) => updateField(field.id, { align: event.target.value as TemplateField["align"] })}>
                    <option value="left">Izq.</option>
                    <option value="center">Centro</option>
                    <option value="right">Der.</option>
                  </select>
                </label>
                <label className="card-number-toggle">
                  <input type="checkbox" checked={field.source === "cardNumber"} onChange={(event) => updateField(field.id, { source: event.target.checked ? "cardNumber" : "manual" })} />
                  <span>N° de cartón</span>
                </label>
                <button type="button" className={`color-toggle ${field.color}`} onClick={() => updateField(field.id, { color: field.color === "dark" ? "light" : "dark" })} title="Color del texto (para fondos claros u oscuros)">
                  {field.color === "dark" ? "Negro" : "Blanco"}
                </button>
                <AppButton icon="trash-alt" variant="transparent" className="delete-field" onClick={() => removeField(field.id)} ariaLabel={`Eliminar ${field.label}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel-block">
          <span className="card-kicker">Numeración (5×5)</span>
          <p className="block-note">Arrastra la caja sobre la plantilla para ubicarla; usa la esquina para ajustar su tamaño. Aquí solo ajustas el tamaño de letra y el espaciado.</p>
          <div className="grid-controls">
            <label><span>Tamaño de número</span><input type="number" min="4" max="60" className="form-input" value={numberGrid.fontSize} onChange={(event) => setNumberGrid((current) => ({ ...current, fontSize: Number(event.target.value) }))} /></label>
            <label><span>Espaciado entre números</span><input type="number" min="0" max="10" step="0.1" className="form-input" value={numberGrid.gapPct} onChange={(event) => setNumberGrid((current) => ({ ...current, gapPct: Number(event.target.value) }))} /></label>
          </div>
        </div>

        <div className="save-btn">
          <AppButton icon="check" label={isSaving ? "Guardando…" : "Guardar plantilla"} onClick={handleSave} disabled={isSaving} />
        </div>
      </section>
    </TemplateEditorStyle>
  );
};

export default TemplateEditor;

const TemplateEditorStyle = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(350px, .75fr);
  gap: 1.25rem;
  align-items: start;
  .editor-canvas { padding: clamp(1rem, 2vw, 1.3rem); }
  .canvas-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: .9rem; }
  .card-kicker { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .35rem 0 0; color: var(--text-primary); font-size: .96rem; font-weight: 600; }
  .canvas-legend { display: flex; gap: .5rem; }
  .legend-item { display: flex; align-items: center; gap: .35rem; color: var(--text-muted); font-size: .58rem; font-weight: 600; }
  .legend-item::before { content: ""; width: 10px; height: 10px; border-radius: 3px; }
  .legend-item.field::before { background: rgba(255,209,102,.95); border: 1.5px solid #7c5cff; }
  .legend-item.grid::before { background: rgba(124,92,255,.2); border: 1.5px dashed #7c5cff; }
  .canvas-wrapper { position: relative; width: 100%; overflow: hidden; background: #0e0e12; border: 1px solid var(--border-subtle); border-radius: 12px; touch-action: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,.02); }
  .canvas-wrapper img { display: block; width: 100%; height: 100%; object-fit: fill; user-select: none; }
  .field-pin { position: absolute; padding: .28rem .5rem; color: #1c1330; white-space: nowrap; background: rgba(255,209,102,.96); border: 2px solid #7c5cff; border-radius: 8px; transform: translate(-50%, -50%); font-size: .6rem; font-weight: 700; cursor: grab; box-shadow: 0 4px 12px rgba(0,0,0,.35); user-select: none; }
  .field-pin:active { cursor: grabbing; }
  .field-pin.selected { border-color: #27d3b2; box-shadow: 0 0 0 3px rgba(39,211,178,.35); }
  .grid-overlay { position: absolute; display: flex; align-items: center; justify-content: center; background: rgba(124,92,255,.14); border: 2px dashed #7c5cff; border-radius: 6px; cursor: grab; }
  .grid-overlay:active { cursor: grabbing; }
  .grid-lines { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(5,1fr); grid-template-rows: repeat(5,1fr); gap: 1px; padding: 2px; }
  .grid-lines span { border: 1px solid rgba(124,92,255,.4); }
  .grid-label { position: relative; z-index: 1; padding: .2rem .5rem; color: #fff; background: rgba(124,92,255,.85); border-radius: 6px; font-size: .58rem; font-weight: 700; pointer-events: none; }
  .resize-handle { position: absolute; right: -6px; bottom: -6px; width: 14px; height: 14px; background: #7c5cff; border: 2px solid #fff; border-radius: 4px; cursor: nwse-resize; }

  .editor-panel { position: sticky; top: 1rem; display: flex; max-height: calc(100vh - 2rem); flex-direction: column; padding: 0; overflow-x: hidden; overflow-y: auto; }
  .preview-slot { display: flex; justify-content: center; padding: .85rem; background: radial-gradient(circle at 50% 0, rgba(var(--color-primary-rgb),.12), rgba(0,0,0,.14) 68%); border-bottom: 1px solid var(--border-subtle); }
  .preview-slot > div { width: 100%; max-width: 126px; }
  .panel-block { padding: 1.1rem 1.2rem; border-bottom: 1px solid var(--border-subtle); }
  .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: .8rem; margin-bottom: .8rem; }
  .empty-note { margin: 0; color: var(--text-muted); font-size: .68rem; line-height: 1.5; }
  .field-list { display: flex; flex-direction: column; gap: .55rem; }
  .field-row { display: grid; grid-template-columns: minmax(0,1fr) 76px 82px; align-items: center; gap: .45rem; padding: .65rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 11px; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
  .field-row:hover { border-color: var(--border-strong); }
  .color-toggle { padding: .4rem .45rem; color: var(--text-primary); white-space: nowrap; background: rgba(255,255,255,.06); border: 1px solid var(--border-subtle); border-radius: 8px; font-size: .56rem; font-weight: 700; cursor: pointer; }
  .color-toggle.light { color: #1c1330; background: #fff; }
  .field-row.selected { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb),.12); }
  .field-row .form-input { min-width: 0; padding: .42rem .45rem; font-size: .66rem; }
  .field-row > .form-input:first-child { grid-column: 1 / 3; }
  .field-row .mini-field:nth-of-type(1) { grid-column: 1; }
  .field-row .mini-field:nth-of-type(2) { grid-column: 2 / 4; }
  .field-row .card-number-toggle { grid-column: 1 / 3; }
  .field-row .color-toggle { grid-column: 3; }
  .mini-field { display: flex; flex-direction: column; gap: .18rem; }
  .mini-field span { color: var(--text-muted); font-size: .52rem; text-transform: uppercase; }
  .card-number-toggle { display: flex; align-items: center; gap: .28rem; color: var(--text-muted); font-size: .56rem; white-space: nowrap; }
  .delete-field { grid-column: 3; grid-row: 1; }
  .delete-field .vs-btn { width: 100%; min-height: 31px; color: var(--color-danger); }
  .block-note { margin: .3rem 0 .8rem; color: var(--text-muted); font-size: .66rem; line-height: 1.5; }
  .grid-controls { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
  .grid-controls label { display: flex; flex-direction: column; gap: .3rem; }
  .grid-controls span { color: var(--text-muted); font-size: .58rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
  .save-btn { padding: 1.1rem 1.2rem; }
  .save-btn .vs-btn { width: 100%; }
  @media (max-width: 1050px) { grid-template-columns: 1fr; }
`;
