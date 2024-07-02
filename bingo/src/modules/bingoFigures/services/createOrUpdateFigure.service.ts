import { CreateOrUpdateBaseService } from "../../../shared/services/createOrUpdateBase.service";
import { services } from "../../../shared/constant/services";

interface FigureDto {
    id?: number,
    name: string,
    pattern: boolean[][];
}

export class CreateOrUpdateFigureService extends CreateOrUpdateBaseService<FigureDto> {
    url= `${services.figures}/figure/`;
    isFormData = false;
}