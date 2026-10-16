import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export interface SlotResult {
  municipio: string;
  municipioLabel: string;
  cardNumber: number;
  nombreCompleto: string;
  sector: string;
  /* Mismos datos que acompañan al ganador del bingo, para etiquetas idénticas. */
  barrio: string | null;
  discapacidad: boolean;
  cuidador: boolean;
  adultoMayor: boolean;
  /** Cuadrícula del cartón por columnas B-I-N-G-O; null si no está en el inventario. */
  card: number[][] | null;
  spunAt: number;
}

export interface SlotMunicipio { value: string; label: string; total: number; }

/** Estado global de la máquina en la transmisión. */
export interface SlotState { active: boolean; winnerVisible: boolean; result: SlotResult | null; }

const baseUrl = `${services.api_url}/api/slot-machine`;

export const getSlotState = async (): Promise<SlotState> =>
  (await configureApi().get(`${baseUrl}/state`)).data.data;

export const listSlotMunicipios = async (): Promise<SlotMunicipio[]> =>
  (await configureApi().get(`${baseUrl}/municipios`)).data.data;

export const openSlotMachine = async (): Promise<SlotState> =>
  (await configureApi().post(`${baseUrl}/open`, {})).data.data;

export const spinSlotMachine = async (municipio?: string): Promise<SlotResult> =>
  (await configureApi().post(`${baseUrl}/spin`, municipio ? { municipio } : {})).data.data;

export const closeSlotWinner = async (): Promise<void> => {
  await configureApi().post(`${baseUrl}/close-winner`, {});
};

export const closeSlotMachine = async (): Promise<void> => {
  await configureApi().post(`${baseUrl}/close`, {});
};
