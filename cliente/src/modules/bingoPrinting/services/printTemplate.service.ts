import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";
import { PrintTemplate, TemplateConfig } from "../types/printTemplate.types";

const BASE_URL = `${services.api_url}/api/print-template`;

export class GetPrintTemplateService {
  async run(): Promise<PrintTemplate | null> {
    const response = await configureApi().get(BASE_URL);
    return response.data.data ?? null;
  }
}

export class UploadPrintTemplateService {
  async run(file: File, width: number, height: number): Promise<PrintTemplate> {
    const response = await configureApi().post(BASE_URL, file, {
      headers: { "Content-Type": file.type },
      params: { width, height },
    });
    return response.data.data;
  }
}

export class SavePrintTemplateConfigService {
  async run(config: TemplateConfig): Promise<PrintTemplate> {
    const response = await configureApi().put(`${BASE_URL}/config`, config);
    return response.data.data;
  }
}

export class DeletePrintTemplateService {
  async run(): Promise<void> {
    await configureApi().delete(BASE_URL);
  }
}
