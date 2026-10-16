import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

interface BingoCardResponse { id: number; card: string; }

export class ListBingoCardsService {
  async run(params?: Record<string, unknown>) {
    const response = await configureApi().get(`${services.cards}/list`, { params });
    const cards = response.data.data as BingoCardResponse[];
    return {
      data: cards.map((card) => ({ ...card, card: JSON.parse(card.card) as number[][] })),
      total: response.data.total as number,
      perPage: response.data.perPage as number,
    };
  }
}
