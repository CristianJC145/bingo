// server/src/routes/bingoRoutes.ts
import express from 'express';
import { saveBingoCard, getBingoCards, getLastBingoCardId, setLastBingoCardId } from '../controllers/bingoController';

const router = express.Router();

const basePathApi = '/api/cards';

router.post(`${basePathApi}/saveBingoCard`, saveBingoCard);
router.get(`${basePathApi}/getBingoCards`, getBingoCards);
router.get(`${basePathApi}/getLastBingoCardId`, getLastBingoCardId);
router.post(`${basePathApi}/setLastBingoCardId`, setLastBingoCardId);

export default router;
