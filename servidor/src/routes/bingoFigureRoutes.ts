// server/src/routes/bingoRoutes.ts
import { Router } from 'express';
import { getFigures, deleteFigure, createOrUpdateFigure  } from '../controllers/bingoFigureController';

const bingoFigureRouter = Router();

const basePathApi = '/api/figures';

bingoFigureRouter.get(`${basePathApi}/`, getFigures);

bingoFigureRouter.post(`${basePathApi}/figure`, createOrUpdateFigure);

bingoFigureRouter.put(`${basePathApi}/figure/:id`, createOrUpdateFigure);

bingoFigureRouter.delete(`${basePathApi}/:id`, deleteFigure);

export default bingoFigureRouter;