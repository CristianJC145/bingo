import React, { useState } from "react";
import styled from "styled-components";

export interface ShareDatum { label: string; value: number; }

interface ShareBarProps {
  data: ShareDatum[];
  emptyLabel?: string;
}

// Paleta categórica validada contra la superficie #151a23 (3 ranuras, orden fijo).
const CATEGORICAL_SLOTS = ["#7c5cff", "#199e70", "#c98500"];

const ShareBar: React.FC<ShareBarProps> = ({ data, emptyLabel = "Sin datos todavía" }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) return <EmptyState>{emptyLabel}</EmptyState>;

  return (
    <ShareBarStyle>
      <div className="stack">
        {data.map((item, index) => {
          const percent = (item.value / total) * 100;
          if (percent === 0) return null;
          return (
            <span
              key={item.label}
              className="segment"
              style={{ width: `${percent}%`, background: CATEGORICAL_SLOTS[index % CATEGORICAL_SLOTS.length] }}
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === index && (
                <span className="segment-tooltip" role="tooltip">
                  {item.label}: {item.value.toLocaleString("es-CO")} · {Math.round(percent)}%
                </span>
              )}
            </span>
          );
        })}
      </div>

      <ul className="legend">
        {data.map((item, index) => (
          <li key={item.label}>
            <i style={{ background: CATEGORICAL_SLOTS[index % CATEGORICAL_SLOTS.length] }} />
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString("es-CO")}</strong>
            <small>{Math.round((item.value / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </ShareBarStyle>
  );
};

export default ShareBar;

const EmptyState = styled.div`
  display: grid;
  min-height: 100px;
  place-items: center;
  color: var(--text-muted);
  font-size: .7rem;
`;

const ShareBarStyle = styled.div`
  /* El separador entre segmentos es un hueco del color de la superficie, no un borde. */
  .stack { display: flex; gap: 2px; height: 16px; overflow: hidden; border-radius: 4px; }
  .segment { position: relative; height: 100%; transition: filter .15s ease; }
  .segment:hover { filter: brightness(1.15); }
  .segment:first-child { border-radius: 4px 0 0 4px; }
  .segment:last-child { border-radius: 0 4px 4px 0; }
  .segment-tooltip { position: absolute; top: -32px; left: 50%; z-index: 3; padding: .28rem .5rem; color: var(--text-primary); white-space: nowrap; background: var(--bg-panel-raised); border: 1px solid var(--border-strong); border-radius: 7px; transform: translateX(-50%); font-size: .62rem; box-shadow: var(--shadow-float); pointer-events: none; }
  .legend { display: flex; flex-wrap: wrap; gap: .35rem 1rem; margin: .9rem 0 0; padding: 0; list-style: none; }
  .legend li { display: flex; align-items: center; gap: .4rem; }
  .legend i { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 3px; }
  .legend span { color: var(--text-secondary); font-size: .66rem; }
  .legend strong { color: var(--text-primary); font-size: .68rem; font-weight: 600; }
  .legend small { color: var(--text-muted); font-size: .6rem; }
`;
