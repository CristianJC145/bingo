import React, { useEffect, useState } from "react";
import styled from "styled-components";

interface CartonRangeSelectorProps {
  onSelectRange: (range: { start?: number; end?: number; specific?: number[] }) => void;
  onCardsRangue: boolean;
  gameReset: boolean;
  disabled?: boolean;
  initialRange?: { start?: number; end?: number; specific?: number[] };
}

const CartonRangeSelector: React.FC<CartonRangeSelectorProps> = ({ onSelectRange, onCardsRangue, gameReset, disabled = false, initialRange }) => {
  const [start, setStart] = useState<number | "">(initialRange?.start || "");
  const [end, setEnd] = useState<number | "">(initialRange?.end || "");
  const [manualCartons, setManualCartons] = useState(initialRange?.specific?.length ? initialRange.specific.join(", ") : "");

  const emitRange = () => {
    if (typeof start === "number" && typeof end === "number") onSelectRange({ start, end });
    else onSelectRange({ start: 0, end: 0, specific: [] });
  };

  const emitSpecific = () => {
    const cartons = manualCartons.split(/[\s,;]+/).map(Number).filter((number) => Number.isFinite(number) && number > 0);
    onSelectRange({ specific: cartons });
  };

  useEffect(() => {
    if (gameReset) { setStart(""); setEnd(""); setManualCartons(""); }
  }, [gameReset]);

  return (
    <CartonRangeSelectorStyle>
      {!onCardsRangue ? (
        <div className="range-fields">
          <label><span>Desde</span><input disabled={disabled} type="number" min="1" value={start} onChange={(event) => setStart(event.target.value ? Number(event.target.value) : "")} onBlur={emitRange} placeholder="Ej. 1" className="form-input" /></label>
          <label><span>Hasta</span><input disabled={disabled} type="number" min="1" value={end} onChange={(event) => setEnd(event.target.value ? Number(event.target.value) : "")} onBlur={emitRange} placeholder="Ej. 250" className="form-input" /></label>
        </div>
      ) : (
        <label className="specific-field"><span>Números de cartón</span><textarea disabled={disabled} value={manualCartons} placeholder="101, 104, 208…" className="selector-manual" onChange={(event) => setManualCartons(event.target.value)} onBlur={emitSpecific} /><small>Separa los números con comas, espacios o saltos de línea.</small></label>
      )}
    </CartonRangeSelectorStyle>
  );
};

export default CartonRangeSelector;

const CartonRangeSelectorStyle = styled.div`
  .range-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
  label { display: flex; flex-direction: column; gap: .35rem; }
  label > span { color: var(--text-muted); font-size: .62rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .form-input { min-width: 0; }
  .specific-field textarea { min-height: 90px; resize: vertical; }
  .specific-field small { color: var(--text-muted); font-size: .58rem; line-height: 1.45; }
`;
