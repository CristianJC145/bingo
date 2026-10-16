import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

interface ImportCard { id: number; card: number[][]; }
interface ImportResult { total: number; inserted: number; skipped: number; }

export class BulkImportBingoCardsService {
  async run(cards: ImportCard[]): Promise<ImportResult> {
    const response = await configureApi().post(`${services.cards}/bulk-import`, { cards });
    return response.data;
  }
}
