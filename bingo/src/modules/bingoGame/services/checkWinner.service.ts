import configureApi from "../../../shared/utils/axios";
import { services } from "../../../shared/constant/services";
import { CheckWinnerRequest } from "../dtos/checkWinnerDto";

export class CheckWinnerService {
    async run(data: CheckWinnerRequest) {
        const response =await configureApi().post(`${services.game}/checkWinner`, data);
        return response.data;
    }
}