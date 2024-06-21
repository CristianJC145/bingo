import { services } from "../../../shared/constant/services";
import configureApi from "../../../shared/utils/axios";

export class GetAllFiguresService {
    run() {
        return configureApi().get(`${services.figures}`)
        .then(response => response.data);
    }
}