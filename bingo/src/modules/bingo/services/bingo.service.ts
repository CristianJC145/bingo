import configureApi from '../../../shared/utils/axios'
import { services } from '../../../shared/constant/services'


import axios from 'axios';


export class GetBingoCardsService {
    run() {
        return configureApi().get(`${services.cards}/getBingoCards`)
        .then(response => response.data)
    }
}

const API_URL = 'http://localhost:3000/api/cards';

export const saveBingoCard = async (card: number[][]) => {
  const response = await axios.post(`${API_URL}/saveBingoCard`, { card });
  return response.data;
};

export const getBingoCards = async () => {
  const response = await axios.get(`${API_URL}/getBingoCards`);
  return response.data;
};

export const getLastBingoCardId = async () => {
  const response = await axios.get(`${API_URL}/getLastBingoCardId`);
  return response.data;
};

export const setLastBingoCardId = async (lastId: number) => {
  const response = await axios.post(`${API_URL}/setLastBingoCardId`, { lastId });
  return response.data;
};
