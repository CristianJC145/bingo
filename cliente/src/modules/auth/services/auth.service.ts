import axios from "axios";
import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export type UserRole = "admin" | "registrador";

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface CatalogOption { value: string; label: string; }

export interface Catalogs {
  municipios: CatalogOption[];
  tiposIdentificacion: CatalogOption[];
  generos: CatalogOption[];
  sectores: CatalogOption[];
  siNo: CatalogOption[];
  tiposDiscapacidad: CatalogOption[];
}

const baseUrl = services.api_url;

export const login = async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
  const response = await axios.post(`${baseUrl}/api/auth/login`, { username, password });
  return response.data;
};

export const fetchProfile = async (): Promise<AuthUser> => {
  const response = await configureApi().get(`${baseUrl}/api/auth/me`);
  return response.data.user;
};

export const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  await configureApi().put(`${baseUrl}/api/auth/password`, { currentPassword, newPassword });
};

export const fetchCatalogs = async (): Promise<Catalogs> => {
  const response = await configureApi().get(`${baseUrl}/api/catalogs`);
  return response.data.data;
};
