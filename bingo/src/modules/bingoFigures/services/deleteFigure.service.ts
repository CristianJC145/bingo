import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";


export class DeleteFigureService {
    async run(id: number): Promise<void> {
        await configureApi().delete(`${services.figures}/${id}`);
    }
}