import { Router } from 'express';
import { checkWinner, resetGame, updateFigure } from '../controllers/bingoGameController';

const bingoGameRouter = Router();

const basePathApi = '/api/game';

bingoGameRouter.post(`${basePathApi}/checkWinner`, checkWinner);
bingoGameRouter.post(`${basePathApi}/reset-game`, resetGame);
bingoGameRouter.post(`${basePathApi}/update-figure`, updateFigure);

export default bingoGameRouter;