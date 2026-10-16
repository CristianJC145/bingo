import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

export class UpdateBingoCardService {
  async run(id: number, card: number[][]): Promise<void> {
    await configureApi().put(`${services.cards}/${id}`, { card });
  }
}
