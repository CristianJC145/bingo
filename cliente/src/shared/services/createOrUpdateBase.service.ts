import configureApi from '../utils/axios'
import { JsonToFormDataService } from './jsonToFormData.service';

export class CreateOrUpdateBaseService<T extends Record<string, any>> {
  url = '';

  async run({data, id, isFormData} : {
    data: T,
    id?: number,
    isFormData?: boolean,
  }): Promise<void> {
    let newData: any = data;

    if (isFormData) {      
      newData = await JsonToFormDataService(data as Record<string, any>); // Inst
    }

    if (id !== null && id !== undefined) {
      await this.update(newData, id);
    } else {
      await this.create(newData);
    }
  }

    private async create(data: any): Promise<void> {
        await configureApi().post(this.url, data);
    }

    private async update(data: any, id: number): Promise<void> {
        await configureApi().put(this.url + '/' + id, data);
    }   

}
