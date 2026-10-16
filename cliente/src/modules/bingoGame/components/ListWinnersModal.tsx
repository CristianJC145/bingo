import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import AppIcon from "../../../shared/components/AppIcon";
import AppModal from "../../../shared/components/AppModal";
import BingoTable from "./BingoTable";

interface Card {
  id: number;
  pattern: number[][];
  patternFigure: boolean[][];
}

interface ListWinnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Card[];
  drawNumbers: number[];
}

const ListWinnerModal: React.FC<ListWinnerModalProps> = ({ isOpen, onClose, winner, drawNumbers }) => {
  const data = useMemo<Card[]>(() => winner.map((win) => ({
    ...win,
    pattern: typeof win.pattern === "string" ? JSON.parse(win.pattern) : win.pattern,
  })), [winner]);
  const [currentWinnerId, setCurrentWinnerId] = useState<number | null>(null);

  useEffect(() => {
    if (data.length && !data.some((item) => item.id === currentWinnerId)) setCurrentWinnerId(data[0].id);
  }, [currentWinnerId, data]);

  const currentWinner = data.find((item) => item.id === currentWinnerId) ?? data[0];
  if (!currentWinner) return null;

  const matchedNumbers = currentWinner.pattern.flat().filter((number) => number > 0 && drawNumbers.includes(number)).length;
  const requiredCells = currentWinner.patternFigure.flat().filter(Boolean).length;

  return (
    <ListWinnerModalStyle>
      <AppModal size="md" title="Ganadores de la partida" isOpen={isOpen} onClose={onClose}>
        <div className="modal-summary">
          <div className="summary-icon"><AppIcon icon="trophy" /></div>
          <div><strong>{data.length} {data.length === 1 ? "cartón ganador" : "cartones ganadores"}</strong><span>Selecciona un cartón para revisar la combinación que completó la figura.</span></div>
          <span className="verified"><AppIcon icon="check" /> Verificados</span>
        </div>

        <div className="winners-layout">
          <aside className="winner-list">
            <div className="list-heading"><span>Cartones</span><small>{data.length} resultado{data.length === 1 ? "" : "s"}</small></div>
            <div className="list-scroll">
              {data.map((win, index) => (
                <button
                  type="button"
                  className={`winner-item ${currentWinner.id === win.id ? "selected" : ""}`}
                  key={win.id}
                  onClick={() => setCurrentWinnerId(win.id)}
                >
                  <span className="winner-position">{String(index + 1).padStart(2, "0")}</span>
                  <span className="winner-name"><small>Cartón</small><strong>#{String(win.id).padStart(4, "0")}</strong></span>
                  <span className="winner-check"><AppIcon icon={currentWinner.id === win.id ? "check" : "angle-right"} /></span>
                </button>
              ))}
            </div>
          </aside>

          <section className="winner-detail">
            <div className="card-stage"><BingoTable cardId={currentWinner.id} patternFigure={currentWinner.patternFigure} pattern={currentWinner.pattern} drawnNumbers={drawNumbers} /></div>
            <div className="winner-insights">
              <span className="insight-kicker">Resultado</span>
              <h4>Figura completada</h4>
              <p>Las casillas iluminadas muestran la combinación ganadora.</p>
              <div className="insight-stat"><span><AppIcon icon="check" /> Aciertos del cartón</span><strong>{matchedNumbers}</strong></div>
              <div className="insight-stat"><span><AppIcon icon="star" /> Casillas requeridas</span><strong>{requiredCells || "—"}</strong></div>
              <div className="drawn-preview"><small>Últimas balotas</small><div>{drawNumbers.slice(-5).reverse().map((number) => <span key={number}>{number}</span>)}</div></div>
            </div>
          </section>
        </div>
      </AppModal>
    </ListWinnerModalStyle>
  );
};

export default ListWinnerModal;

