import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  SlotState,
  closeSlotMachine as closeMachineRequest,
  closeSlotWinner as closeWinnerRequest,
  getSlotState,
  openSlotMachine as openMachineRequest,
} from "../services/slotMachine.service";
import { useAuth } from "../../auth/context/AuthContext";

interface SlotLiveValue {
  state: SlotState;
  refresh: () => Promise<void>;
  showMachine: () => Promise<void>;
  hideWinner: () => Promise<void>;
  hideMachine: () => Promise<void>;
  /** Actualización optimista tras un giro, sin esperar al siguiente sondeo. */
  markLive: (state: SlotState) => void;
}

const emptyState: SlotState = { active: false, winnerVisible: false, result: null };
const POLL_INTERVAL_MS = 10000;

const SlotLiveContext = createContext<SlotLiveValue | undefined>(undefined);

export const SlotLiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  const [state, setState] = useState<SlotState>(emptyState);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    try { setState(await getSlotState()); }
    catch { /* La transmisión no es crítica para el resto de la app. */ }
  }, [isAdmin]);

  // Se sondea para que el aviso siga siendo fiel aunque la máquina se controle desde otra pestaña.
  useEffect(() => {
    if (!isAdmin) { setState(emptyState); return; }
    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAdmin, refresh]);

  const hideWinner = useCallback(async () => {
    await closeWinnerRequest();
    setState((current) => ({ ...current, winnerVisible: false }));
  }, []);

  const showMachine = useCallback(async () => {
    const next = await openMachineRequest();
    setState(next);
  }, []);

  const hideMachine = useCallback(async () => {
    await closeMachineRequest();
    setState(emptyState);
  }, []);

  const markLive = useCallback((next: SlotState) => setState(next), []);

  const value = useMemo<SlotLiveValue>(
    () => ({ state, refresh, showMachine, hideWinner, hideMachine, markLive }),
    [state, refresh, showMachine, hideWinner, hideMachine, markLive]
  );

  return <SlotLiveContext.Provider value={value}>{children}</SlotLiveContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSlotLive = (): SlotLiveValue => {
  const context = useContext(SlotLiveContext);
  if (!context) throw new Error("useSlotLive debe usarse dentro de SlotLiveProvider");
  return context;
};
