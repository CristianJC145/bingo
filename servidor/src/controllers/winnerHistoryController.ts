import { Request, Response } from 'express';
import { listWinnerHistory } from '../services/winnerHistoryStore';

export const getWinnerHistory = async (request: Request, response: Response) => {
  const method = String(request.query.method ?? 'ALL').toUpperCase();
  const search = String(request.query.search ?? '').trim();
  const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(request.query.dateFrom ?? '')) ? String(request.query.dateFrom) : undefined;
  const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(request.query.dateTo ?? '')) ? String(request.query.dateTo) : undefined;
  const page = Math.max(1, Number(request.query.page) || 1);
  const perPage = Math.min(20000, Math.max(1, Number(request.query.perPage) || 20));
  try {
    response.json(await listWinnerHistory({ method, search, dateFrom, dateTo, page, perPage }));
  } catch (error) {
    console.error('Error cargando el historial de ganadores:', error);
    response.status(500).json({ message: 'No fue posible cargar el historial de ganadores.' });
  }
};
