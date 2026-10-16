import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";

export interface Breakdown { value: string; total: number; }

export interface DashboardData {
  totals: {
    inventory: number;
    assigned: number;
    registered: number;
    available: number;
    activeRegistrars: number;
  };
  byMunicipio: Breakdown[];
  bySector: Breakdown[];
  byGenero: Breakdown[];
  byDiscapacidad: Breakdown[];
  byDesplazado: Breakdown[];
  byUser: { id: number; fullName: string; username: string; assigned: number; registered: number }[];
}

export const fetchDashboard = async (): Promise<DashboardData> =>
  (await configureApi().get(`${services.api_url}/api/dashboard`)).data.data;
