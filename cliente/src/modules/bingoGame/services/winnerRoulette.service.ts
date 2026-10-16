import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export type RoulettePhase = "idle" | "ready" | "spinning" | "resolved";

export interface RouletteCandidate {
  cardNumber: number;
  nombreCompleto: string | null;
  municipioLabel: string | null;
}

export interface WinnerRouletteState {
  active: boolean;
  phase: RoulettePhase;
  candidates: RouletteCandidate[];
  /** Puesto ganador dentro de `candidates`; lo decide el servidor. */
  winnerIndex: number | null;
  spunAt: number | null;
  spinDurationMs?: number;
}

const endpoint = `${services.api_url}/api/game/winner-roulette`;

export const getWinnerRoulette = async (): Promise<WinnerRouletteState> =>
  (await configureApi().get(endpoint)).data.data;

export const spinWinnerRoulette = async (): Promise<WinnerRouletteState> =>
  (await configureApi().post(`${endpoint}/spin`)).data.data;

/** OBS reproduce el anuncio del empate solo cuando terminó el canto de la balota. */
export const announceWinnerRoulette = async (): Promise<void> => {
  await configureApi().post(`${endpoint}/announce`);
};

export const confirmWinnerRoulette = async (): Promise<{ cardNumber: number; nombreCompleto: string | null }> =>
  (await configureApi().post(`${endpoint}/confirm`)).data.data;

export const cancelWinnerRoulette = async (): Promise<void> => {
  await configureApi().post(`${endpoint}/cancel`);
};
