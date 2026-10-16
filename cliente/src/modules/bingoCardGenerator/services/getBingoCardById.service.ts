import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

export class GetBingoCardByIdService {
  async run(id: number): Promise<{ id: number; card: number[][] }> {
    const response = await configureApi().get(`${services.cards}/${id}`);
    return { id: response.data.id, card: JSON.parse(response.data.card) as number[][] };
  }
}
