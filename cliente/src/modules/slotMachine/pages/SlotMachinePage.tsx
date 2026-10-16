import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import SlotMachine from "../components/SlotMachine";
import SlotWinnerModal from "../components/SlotWinnerModal";
import { useSlotSpin } from "../utils/useSlotSpin";
import { primeAudio } from "../utils/slotAudio";
import { SlotMunicipio, SlotResult, listSlotMunicipios, spinSlotMachine } from "../services/slotMachine.service";
import { useSlotLive } from "../context/SlotLiveContext";

interface ApiError { response?: { data?: { message?: string } }; }
const errorMessage = (caught: unknown, fallback: string) => (caught as ApiError).response?.data?.message ?? fallback;

const SlotMachinePage: React.FC = () => {
  const slot = useSlotSpin({ withSound: true });
  const { state: liveState, showMachine, hideWinner, hideMachine, markLive } = useSlotLive();
  const [municipios, setMunicipios] = useState<SlotMunicipio[]>([]);
  const [forcedMunicipio, setForcedMunicipio] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [history, setHistory] = useState<SlotResult[]>([]);
  const isLiveOnObs = liveState.active;

  const load = useCallback(async () => {
    try { setMunicipios(await listSlotMunicipios()); }
    catch { toast.error("No fue posible cargar los municipios."); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Al volver al módulo se restaura lo que realmente se está viendo en OBS,
  // para poder ocultarlo aunque el giro se haya hecho en otra sesión.
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const handledSpinRef = useRef<number | null>(null);
  useEffect(() => {
    if (!liveState.active || !liveState.result || handledSpinRef.current === liveState.result.spunAt) return;
    handledSpinRef.current = liveState.result.spunAt;
    slotRef.current.showRevealed(liveState.result);
  }, [liveState]);

  const totalCards = municipios.reduce((sum, item) => sum + item.total, 0);

  const handleSpin = async () => {
    primeAudio();
    setIsSpinning(true);
    try {
      const result = await spinSlotMachine(forcedMunicipio || undefined);
      // Este resultado se anima localmente. Marcarlo antes de actualizar el contexto
      // evita que el efecto de restauración lo trate como un sorteo antiguo y cancele
      // los temporizadores y sonidos recién iniciados.
      handledSpinRef.current = result.spunAt;
      markLive({ active: true, winnerVisible: true, result });
      slot.run(result);
      window.setTimeout(() => {
        setHistory((current) => [result, ...current].slice(0, 8));
        setIsSpinning(false);
      }, slot.totalDurationMs);
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible girar la máquina."));
      setIsSpinning(false);
    }
  };

  const handleHideWinner = async () => {
    try {
      await hideWinner();
      toast.success("Ganador oculto en la transmisión.");
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible ocultar el ganador."));
    }
  };

  const handleShow = async () => {
    try {
      handledSpinRef.current = null;
      slot.reset();
      await showMachine();
      toast.success("Máquina visible y lista en la transmisión.");
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible mostrar la máquina."));
    }
  };

  const handleClose = async () => {
    try {
      await hideMachine();
      handledSpinRef.current = null;
      slot.reset();
      toast.success("Máquina oculta en la transmisión.");
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible ocultar la máquina."));
    }
  };

  return (
    <SlotMachinePageStyle>
      <div className="slot-workspace">
        <section className="machine-card surface-card">
          <SlotMachine
            phase={slot.phase}
            reelMunicipio={slot.reelMunicipio}
            reelCard={slot.reelCard}
            municipioSettled={slot.municipioSettled}
            cardSettled={slot.cardSettled}
            result={slot.result}
            compact
          />
          {slot.showWinner && slot.result && (
            <SlotWinnerModal result={slot.result} onClose={slot.reset} />
          )}
        </section>

        <aside className="control-card surface-card">
          <div className="panel-block">
            <span className="kicker">Sorteo</span>
            <h2>Girar la máquina</h2>
            <p className="hint">Elige un municipio al azar entre los que ya tienen cartones registrados y luego un cartón dentro de ese municipio.</p>

            <label className="field">
              <span>Municipio</span>
              <select value={forcedMunicipio} onChange={(event) => setForcedMunicipio(event.target.value)} disabled={isSpinning}>
                <option value="">Aleatorio entre todos</option>
                {municipios.map((item) => (
                  <option key={item.value} value={item.value}>{item.label} ({item.total})</option>
                ))}
              </select>
            </label>

            <div className="stat-row">
              <div><small>Municipios</small><strong>{municipios.length}</strong></div>
              <div><small>Cartones elegibles</small><strong>{totalCards.toLocaleString("es-CO")}</strong></div>
            </div>

            <div className="actions">
              <AppButton variant="light" icon={isLiveOnObs ? "power-off" : "gamepad"} label={isLiveOnObs ? "Ocultar máquina en OBS" : "Mostrar máquina en OBS"} onClick={isLiveOnObs ? handleClose : handleShow} disabled={isSpinning} />
              <AppButton icon="play" label={isSpinning ? "Girando…" : isLiveOnObs ? "Girar máquina" : "Muestra la máquina para girar"} onClick={handleSpin} disabled={!isLiveOnObs || isSpinning || totalCards === 0} />
              <AppButton variant="light" icon="trophy" label="Ocultar ganador" onClick={handleHideWinner} disabled={!liveState.winnerVisible} />
            </div>
            {totalCards === 0 && <div className="warn-note"><AppIcon icon="triangle-exclamation" />Todavía no hay cartones registrados para sortear.</div>}
          </div>

          <div className="panel-block">
            <span className="kicker">Historial</span>
            {history.length === 0 ? (
              <p className="hint">Los sorteos de esta sesión aparecerán aquí.</p>
            ) : (
              <ul className="history">
                {history.map((item, index) => (
                  <li key={`${item.cardNumber}-${item.spunAt}`} className={index === 0 ? "latest" : ""}>
                    <span className="history-card">N° {item.cardNumber}</span>
                    <span className="history-copy"><strong>{item.nombreCompleto}</strong><small>{item.municipioLabel}</small></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </SlotMachinePageStyle>
  );
};

export default SlotMachinePage;

const SlotMachinePageStyle = styled.div`
  .module-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.25rem; }
  .eyebrow { color: var(--color-secondary); font-size: .62rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .page-heading { margin: .35rem 0 0; font-size: 1.45rem; }
  .live-chip { display: flex; align-items: center; gap: .65rem; padding: .6rem .9rem; background: var(--bg-panel); border: 1px solid var(--border-subtle); border-radius: 13px; }
  .live-chip > div { display: flex; flex-direction: column; line-height: 1.2; }
  .live-chip small { color: var(--text-muted); font-size: .56rem; letter-spacing: .06em; text-transform: uppercase; }
  .live-chip strong { margin-top: .18rem; font-size: .72rem; }
  .live-dot { width: 8px; height: 8px; flex: 0 0 8px; background: var(--text-muted); border-radius: 50%; }
  .live-chip.on .live-dot { background: var(--color-danger); box-shadow: 0 0 0 5px rgba(var(--color-danger-rgb),.12); animation: live-pulse 1.6s infinite; }
  @keyframes live-pulse { 50% { box-shadow: 0 0 0 9px rgba(var(--color-danger-rgb),0); } }

  .slot-workspace { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr); gap: 1.25rem; align-items: start; }
  .machine-card { position: relative; display: grid; min-width: 0; min-height: 552px; place-items: center; padding: 1rem; overflow: hidden; background: radial-gradient(circle at 50% 20%, rgba(124,92,255,.14), transparent 60%), var(--bg-panel); }
  .control-card { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
  .panel-block { padding: 1.2rem 1.3rem; }
  .panel-block + .panel-block { border-top: 1px solid var(--border-subtle); }
  .kicker { color: var(--color-secondary); font-size: .6rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: .35rem 0 .4rem; color: var(--text-primary); font-size: 1rem; font-weight: 600; }
  .hint { margin: 0; color: var(--text-secondary); font-size: .7rem; line-height: 1.55; }
  .field { display: flex; flex-direction: column; gap: .4rem; margin: 1.1rem 0; }
  .field > span { color: var(--text-muted); font-size: .6rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .field select { width: 100%; padding: .65rem .7rem; color: var(--text-primary); background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 10px; outline: 0; font-size: .72rem; cursor: pointer; }
  .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: 1.1rem; }
  .stat-row > div { padding: .7rem .8rem; background: rgba(0,0,0,.15); border: 1px solid var(--border-subtle); border-radius: 11px; }
  .stat-row small { display: block; color: var(--text-muted); font-size: .56rem; text-transform: uppercase; }
  .stat-row strong { display: block; margin-top: .25rem; color: var(--text-primary); font-size: 1.05rem; }
  .actions { display: grid; gap: .5rem; }
  .actions .vs-btn { width: 100%; }
  .warn-note { display: flex; align-items: center; gap: .5rem; margin-top: .9rem; padding: .7rem .85rem; color: var(--color-accent); background: rgba(255,184,77,.08); border: 1px solid rgba(255,184,77,.22); border-radius: 10px; font-size: .68rem; }
  .history { display: flex; flex-direction: column; gap: .5rem; margin: .9rem 0 0; padding: 0; list-style: none; }
  .history li { display: flex; align-items: center; gap: .7rem; padding: .6rem .7rem; background: rgba(255,255,255,.025); border: 1px solid var(--border-subtle); border-radius: 11px; }
  .history li.latest { background: rgba(255,184,77,.07); border-color: rgba(255,184,77,.22); }
  .history-card { padding: .3rem .5rem; color: var(--color-accent); background: rgba(255,184,77,.1); border-radius: 7px; font-size: .66rem; font-weight: 700; white-space: nowrap; }
  .history-copy { display: flex; min-width: 0; flex-direction: column; }
  .history-copy strong { overflow: hidden; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
  .history-copy small { margin-top: .15rem; color: var(--text-muted); font-size: .6rem; }

  @media (max-width: 1000px) { .slot-workspace { grid-template-columns: 1fr; } }
  @media (max-width: 560px) { .module-head { flex-direction: column; align-items: flex-start; } }
`;
