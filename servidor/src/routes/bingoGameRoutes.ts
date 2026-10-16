import { Router } from 'express';
import { freeBalls, freeReset, announceWinnerRoulette, checkWinner, resetGame, updateFigure, showcaseFigureHandler, getGameSession, saveGameSessionHandler, getWinnerOverlayState, setWinnerOverlayState, getGameSettingsHandler, saveGameSettingsHandler, getWinnerRouletteState, spinWinnerRoulette, confirmWinnerRoulette, cancelWinnerRoulette } from '../controllers/bingoGameController';
import { getWinnerHistory } from '../controllers/winnerHistoryController';
import { requireAdmin, requireAuth } from '../middleware/auth';

const bingoGameRouter = Router();

const basePathApi = '/api/game';

bingoGameRouter.post(`${basePathApi}/checkWinner`, checkWinner);
bingoGameRouter.post(`${basePathApi}/reset-game`, resetGame);
bingoGameRouter.post(`${basePathApi}/free/balls`, freeBalls);
bingoGameRouter.post(`${basePathApi}/free/reset`, freeReset);
bingoGameRouter.post(`${basePathApi}/update-figure`, updateFigure);
bingoGameRouter.post(`${basePathApi}/showcase-figure`, showcaseFigureHandler);
// Pública: el overlay de OBS no está autenticado y necesita conocer el límite.
bingoGameRouter.get(`${basePathApi}/settings`, getGameSettingsHandler);
bingoGameRouter.put(`${basePathApi}/settings`, saveGameSettingsHandler);
bingoGameRouter.get(`${basePathApi}/winner-overlay`, getWinnerOverlayState);
bingoGameRouter.post(`${basePathApi}/winner-overlay`, setWinnerOverlayState);
// Pública en lectura: el overlay de OBS no está autenticado y debe poder reconectar.
bingoGameRouter.get(`${basePathApi}/winner-roulette`, getWinnerRouletteState);
bingoGameRouter.post(`${basePathApi}/winner-roulette/announce`, announceWinnerRoulette);
bingoGameRouter.post(`${basePathApi}/winner-roulette/spin`, spinWinnerRoulette);
bingoGameRouter.post(`${basePathApi}/winner-roulette/confirm`, confirmWinnerRoulette);
bingoGameRouter.post(`${basePathApi}/winner-roulette/cancel`, cancelWinnerRoulette);
bingoGameRouter.get(`${basePathApi}/winner-history`, requireAuth, requireAdmin, getWinnerHistory);
bingoGameRouter.get(`${basePathApi}/session`, getGameSession);
bingoGameRouter.post(`${basePathApi}/session`, saveGameSessionHandler);

export default bingoGameRouter;
