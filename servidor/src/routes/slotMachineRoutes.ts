import { Router } from 'express';
import { closeSlotMachine, closeSlotWinner, getSlotMunicipios, getSlotStateHandler, openSlotMachine, spinSlotMachine } from '../controllers/slotMachineController';
import { requireAdmin, requireAuth } from '../middleware/auth';

const slotMachineRouter = Router();

slotMachineRouter.get('/api/slot-machine/state', requireAuth, requireAdmin, getSlotStateHandler);
slotMachineRouter.get('/api/slot-machine/municipios', requireAuth, requireAdmin, getSlotMunicipios);
slotMachineRouter.post('/api/slot-machine/open', requireAuth, requireAdmin, openSlotMachine);
slotMachineRouter.post('/api/slot-machine/spin', requireAuth, requireAdmin, spinSlotMachine);
slotMachineRouter.post('/api/slot-machine/close-winner', requireAuth, requireAdmin, closeSlotWinner);
slotMachineRouter.post('/api/slot-machine/close', requireAuth, requireAdmin, closeSlotMachine);

export default slotMachineRouter;
