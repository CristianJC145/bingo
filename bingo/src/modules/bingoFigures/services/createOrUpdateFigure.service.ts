import { CreateOrUpdateBaseService } from "../../../shared/services/createOrUpdateBase.service";
import { services } from "../../../shared/constant/services";

interface FigureDto {
    id?: Number,
    name: String,
    pattern: Boolean[][];
}

export class CreateOrUpdateFigureService extends CreateOrUpdateBaseService<FigureDto> {
    url= `${services.figures}/figure`;
    isFormData = true;
}