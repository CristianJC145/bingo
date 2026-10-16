import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

export interface RangeQuery { start?: number; end?: number; specific?: number[]; }
export interface RangeCard { id: number; card: number[][]; }

export class GetBingoCardsByRangeService {
  async run(range: RangeQuery): Promise<RangeCard[]> {
    const params = range.specific?.length
      ? { specific: range.specific.join(",") }
      : { start: range.start, end: range.end };
    const response = await configureApi().get(`${services.cards}/range`, { params });
    return (response.data as { id: number; card: string }[]).map((item) => ({ id: item.id, card: JSON.parse(item.card) as number[][] }));
  }
}
