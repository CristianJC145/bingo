import { Router } from 'express';
import { checkWinner } from '../controllers/bingoGameController';

const bingoGameRouter = Router();

const basePathApi = '/api/game';

bingoGameRouter.post(`${basePathApi}/checkWinner`, checkWinner);

export default bingoGameRouter;