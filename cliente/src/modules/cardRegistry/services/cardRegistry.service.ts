import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export type RegistrationStatus = "registered" | "available";

export interface RegistrationForm {
  municipio: string;
  nombreCompleto: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  genero: string;
  fechaNacimiento: string;
  desplazado: string;
  contacto: string;
  sector: string;
  nombreResidencia: string;
  discapacidad: string;
  tipoDiscapacidad: string | null;
  cuidador: string;
  adultoMayor: string;
}

export interface RegistrationRow extends Partial<RegistrationForm> {
  cardNumber: number;
  status: RegistrationStatus;
  assignedMunicipio?: string | null;
  registeredBy?: number | null;
  registeredByName?: string | null;
  updatedAt?: string;
}

export interface RegistrationSummary { total: number; registered: number; available: number; }

export interface RegistrationListResult {
  data: RegistrationRow[];
  total: number;
  perPage: number;
  summary: RegistrationSummary;
}

const baseUrl = `${services.api_url}/api/registrations`;

export const listRegistrations = async (params: {
  status: "all" | "registered" | "available";
  search?: string;
  page: number;
  perPage: number;
}): Promise<RegistrationListResult> => (await configureApi().get(baseUrl, { params })).data;

export const saveRegistration = async (cardNumber: number, payload: RegistrationForm): Promise<RegistrationRow> =>
  (await configureApi().put(`${baseUrl}/${cardNumber}`, payload)).data.data;

export const deleteRegistration = async (cardNumber: number): Promise<void> => {
  await configureApi().delete(`${baseUrl}/${cardNumber}`);
};
