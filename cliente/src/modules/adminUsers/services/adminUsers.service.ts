import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";
import { UserRole } from "../../auth/services/auth.service";

export interface ManagedUser {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  assignedCards: number;
  registeredCards: number;
}

export interface CardAssignment {
  id: number;
  userId: number;
  userFullName: string;
  username: string;
  startCard: number;
  endCard: number;
  municipio: string | null;
  municipioLabel: string | null;
  totalCards: number;
  registeredCards: number;
  createdAt: string;
}

const usersUrl = `${services.api_url}/api/users`;
const assignmentsUrl = `${services.api_url}/api/assignments`;

export const listUsers = async (): Promise<ManagedUser[]> => (await configureApi().get(usersUrl)).data.data;

export const createUser = async (payload: { username: string; fullName: string; password: string; role: UserRole }): Promise<ManagedUser> =>
  (await configureApi().post(usersUrl, payload)).data.data;

export const updateUser = async (id: number, payload: { fullName?: string; password?: string; active?: boolean }): Promise<void> => {
  await configureApi().put(`${usersUrl}/${id}`, payload);
};

export const deleteUser = async (id: number): Promise<void> => {
  await configureApi().delete(`${usersUrl}/${id}`);
};

export const listAssignments = async (): Promise<CardAssignment[]> => (await configureApi().get(assignmentsUrl)).data.data;

export const createAssignment = async (payload: { userId: number; startCard: number; endCard: number; municipio: string }): Promise<CardAssignment> =>
  (await configureApi().post(assignmentsUrl, payload)).data.data;

export const updateAssignmentMunicipality = async (id: number, municipio: string): Promise<void> => {
  await configureApi().put(`${assignmentsUrl}/${id}/municipio`, { municipio });
};

export const clearAssignmentRegistrations = async (id: number): Promise<number> =>
  (await configureApi().delete(`${assignmentsUrl}/${id}/registrations`)).data.data.deleted;

export const deleteAssignment = async (id: number): Promise<void> => {
  await configureApi().delete(`${assignmentsUrl}/${id}`);
};