const ListWinnerModalStyle = styled.div`
  .modal-summary { display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: .8rem; margin-bottom: 1rem; padding: .8rem; background: linear-gradient(110deg,rgba(255,184,77,.09),rgba(124,92,255,.05)); border: 1px solid rgba(255,184,77,.16); border-radius: 13px; }
  .summary-icon { display: grid; width: 38px; height: 38px; place-items: center; color: #ffc15b; background: rgba(255,184,77,.1); border-radius: 10px; }
  .modal-summary > div:nth-child(2) { display: flex; min-width: 0; flex-direction: column; }
  .modal-summary strong { color: #f5f7fb; font-size: .72rem; }
  .modal-summary span:not(.verified) { margin-top: .15rem; color: var(--text-muted); font-size: .58rem; }
  .verified { display: flex; align-items: center; gap: .3rem; padding: .35rem .5rem; color: #65dfca; background: rgba(75,221,201,.08); border: 1px solid rgba(75,221,201,.14); border-radius: 8px; font-size: .5rem; font-weight: 700; text-transform: uppercase; }
  .winners-layout { display: grid; grid-template-columns: 190px minmax(0,1fr); gap: 1rem; }
  .winner-list { min-width: 0; padding: .8rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 15px; }
  .list-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: .65rem; padding: 0 .2rem; }
  .list-heading span { color: var(--text-secondary); font-size: .58rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  .list-heading small { color: var(--text-muted); font-size: .5rem; }
  .list-scroll { display: flex; max-height: 360px; overflow-y: auto; flex-direction: column; gap: .4rem; padding-right: .2rem; }
  .winner-item { display: grid; width: 100%; grid-template-columns: 27px 1fr 24px; align-items: center; gap: .55rem; padding: .58rem; color: var(--text-muted); text-align: left; background: rgba(255,255,255,.025); border: 1px solid transparent; border-radius: 10px; cursor: pointer; transition: .16s ease; }
  .winner-item:hover { color: var(--text-secondary); background: rgba(255,255,255,.045); border-color: var(--border-subtle); }
  .winner-item.selected { color: #fff; background: linear-gradient(110deg,rgba(124,92,255,.15),rgba(124,92,255,.05)); border-color: rgba(124,92,255,.3); }
  .winner-position { display: grid; width: 27px; height: 27px; place-items: center; color: #7d8798; background: #202733; border-radius: 7px; font-size: .48rem; font-weight: 700; }
  .winner-item.selected .winner-position { color: #fff; background: var(--color-primary); }
  .winner-name { display: flex; min-width: 0; flex-direction: column; }
  .winner-name small { font-size: .46rem; text-transform: uppercase; }
  .winner-name strong { margin-top: .08rem; font-size: .65rem; }
  .winner-check { display: grid; width: 22px; height: 22px; place-items: center; color: #7e8999; font-size: .55rem; }
  .winner-item.selected .winner-check { color: #65dfca; background: rgba(75,221,201,.08); border-radius: 50%; }
  .winner-detail { display: grid; min-width: 0; grid-template-columns: minmax(290px,390px) minmax(130px,1fr); gap: .9rem; align-items: stretch; }
  .card-stage { display: grid; min-width: 0; place-items: center; padding: .65rem; background: radial-gradient(circle at 50% 50%,rgba(124,92,255,.1),transparent 66%); border-radius: 16px; }
  .winner-insights { display: flex; min-width: 0; flex-direction: column; padding: .9rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 15px; }
  .insight-kicker { color: #65dfca; font-size: .5rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
  .winner-insights h4 { margin: .32rem 0 .25rem; color: #f4f6fa; font-size: .78rem; }
  .winner-insights p { margin: 0 0 .8rem; color: var(--text-muted); font-size: .55rem; line-height: 1.5; }
  .insight-stat { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .55rem 0; border-top: 1px solid var(--border-subtle); }
  .insight-stat span { display: flex; align-items: center; gap: .35rem; color: var(--text-secondary); font-size: .52rem; }
  .insight-stat svg { color: #9e8dff; }
  .insight-stat strong { color: #fff; font-size: .72rem; }
  .drawn-preview { margin-top: auto; padding-top: .75rem; border-top: 1px solid var(--border-subtle); }
  .drawn-preview small { color: var(--text-muted); font-size: .48rem; text-transform: uppercase; }
  .drawn-preview > div { display: flex; flex-wrap: wrap; gap: .25rem; margin-top: .4rem; }
  .drawn-preview span { display: grid; width: 23px; height: 23px; place-items: center; color: #ffd083; background: rgba(255,184,77,.08); border: 1px solid rgba(255,184,77,.14); border-radius: 7px; font-size: .48rem; font-weight: 700; }
  .list-scroll::-webkit-scrollbar { width: 4px; }
  .list-scroll::-webkit-scrollbar-thumb { background: #454f60; border-radius: 99px; }
  @media (max-width: 760px) { .winners-layout { grid-template-columns: 1fr; } .winner-list { padding: .6rem; } .list-scroll { max-height: none; overflow-x: auto; flex-direction: row; } .winner-item { min-width: 145px; } .winner-detail { grid-template-columns: minmax(260px,1fr) minmax(130px,.55fr); } }
  @media (max-width: 560px) { .modal-summary { grid-template-columns: 38px 1fr; } .verified { display: none; } .winner-detail { grid-template-columns: 1fr; } .winner-insights { gap: .15rem; } }
`;
