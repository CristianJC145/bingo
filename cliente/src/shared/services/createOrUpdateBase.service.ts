import configureApi from "../utils/axios";
import { JsonToFormDataService } from "./jsonToFormData.service";

export class CreateOrUpdateBaseService<T extends object> {
  url = "";
  async run({ data, id, isFormData }: { data: T; id?: number; isFormData?: boolean }): Promise<void> {
    const requestData: T | FormData = isFormData ? await JsonToFormDataService(data as unknown as Record<string, unknown>) : data;
    if (id !== null && id !== undefined) await this.update(requestData, id);
    else await this.create(requestData);
  }
  private async create(data: T | FormData): Promise<void> { await configureApi().post(this.url, data); }
  private async update(data: T | FormData, id: number): Promise<void> { await configureApi().put(`${this.url}/${id}`, data); }
}
