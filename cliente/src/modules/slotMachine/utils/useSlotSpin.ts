import { useCallback, useEffect, useRef, useState } from "react";
import { SlotResult } from "../services/slotMachine.service";
import { SlotPhase } from "../components/SlotMachine";
import { playReelStop, playWinFanfare, playWinnerReveal, startSpinLoop, stopSpinLoop } from "./slotAudio";

/** Etiquetas fijas: el overlay de OBS no está autenticado y no puede pedir catálogos. */
export const MUNICIPIO_LABELS = [
  "Colón", "San Francisco", "Santiago", "Sibundoy", "Mocoa", "Puerto Guzmán",
  "Villagarzón", "Orito", "Puerto Asís", "Puerto Caicedo", "Puerto Leguízamo",
  "San Miguel", "Valle del Guamuez",
];

const MUNICIPIO_SETTLE_MS = 2600;
const CARD_SETTLE_MS = 4600;
/** Pausa tras revelar los rodillos para que el público alcance a leer el resultado en la máquina. */
const WINNER_MODAL_DELAY_MS = 2500;
const REEL_INTERVAL_MS = 80;

interface SlotSpinState {
  phase: SlotPhase;
  reelMunicipio: string;
  reelCard: string;
  municipioSettled: boolean;
  cardSettled: boolean;
  /** Solo entonces se muestra la celebración del cartón ganador. */
  showWinner: boolean;
  result: SlotResult | null;
}

const initialState: SlotSpinState = {
  phase: "idle",
  reelMunicipio: "—",
  reelCard: "—",
  municipioSettled: false,
  cardSettled: false,
  showWinner: false,
  result: null,
};

export const useSlotSpin = (options?: { withSound?: boolean }) => {
  const withSound = options?.withSound ?? true;
  const [state, setState] = useState<SlotSpinState>(initialState);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopSpinLoop();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setState(initialState);
  }, [clearTimers]);

  /** Arranca la animación con un resultado ya resuelto por el servidor. */
  const run = useCallback((result: SlotResult) => {
    clearTimers();
    if (withSound) startSpinLoop();

    setState({ ...initialState, phase: "spinning", result });

    intervalRef.current = window.setInterval(() => {
      setState((current) => {
        if (current.municipioSettled && current.cardSettled) return current;
        return {
          ...current,
          reelMunicipio: current.municipioSettled
            ? current.reelMunicipio
            : MUNICIPIO_LABELS[Math.floor(Math.random() * MUNICIPIO_LABELS.length)],
          reelCard: current.cardSettled
            ? current.reelCard
            : String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0"),
        };
      });
    }, REEL_INTERVAL_MS);

    timersRef.current.push(window.setTimeout(() => {
      if (withSound) playReelStop();
      setState((current) => ({ ...current, municipioSettled: true }));
    }, MUNICIPIO_SETTLE_MS));

    timersRef.current.push(window.setTimeout(() => {
      if (withSound) { playReelStop(); playWinFanfare(); }
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopSpinLoop();
      setState((current) => ({ ...current, cardSettled: true, phase: "revealed" }));
    }, CARD_SETTLE_MS));

    // La celebración entra después, para no tapar el resultado en la máquina.
    timersRef.current.push(window.setTimeout(() => {
      if (withSound) playWinnerReveal();
      setState((current) => ({ ...current, showWinner: true }));
    }, CARD_SETTLE_MS + WINNER_MODAL_DELAY_MS));
  }, [clearTimers, withSound]);

  /** Restaura directamente un resultado ya revelado (reconexión de OBS). */
  const showRevealed = useCallback((result: SlotResult) => {
    clearTimers();
    setState({
      phase: "revealed",
      reelMunicipio: result.municipioLabel,
      reelCard: String(result.cardNumber).padStart(4, "0"),
      municipioSettled: true,
      cardSettled: true,
      showWinner: true,
      result,
    });
  }, [clearTimers]);

  return { ...state, run, reset, showRevealed, totalDurationMs: CARD_SETTLE_MS + WINNER_MODAL_DELAY_MS };
};
