import React, { useState } from "react";
import styled from "styled-components";
import type { RangeQuery } from "../services/getBingoCardsByRange.service";

interface PrintRangeSelectorProps {
  onChange: (range: RangeQuery) => void;
}

const PrintRangeSelector: React.FC<PrintRangeSelectorProps> = ({ onChange }) => {
  const [mode, setMode] = useState<"range" | "specific">("range");
  const [start, setStart] = useState<number | "">("");
  const [end, setEnd] = useState<number | "">("");
  const [specificText, setSpecificText] = useState("");

  const emitRange = (nextStart: number | "" = start, nextEnd: number | "" = end) => {
    if (typeof nextStart === "number" && typeof nextEnd === "number" && nextStart > 0 && nextEnd >= nextStart) onChange({ start: nextStart, end: nextEnd });
    else onChange({});
  };

  const emitSpecific = (text: string = specificText) => {
    const ids = text.split(/[\s,;]+/).map(Number).filter((value) => Number.isFinite(value) && value > 0);
    onChange({ specific: ids });
  };

  const switchMode = (nextMode: "range" | "specific") => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === "range") emitRange();
    else emitSpecific();
  };

  return (
    <PrintRangeSelectorStyle>
      <div className="segment-control">
        <button className={mode === "range" ? "active" : ""} onClick={() => switchMode("range")}>Por rango</button>
        <button className={mode === "specific" ? "active" : ""} onClick={() => switchMode("specific")}>Específicos</button>
      </div>

      {mode === "range" ? (
        <div className="range-fields">
          <label><span>Desde</span><input type="number" min="1" className="form-input" value={start} onChange={(event) => setStart(event.target.value ? Number(event.target.value) : "")} onBlur={() => emitRange()} placeholder="Ej. 1" /></label>
          <label><span>Hasta</span><input type="number" min="1" className="form-input" value={end} onChange={(event) => setEnd(event.target.value ? Number(event.target.value) : "")} onBlur={() => emitRange()} placeholder="Ej. 1000" /></label>
        </div>
      ) : (
        <label className="specific-field">
          <span>Números de cartón</span>
          <textarea className="selector-manual" value={specificText} placeholder="101, 104, 208…" onChange={(event) => setSpecificText(event.target.value)} onBlur={() => emitSpecific()} />
          <small>Separa los números con comas, espacios o saltos de línea.</small>
        </label>
      )}
    </PrintRangeSelectorStyle>
  );
};

export default PrintRangeSelector;

const PrintRangeSelectorStyle = styled.div`
  .segment-control { display: grid; grid-template-columns: 1fr 1fr; gap: .25rem; margin-bottom: .9rem; padding: .25rem; background: rgba(0,0,0,.22); border-radius: 11px; }
  .segment-control button { padding: .6rem .5rem; color: var(--text-muted); background: transparent; border: 0; border-radius: 8px; font-size: .7rem; font-weight: 600; cursor: pointer; }
  .segment-control button.active { color: #fff; background: var(--bg-soft); box-shadow: 0 2px 8px rgba(0,0,0,.16); }
  .range-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
  label { display: flex; flex-direction: column; gap: .35rem; }
  label > span { color: var(--text-muted); font-size: .62rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .specific-field textarea { min-height: 90px; resize: vertical; }
  .specific-field small { color: var(--text-muted); font-size: .6rem; line-height: 1.45; }
`;
