import axios from 'axios';

const API_URL = 'http://localhost:3000/api/figures';

export const getFigures = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

export const addFigure = async (figure: { name: string, pattern: boolean[][] }) => {
    const response = await axios.post(API_URL, figure);
    return response.data;
};

export const updateFigure = async (id: number, figure: { name: string, pattern: boolean[][] }) => {
    const response = await axios.put(`${API_URL}/${id}`, figure);
    return response.data;
};

export const deleteFigure = async (id: number) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};
