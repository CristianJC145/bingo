// server/src/routes/bingoRoutes.ts
import { Router } from 'express';
import { getFigures, deleteFigure, updateFigure, addFigure } from '../controllers/bingoFigureController';

const bingoFigureRouter = Router();

const basePathApi = '/api/figures';

bingoFigureRouter.get(`${basePathApi}/`, getFigures);
bingoFigureRouter.post(`${basePathApi}/`, addFigure);
bingoFigureRouter.put(`${basePathApi}/:id`, updateFigure);
bingoFigureRouter.delete(`${basePathApi}/:id`, deleteFigure);

export default bingoFigureRouter;