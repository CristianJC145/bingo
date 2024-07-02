import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

export class GetAllFiguresService {
    async run() {
        const response = await configureApi().get(`${services.figures}`);
        const figures = response.data.data;
        return {
            data: figures.map((figure: any) => ({
                ...figure,
                pattern: JSON.parse(figure.pattern)
            })),
            total: response.data.total,
            perPage: response.data.perPage
        };
    }
}
