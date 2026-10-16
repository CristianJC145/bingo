// server/src/routes/bingoRoutes.ts
import express from 'express';
import {
  saveBingoCard,
  getBingoCards,
  getLastBingoCardId,
  setLastBingoCardId,
  listBingoCards,
  getBingoCardsByRange,
  getBingoCardById,
  updateBingoCard,
  deleteBingoCard,
  bulkImportBingoCards,
} from '../controllers/bingoController';

const router = express.Router();

const basePathApi = '/api/cards';

router.post(`${basePathApi}/saveBingoCard`, saveBingoCard);
router.get(`${basePathApi}/getBingoCards`, getBingoCards);
router.get(`${basePathApi}/getLastBingoCardId`, getLastBingoCardId);
router.post(`${basePathApi}/setLastBingoCardId`, setLastBingoCardId);

router.get(`${basePathApi}/list`, listBingoCards);
router.get(`${basePathApi}/range`, getBingoCardsByRange);
router.get(`${basePathApi}/:id`, getBingoCardById);
router.put(`${basePathApi}/:id`, updateBingoCard);
router.delete(`${basePathApi}/:id`, deleteBingoCard);
router.post(`${basePathApi}/bulk-import`, bulkImportBingoCards);

export default router;
