import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export type AssignedCardStatus = "registered" | "available";

export interface AssignedCard {
  cardNumber: number;
  assignedToId: number | null;
  assignedToName: string | null;
  blockStart: number | null;
  blockEnd: number | null;
  status: AssignedCardStatus;
  municipio: string | null;
  assignedMunicipio: string | null;
  municipioLabel: string | null;
  nombreCompleto: string | null;
  tipoIdentificacion: string | null;
  numeroIdentificacion: string | null;
  genero: string | null;
  fechaNacimiento: string | null;
  desplazado: string | null;
  contacto: string | null;
  sector: string | null;
  nombreResidencia: string | null;
  discapacidad: string | null;
  tipoDiscapacidad: string | null;
  tipoDiscapacidadLabel: string | null;
  cuidador: string | null;
  adultoMayor: string | null;
  registeredByName: string | null;
  updatedAt: string | null;
}

export interface AssignedCardsQuery {
  status?: "all" | AssignedCardStatus;
  search?: string;
  userId?: number;
  municipio?: string;
  page?: number;
  perPage?: number;
}

export interface AssignedCardsResult {
  data: AssignedCard[];
  total: number;
  page: number;
  perPage: number;
  summary: { total: number; registered: number; available: number; globalRegistered: number };
}

const endpoint = `${services.api_url}/api/assigned-cards`;

export const listAssignedCards = async (query: AssignedCardsQuery): Promise<AssignedCardsResult> => {
  const params: Record<string, string | number> = {};
  if (query.status && query.status !== "all") params.status = query.status;
  if (query.search) params.search = query.search;
  if (query.userId) params.userId = query.userId;
  if (query.municipio) params.municipio = query.municipio;
  if (query.page) params.page = query.page;
  if (query.perPage) params.perPage = query.perPage;
  return (await configureApi().get(endpoint, { params })).data;
};

export const clearAllAssignedCardRegistrations = async (): Promise<number> => {
  const response = await configureApi().delete(`${endpoint}/registrations`);
  return Number(response.data?.data?.deleted ?? 0);
};
