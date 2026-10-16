import React, { useState } from "react";
import styled from "styled-components";

export interface BarDatum {
  label: string;
  value: number;
  /** Color de la marca. Si se omite se usa el hue único de magnitud. */
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Total de referencia para el tooltip (porcentaje). Por defecto, la suma. */
  totalForShare?: number;
  emptyLabel?: string;
  valueSuffix?: string;
}

// Hue único para magnitud de una sola serie (paleta validada contra la superficie #151a23).
const MAGNITUDE_HUE = "#7c5cff";

const BarChart: React.FC<BarChartProps> = ({ data, totalForShare, emptyLabel = "Sin datos todavía", valueSuffix = "" }) => {
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0 || data.every((item) => item.value === 0)) {
    return <EmptyState>{emptyLabel}</EmptyState>;
  }

  const max = Math.max(...data.map((item) => item.value));
  const total = totalForShare ?? data.reduce((sum, item) => sum + item.value, 0);

  return (
    <BarChartStyle>
      {data.map((item, index) => {
        const widthPercent = max > 0 ? (item.value / max) * 100 : 0;
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div
            className={`bar-row ${hovered === index ? "is-hovered" : ""}`}
            key={item.label}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="bar-label" title={item.label}>{item.label}</span>
            <div className="bar-track">
              <span className="bar-fill" style={{ width: `${Math.max(widthPercent, item.value > 0 ? 2 : 0)}%`, background: item.color ?? MAGNITUDE_HUE }} />
              {hovered === index && (
                <span className="bar-tooltip" role="tooltip">
                  {item.value.toLocaleString("es-CO")}{valueSuffix} · {share}%
                </span>
              )}
            </div>
            <span className="bar-value">{item.value.toLocaleString("es-CO")}</span>
          </div>
        );
      })}
    </BarChartStyle>
  );
};

export default BarChart;

const EmptyState = styled.div`
  display: grid;
  min-height: 140px;
  place-items: center;
  color: var(--text-muted);
  font-size: .7rem;
`;

const BarChartStyle = styled.div`
  display: flex;
  flex-direction: column;
  gap: .55rem;
  .bar-row { display: grid; grid-template-columns: minmax(88px, 128px) minmax(0, 1fr) auto; align-items: center; gap: .7rem; }
  .bar-label { overflow: hidden; color: var(--text-secondary); font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }
  .bar-track { position: relative; height: 14px; background: rgba(255,255,255,.045); border-radius: 4px; }
  /* Marca fina, extremo redondeado y base cuadrada anclada al eje. */
  .bar-fill { display: block; height: 100%; border-radius: 0 4px 4px 0; transition: width .35s ease, filter .15s ease; }
  .bar-row.is-hovered .bar-fill { filter: brightness(1.15); }
  .bar-value { min-width: 42px; color: var(--text-primary); font-size: .7rem; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
  .bar-tooltip { position: absolute; top: -30px; left: 0; z-index: 3; padding: .28rem .5rem; color: var(--text-primary); white-space: nowrap; background: var(--bg-panel-raised); border: 1px solid var(--border-strong); border-radius: 7px; font-size: .62rem; box-shadow: var(--shadow-float); pointer-events: none; }
  @media (max-width: 520px) { .bar-row { grid-template-columns: minmax(70px, 96px) minmax(0, 1fr) auto; gap: .5rem; } }
`;
