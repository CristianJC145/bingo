import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { toast } from "react-toastify";
import AppButton from "../../../shared/components/Buttons/AppButton";
import AppIcon from "../../../shared/components/AppIcon";
import {
  WinnerRouletteState,
  cancelWinnerRoulette,
  confirmWinnerRoulette,
  getWinnerRoulette,
  spinWinnerRoulette,
} from "../services/winnerRoulette.service";
import { primeRouletteAudio } from "../utils/rouletteAudio";

interface WinnerRouletteControlProps {
  /** Se llama cuando el sorteo termina y la celebración normal debe continuar. */
  onResolved: (cardNumber: number) => void;
  onCancelled: () => void;
}

interface ApiError { response?: { data?: { message?: string } }; }
const errorMessage = (caught: unknown, fallback: string) => (caught as ApiError).response?.data?.message ?? fallback;

/**
 * Panel de mando del sorteo. Aparece solo cuando el bingo deja varios ganadores y
 * es el administrador quien decide cuándo gira la ruleta y cuándo se revela.
 */
const WinnerRouletteControl: React.FC<WinnerRouletteControlProps> = ({ onResolved, onCancelled }) => {
  const [state, setState] = useState<WinnerRouletteState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  /** Cuenta atrás visible mientras la rueda gira en la transmisión. */
  const [remaining, setRemaining] = useState(0);
  const countdownRef = useRef<number>();

  const load = async () => {
    try { setState(await getWinnerRoulette()); }
    catch { /* Si falla, el siguiente ciclo lo reintenta. */ }
  };

  useEffect(() => {
    load();
    // El estado real vive en el servidor: también avanza por su propio temporizador.
    const poll = window.setInterval(load, 2000);
    return () => { window.clearInterval(poll); window.clearTimeout(countdownRef.current); };
  }, []);

  const handleSpin = async () => {
    setIsBusy(true);
    primeRouletteAudio();
    try {
      const spun = await spinWinnerRoulette();
      setState(spun);
      const duration = Number(spun.spinDurationMs) || 7200;
      const endsAt = Date.now() + duration;
      const tick = () => {
        const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
        setRemaining(left);
        if (left > 0) countdownRef.current = window.setTimeout(tick, 250);
        else load();
      };
      tick();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible girar la ruleta."));
    } finally { setIsBusy(false); }
  };

  const handleConfirm = async () => {
    setIsBusy(true);
    try {
      const result = await confirmWinnerRoulette();
      toast.success(`Ganador del sorteo: cartón N° ${result.cardNumber}.`);
      onResolved(result.cardNumber);
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible confirmar el ganador."));
    } finally { setIsBusy(false); }
  };

  const handleCancel = async () => {
    setIsBusy(true);
    try {
      await cancelWinnerRoulette();
      onCancelled();
    } catch (caught) {
      toast.error(errorMessage(caught, "No fue posible cancelar el sorteo."));
    } finally { setIsBusy(false); }
  };

  if (!state?.active) {
    return <WinnerRouletteControlStyle><div className="state"><AppIcon icon="rotate" className="spin" />Cargando sorteo…</div></WinnerRouletteControlStyle>;
  }

  const isSpinning = state.phase === "spinning" && remaining > 0;
  const winner = state.winnerIndex !== null ? state.candidates[state.winnerIndex] : null;
  const isResolved = winner !== null && !isSpinning;

  return (
    <WinnerRouletteControlStyle>
      <div className="intro">
        <span className="badge"><AppIcon icon="trophy" /> {state.candidates.length} cartones empatados</span>
        <p>
          {isResolved
            ? "La ruleta ya paró. Al confirmar, la transmisión pasa a la celebración del ganador."
            : isSpinning
              ? "La ruleta está girando en la transmisión."
              : "Nadie ha ganado todavía: el premio se sortea entre los cartones empatados."}
        </p>
      </div>

      <div className="candidate-grid">
        {state.candidates.map((candidate, index) => (
          <div className={`candidate ${isResolved && index === state.winnerIndex ? "is-winner" : ""}`} key={candidate.cardNumber}>
            <strong>N° {candidate.cardNumber}</strong>
            <small>{candidate.nombreCompleto ?? "Sin registrar"}</small>
            {isResolved && index === state.winnerIndex && <span className="crown"><AppIcon icon="trophy" /></span>}
          </div>
        ))}
      </div>

      {isSpinning && (
        <div className="spinning-note">
          <AppIcon icon="rotate" className="spin" />
          <span>Girando… <b>{remaining}s</b></span>
        </div>
      )}

      {isResolved && winner && (
        <div className="result">
          <span>Ganador sorteado</span>
          <strong>N° {winner.cardNumber}</strong>
          {winner.nombreCompleto && <em>{winner.nombreCompleto}</em>}
        </div>
      )}

      <div className="actions">
        <AppButton variant="transparent" label="Cancelar sorteo" onClick={handleCancel} disabled={isBusy || isSpinning} />
        {isResolved
          ? <AppButton icon="check" label="Mostrar ganador" onClick={handleConfirm} disabled={isBusy} />
          : <AppButton icon="rotate" label={isSpinning ? "Girando…" : "Girar ruleta"} onClick={handleSpin} disabled={isBusy || isSpinning} />}
      </div>
    </WinnerRouletteControlStyle>
  );
};

export default WinnerRouletteControl;

const WinnerRouletteControlStyle = styled.div`
  .state { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: 2rem; color: var(--text-muted); font-size: .74rem; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .intro { margin-bottom: 1rem; }
  .badge { display: inline-flex; align-items: center; gap: .4rem; padding: .3rem .7rem; color: var(--color-accent); background: rgba(255,184,77,.1); border: 1px solid rgba(255,184,77,.26); border-radius: 99px; font-size: .62rem; font-weight: 700; }
  .intro p { margin: .6rem 0 0; color: var(--text-muted); font-size: .72rem; line-height: 1.5; }

  .candidate-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .5rem; max-height: 210px; overflow-y: auto; padding-right: .2rem; }
  .candidate { position: relative; padding: .55rem .7rem; background: rgba(0,0,0,.18); border: 1px solid var(--border-subtle); border-radius: 10px; }
  .candidate strong { display: block; color: var(--text-primary); font-size: .76rem; }
  .candidate small { display: block; margin-top: .2rem; overflow: hidden; color: var(--text-muted); font-size: .6rem; text-overflow: ellipsis; white-space: nowrap; }
  .candidate.is-winner { background: rgba(255,216,94,.1); border-color: rgba(255,216,94,.45); }
  .candidate.is-winner strong { color: #ffd85e; }
  .crown { position: absolute; top: .4rem; right: .45rem; color: #ffd85e; font-size: .6rem; }

  .spinning-note { display: flex; align-items: center; justify-content: center; gap: .5rem; margin-top: .9rem; padding: .6rem; color: var(--color-accent); background: rgba(255,184,77,.08); border: 1px solid rgba(255,184,77,.22); border-radius: 10px; font-size: .7rem; }

  .result { display: flex; flex-direction: column; align-items: center; gap: .15rem; margin-top: .9rem; padding: .85rem; background: linear-gradient(160deg, rgba(201,24,42,.16), rgba(109,10,22,.16)); border: 1px solid rgba(255,207,92,.4); border-radius: 12px; }
  .result > span { color: #ffd166; font-size: .56rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
  .result strong { color: #fff; font-family: "Poppins", sans-serif; font-size: 1.3rem; font-weight: 800; }
  .result em { color: #ffe9a8; font-size: .78rem; font-style: normal; font-weight: 600; }

  .actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.1rem; }
`;
