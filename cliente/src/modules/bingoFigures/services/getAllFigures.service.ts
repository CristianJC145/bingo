import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

interface FigureResponse { id: number; name: string; pattern: string; }

export class GetAllFiguresService {
  async run() {
    const response = await configureApi().get(`${services.figures}`);
    const figures = response.data.data as FigureResponse[];
    return {
      data: figures.map((figure) => ({ ...figure, pattern: JSON.parse(figure.pattern) as boolean[][] })),
      total: response.data.total as number,
      perPage: response.data.perPage as number,
    };
  }
}
