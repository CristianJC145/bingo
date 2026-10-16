import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export type WinnerMethod = "BINGO" | "RULETA" | "MAQUINA_SUERTE";

export interface WinnerHistoryItem {
  id: number;
  cardNumber: number;
  method: WinnerMethod;
  rouletteCandidates: number;
  figureId: number | null;
  figureName: string | null;
  figurePattern: boolean[][];
  winningBalls: number[];
  gameStartedAt: number | null;
  nombreCompleto: string | null;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  genero: string | null;
  fechaNacimiento: string | null;
  desplazado: string | null;
  contacto: string | null;
  municipio: string | null;
  municipioLabel: string | null;
  sector: string | null;
  nombreResidencia: string | null;
  discapacidad: string | null;
  tipoDiscapacidad: string | null;
  tipoDiscapacidadLabel: string | null;
  cuidador: string | null;
  adultoMayor: string | null;
  registeredByName: string | null;
  wonAt: string;
}

export interface WinnerHistoryResult {
  data: WinnerHistoryItem[];
  total: number;
  page: number;
  perPage: number;
  summary: { total: number; bingoAwards: number; bingo: number; roulette: number; slotMachine: number; withRegistration: number };
  dailySummary: Array<{ day: string; total: number; bingoAwards: number; bingo: number; roulette: number; slotMachine: number }>;
}

export const listWinnerHistory = async (query: { method?: "ALL" | WinnerMethod; search?: string; dateFrom?: string; dateTo?: string; page?: number; perPage?: number }): Promise<WinnerHistoryResult> =>
  (await configureApi().get(`${services.api_url}/api/game/winner-history`, { params: query })).data;
